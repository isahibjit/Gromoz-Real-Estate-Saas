import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { WorkspaceListQuery } from './workspace.dto';

export class InvoiceSettingsDto {
  @IsString() @MinLength(2) @MaxLength(160) businessName!: string;
  @IsString() @MinLength(5) @MaxLength(1000) address!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsOptional() @IsString() @MaxLength(40) phone = '';
}
export class EnableInvoicesDto {
  @IsBoolean() enabled!: boolean;
}
export class InvoicesQuery extends WorkspaceListQuery {
  @IsOptional() @IsIn(['TEST', 'LIVE']) mode?: 'TEST' | 'LIVE';
  @IsOptional() @IsIn(['ISSUED', 'OVERDUE', 'PAID', 'VOID']) status?: string;
  @IsOptional()
  @IsIn(['SETUP_FEE', 'RECURRING_SEATS', 'SEAT_UPGRADE'])
  type?: string;
}
export class ConfirmBackfillDto {
  @IsString() @MinLength(10) @MaxLength(100) previewToken!: string;
}
