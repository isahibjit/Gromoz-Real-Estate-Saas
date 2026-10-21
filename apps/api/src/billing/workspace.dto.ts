import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsISO8601,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
export class WorkspaceListQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 10;
  @IsOptional() @IsString() @MaxLength(160) search?: string;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
}
export class TransactionsQuery extends WorkspaceListQuery {
  @IsOptional()
  @IsIn(['created', 'captured', 'failed', 'refunded'])
  status?: string;
  @IsOptional()
  @IsIn(['SETUP_FEE', 'RECURRING_SEATS', 'SEAT_UPGRADE'])
  type?: string;
}
export class TicketsQuery extends WorkspaceListQuery {
  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status?: string;
  @IsOptional()
  @IsIn(['GENERAL', 'TECHNICAL', 'BILLING', 'PLAN_CHANGE'])
  category?: string;
  @IsOptional() @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']) priority?: string;
}
export class CreateTicketDto {
  @IsString() @MinLength(3) @MaxLength(160) subject!: string;
  @IsString() @MinLength(10) @MaxLength(5000) description!: string;
  @IsIn(['GENERAL', 'TECHNICAL', 'BILLING', 'PLAN_CHANGE']) category!: string;
  @IsOptional() @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']) priority: string =
    'NORMAL';
  @IsOptional() @IsString() @MaxLength(100) targetPlanCode?: string;
}
export class UpdateTicketStatusDto {
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']) status!: string;
}
