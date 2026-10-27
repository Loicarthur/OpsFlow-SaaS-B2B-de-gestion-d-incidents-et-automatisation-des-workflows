import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrgRole } from '@opsflow/shared';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: OrgRole })
  @IsEnum(OrgRole)
  role!: OrgRole;
}
