import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';
import { OrgRole } from '@opsflow/shared';

export class InviteMemberDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: OrgRole })
  @IsEnum(OrgRole)
  role!: OrgRole;
}
