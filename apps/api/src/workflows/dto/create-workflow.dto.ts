import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { WorkflowActionType, WorkflowTriggerType } from '@opsflow/shared';

export class WorkflowActionDto {
  @ApiProperty({ enum: WorkflowActionType })
  @IsEnum(WorkflowActionType)
  type!: WorkflowActionType;

  @ApiProperty({ type: Object })
  config!: Record<string, unknown>;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateWorkflowDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: WorkflowTriggerType })
  @IsEnum(WorkflowTriggerType)
  triggerType!: WorkflowTriggerType;

  @ApiProperty({ type: [Object], required: false })
  @IsOptional()
  @IsArray()
  conditions?: Record<string, unknown>[];

  @ApiProperty({ type: [WorkflowActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowActionDto)
  actions!: WorkflowActionDto[];

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
