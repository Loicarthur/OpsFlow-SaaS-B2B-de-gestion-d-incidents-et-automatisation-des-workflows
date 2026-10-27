import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { AuditAction, OrgRole } from '@opsflow/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { NOTIFICATIONS_QUEUE, NotificationsJob } from '../queue/queue.constants.js';
import type { InviteMemberDto } from './dto/invite-member.dto.js';
import type { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import type { AcceptInvitationDto } from './dto/accept-invitation.dto.js';

const BCRYPT_ROUNDS = 12;
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly notificationsQueue: Queue,
  ) {}

  listMembers(organizationId: string) {
    return this.prisma.membership.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async invite(organizationId: string, invitedById: string, dto: InviteMemberDto) {
    const existingMember = await this.prisma.membership.findFirst({
      where: { organizationId, user: { email: dto.email } },
    });
    if (existingMember) {
      throw new ConflictException('This user is already a member of the organization');
    }

    const rawToken = randomBytes(32).toString('hex');
    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        role: dto.role,
        organizationId,
        invitedById,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
    });

    await this.notificationsQueue.add(NotificationsJob.SEND_EMAIL, {
      to: dto.email,
      subject: "You've been invited to join an OpsFlow organization",
      html: `<p>You've been invited with role <b>${dto.role}</b>. Use invitation token: <code>${rawToken}</code> to accept.</p>`,
    });

    await this.auditLogService.record({
      organizationId,
      userId: invitedById,
      action: AuditAction.MEMBER_INVITED,
      resourceType: 'Invitation',
      resourceId: invitation.id,
      newState: { email: dto.email, role: dto.role },
    });

    return { id: invitation.id, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt };
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    const tokenHash = hashToken(dto.token);
    const invitation = await this.prisma.invitation.findUnique({ where: { tokenHash } });

    if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email: invitation.email } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email: invitation.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        });
      }

      await tx.membership.create({
        data: { userId: user.id, organizationId: invitation.organizationId, role: invitation.role },
      });

      await tx.invitation.update({ where: { id: invitation.id }, data: { status: 'ACCEPTED' } });

      return user;
    });

    await this.auditLogService.record({
      organizationId: invitation.organizationId,
      userId: result.id,
      action: AuditAction.MEMBER_ADDED,
      resourceType: 'Membership',
      resourceId: result.id,
      newState: { role: invitation.role },
    });

    return { success: true, userId: result.id };
  }

  async updateMemberRole(
    organizationId: string,
    actingUserId: string,
    membershipId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (membership.userId === actingUserId && dto.role !== OrgRole.OWNER) {
      throw new ForbiddenException('You cannot change your own role');
    }

    const previousRole = membership.role;
    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: { role: dto.role },
    });

    await this.auditLogService.record({
      organizationId,
      userId: actingUserId,
      action: AuditAction.MEMBER_ROLE_CHANGED,
      resourceType: 'Membership',
      resourceId: membershipId,
      previousState: { role: previousRole },
      newState: { role: dto.role },
    });

    return updated;
  }

  async removeMember(organizationId: string, actingUserId: string, membershipId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    if (membership.userId === actingUserId) {
      throw new ForbiddenException('You cannot remove yourself from the organization');
    }

    await this.prisma.membership.delete({ where: { id: membershipId } });

    await this.auditLogService.record({
      organizationId,
      userId: actingUserId,
      action: AuditAction.MEMBER_REMOVED,
      resourceType: 'Membership',
      resourceId: membershipId,
      previousState: { role: membership.role, userId: membership.userId },
    });

    return { success: true };
  }
}
