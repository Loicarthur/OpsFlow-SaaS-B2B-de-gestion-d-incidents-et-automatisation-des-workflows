import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import ms from '../common/utils/ms.js';
import { OrgRole } from '@opsflow/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

const BCRYPT_ROUNDS = 12;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'org'
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async issueTokens(user: { id: string; email: string }, organizationId: string, role: OrgRole) {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, organizationId, role },
      {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessTtl') as never,
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const refreshTtl = this.configService.get<string>('jwt.refreshTtl') ?? '7d';
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + ms(refreshTtl)),
      },
    });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const baseSlug = slugify(dto.organizationName);

    const result = await this.prisma.$transaction(async (tx) => {
      let slug = baseSlug;
      let suffix = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const existingOrg = await tx.organization.findUnique({ where: { slug } });
        if (!existingOrg) break;
        slug = `${baseSlug}-${suffix++}`;
      }

      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });

      const organization = await tx.organization.create({
        data: { name: dto.organizationName, slug },
      });

      await tx.membership.create({
        data: { userId: user.id, organizationId: organization.id, role: OrgRole.OWNER },
      });

      return { user, organization };
    });

    const tokens = await this.issueTokens(result.user, result.organization.id, OrgRole.OWNER);
    return {
      ...tokens,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      organization: { id: result.organization.id, name: result.organization.name, slug: result.organization.slug },
      role: OrgRole.OWNER,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { memberships: { include: { organization: true }, take: 1, orderBy: { createdAt: 'asc' } } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException('User has no organization membership');
    }

    const role = membership.role as unknown as OrgRole;
    const tokens = await this.issueTokens(user, membership.organizationId, role);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      organization: { id: membership.organization.id, name: membership.organization.name },
      role,
    };
  }

  async refresh(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { memberships: true } } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const membership = stored.user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException('User has no organization membership');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user, membership.organizationId, membership.role as unknown as OrgRole);
  }

  async logout(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }
}
