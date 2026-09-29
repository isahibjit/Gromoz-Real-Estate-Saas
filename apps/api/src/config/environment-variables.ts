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
  FOLLOW_UP_REMINDER_INTERVAL_MS: Joi.number().integer().positive().default(30000),
  REALTIME_ALLOWED_ORIGINS: Joi.string().allow('').optional(),
  REALTIME_OUTBOX_INTERVAL_MS: Joi.number().integer().min(500).default(1000),
  SMS_PROVIDER_URL: Joi.string().uri().allow('').optional(),
  SMS_USERNAME: Joi.string().allow('').optional(),
  SMS_API_KEY: Joi.string().allow('').optional(),
  SMS_ROUTE: Joi.string().allow('').optional(),
  SMS_SENDER: Joi.string().allow('').optional(),
  LOGIN_NOTIFICATION_EMAIL: Joi.string().email().allow('').optional(),
  MOBILE_APP_UPLOAD_TMP_DIR: Joi.string().allow('').optional(),
});
