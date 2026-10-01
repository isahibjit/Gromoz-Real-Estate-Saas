import * as Joi from 'joi';

export interface EnvironmentVariables {
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  FRONTEND_URL?: string;
  PORT?: number;
  THROTTLE_ENABLED?: boolean;
  RATE_LIMIT_TTL_MS: number;
  RATE_LIMIT_LIMIT: number;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  REDIS_DB: number;
  REDIS_KEY_PREFIX: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_S3_PUBLIC_BASE_URL?: string;
  FCM_SERVER_KEY?: string;
  FOLLOW_UP_REMINDER_INTERVAL_MS?: number;
  REALTIME_ALLOWED_ORIGINS?: string;
  REALTIME_OUTBOX_INTERVAL_MS?: number;
  SMS_PROVIDER_URL?: string;
  SMS_USERNAME?: string;
  SMS_API_KEY?: string;
  SMS_ROUTE?: string;
  SMS_SENDER?: string;
  LOGIN_NOTIFICATION_EMAIL?: string;
  MOBILE_APP_UPLOAD_TMP_DIR?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_WEBHOOK_SECRET?: string;
  INTEGRATION_CREDENTIAL_ENCRYPTION_KEY?: string;
  WHATSAPP_PLATFORM_API_URL?: string;
  WHATSAPP_PLATFORM_API_KEY?: string;
  WHATSAPP_PLATFORM_WABA_NUMBER?: string;
  WHATSAPP_PLATFORM_TEMPLATE_LANGUAGE: string;
  WHATSAPP_CREDENTIAL_ENCRYPTION_KEY?: string;
  WHATSAPP_CUSTOM_API_HOST_ALLOWLIST: string;
  WHATSAPP_DISPATCH_INTERVAL_MS: number;
}

export const validationSchemaForEnv = Joi.object<EnvironmentVariables, true>({
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  FRONTEND_URL: Joi.string().uri().allow('').optional(),
  PORT: Joi.number().integer().positive().default(5002),
  THROTTLE_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  RATE_LIMIT_TTL_MS: Joi.number().integer().positive().default(60000),
  RATE_LIMIT_LIMIT: Joi.number().integer().positive().default(120),
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().integer().positive().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().integer().min(0).default(0),
  REDIS_KEY_PREFIX: Joi.string().default('truroot:'),
  AWS_REGION: Joi.string().allow('').optional(),
  AWS_S3_BUCKET: Joi.string().allow('').optional(),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  AWS_S3_PUBLIC_BASE_URL: Joi.string().uri().allow('').optional(),
  FCM_SERVER_KEY: Joi.string().allow('').optional(),
  FOLLOW_UP_REMINDER_INTERVAL_MS: Joi.number()
    .integer()
    .positive()
    .default(30000),
  REALTIME_ALLOWED_ORIGINS: Joi.string().allow('').optional(),
  REALTIME_OUTBOX_INTERVAL_MS: Joi.number().integer().min(500).default(1000),
  SMS_PROVIDER_URL: Joi.string().uri().allow('').optional(),
  SMS_USERNAME: Joi.string().allow('').optional(),
  SMS_API_KEY: Joi.string().allow('').optional(),
  SMS_ROUTE: Joi.string().allow('').optional(),
  SMS_SENDER: Joi.string().allow('').optional(),
  LOGIN_NOTIFICATION_EMAIL: Joi.string().email().allow('').optional(),
  MOBILE_APP_UPLOAD_TMP_DIR: Joi.string().allow('').optional(),
  RAZORPAY_KEY_ID: Joi.string().allow('').optional(),
  RAZORPAY_KEY_SECRET: Joi.string().allow('').optional(),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  INTEGRATION_CREDENTIAL_ENCRYPTION_KEY: Joi.string()
    .pattern(/^(?:[A-Fa-f0-9]{64}|[A-Za-z0-9+/]{43}=)$/)
    .allow('')
    .optional(),
  WHATSAPP_PLATFORM_API_URL: Joi.string()
    .uri({ scheme: ['https'] })
    .allow('')
    .optional(),
  WHATSAPP_PLATFORM_API_KEY: Joi.string().allow('').optional(),
  WHATSAPP_PLATFORM_WABA_NUMBER: Joi.string()
    .pattern(/^\d{10,15}$/)
    .allow('')
    .optional(),
  WHATSAPP_PLATFORM_TEMPLATE_LANGUAGE: Joi.string()
    .pattern(/^[a-z]{2,3}(?:_[A-Z]{2})?$/)
    .default('en'),
  WHATSAPP_CREDENTIAL_ENCRYPTION_KEY: Joi.string()
    .pattern(/^(?:[A-Fa-f0-9]{64}|[A-Za-z0-9+/]{43}=)$/)
    .allow('')
    .optional(),
  WHATSAPP_CUSTOM_API_HOST_ALLOWLIST: Joi.string().default(
    'partnersv1.pinbot.ai',
  ),
  WHATSAPP_DISPATCH_INTERVAL_MS: Joi.number().integer().min(500).default(1000),
});
