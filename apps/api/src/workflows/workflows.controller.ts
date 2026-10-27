import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@opsflow/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { WorkflowsService } from './workflows.service.js';
import { CreateWorkflowDto } from './dto/create-workflow.dto.js';
import { UpdateWorkflowDto } from './dto/update-workflow.dto.js';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @RequirePermissions(Permission.WORKFLOW_MANAGE)
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.workflowsService.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions(Permission.WORKFLOW_MANAGE)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.workflowsService.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions(Permission.WORKFLOW_MANAGE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWorkflowDto) {
    return this.workflowsService.create(user.organizationId, user.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.WORKFLOW_MANAGE)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    return this.workflowsService.update(user.organizationId, user.userId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.WORKFLOW_MANAGE)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.workflowsService.remove(user.organizationId, id);
  }
}
