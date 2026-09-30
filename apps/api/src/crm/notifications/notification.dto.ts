import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { WhatsAppDispatchStatus, WhatsAppProviderMode } from '@prisma/client';

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  globalFcmEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  globalWhatsAppEnabled?: boolean;

  @IsOptional()
  @IsObject()
  eventSettings?: Record<
    string,
    { fcmEnabled?: boolean; whatsappEnabled?: boolean }
  >;
}

export class UpdateWhatsAppConfigDto {
  @IsOptional()
  @IsEnum(WhatsAppProviderMode)
  providerMode?: WhatsAppProviderMode;

  @IsOptional()
  @IsString()
  @MinLength(8)
  customApiKey?: string;

  @IsOptional()
  @IsBoolean()
  removeCustomApiKey?: boolean;

  @IsOptional()
  @IsString()
  customApiUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: 'customSenderNumber must contain 10 to 15 digits',
  })
  customSenderNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2,3}(?:_[A-Z]{2})?$/, {
    message: 'customTemplateLanguage must be a valid language code',
  })
  customTemplateLanguage?: string;
}

export class WhatsAppDeliveriesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsEnum(WhatsAppDispatchStatus)
  status?: WhatsAppDispatchStatus;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  event?: string;
}
