import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@opsflow/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { OrganizationsService } from './organizations.service.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';

@ApiTags('organizations')
@Controller()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('organizations/members')
  listMembers(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.listMembers(user.organizationId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MEMBER_INVITE)
  @Post('organizations/invitations')
  invite(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteMemberDto) {
    return this.organizationsService.invite(user.organizationId, user.userId, dto);
  }

  @Post('invitations/accept')
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.organizationsService.acceptInvitation(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MEMBER_ROLE_CHANGE)
  @Patch('organizations/members/:membershipId/role')
  updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.organizationsService.updateMemberRole(user.organizationId, user.userId, membershipId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MEMBER_REMOVE)
  @Delete('organizations/members/:membershipId')
  removeMember(@CurrentUser() user: AuthenticatedUser, @Param('membershipId') membershipId: string) {
    return this.organizationsService.removeMember(user.organizationId, user.userId, membershipId);
  }
}
