import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@opsflow/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { TicketsService } from './tickets.service.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { AssignTicketDto } from './dto/assign-ticket.dto.js';
import { QueryTicketsDto } from './dto/query-tickets.dto.js';

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @RequirePermissions(Permission.TICKET_VIEW)
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryTicketsDto) {
    return this.ticketsService.findAll(user.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.TICKET_VIEW)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ticketsService.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions(Permission.TICKET_CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create(user.organizationId, user.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.TICKET_UPDATE)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.update(user.organizationId, user.userId, id, dto);
  }

  @Post(':id/assign')
  @RequirePermissions(Permission.TICKET_ASSIGN)
  assign(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.ticketsService.assign(user.organizationId, user.userId, id, dto);
  }

  @Post(':id/resolve')
  @RequirePermissions(Permission.TICKET_UPDATE)
  resolve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ticketsService.resolve(user.organizationId, user.userId, id);
  }
}
