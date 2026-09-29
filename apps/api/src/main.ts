import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { RealtimeIoAdapter } from './realtime/realtime-io.adapter';

declare const module: any;

async function bootstrap() {
  const logger = new Logger('EntryPoint');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  app.useWebSocketAdapter(new RealtimeIoAdapter(app, configService));
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(
    express.text({
      type: ['text/plain', 'text/*', 'application/text'],
      limit: '10mb',
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: (reqOrigin, callback) => {
      // Dynamically echo requesting origin to support credentials mode 'include' for any domain
      callback(null, reqOrigin || '*');
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'x-api-key',
      'Accept',
      'X-Requested-With',
      'x-organization-id',
      'X-Organization-Id',
      'x-organization-slug',
      'X-Organization-Slug',
      'x-tenant-id',
      'X-Tenant-Id',
      'Cache-Control',
      'Pragma',
      'Origin',
    ],
    exposedHeaders: ['Content-Disposition', 'x-organization-id', 'X-Organization-Id'],
  });

  const config = new DocumentBuilder()
    .setTitle('Trueroot Realty CRM API')
    .setDescription('Production API documentation and interactive endpoint testing for Trueroot Realty CRM')
    .setVersion('1.0')
    .addServer('/api', 'Production API Proxy (/api)')
    .addServer('/', 'Direct Root Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token (e.g., Bearer <your_jwt_token>)',
        in: 'header',
      },
      'bearer',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API key for portal webhook integrations',
      },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      docExpansion: 'none',
    },
  });

  const PORT = configService.get<number>('PORT') ?? 5002;

  // Let disk-spooled APK uploads complete; the upload interceptor bounds their lifetime.
  app.getHttpServer().requestTimeout = 10 * 60 * 1000;

  await app.listen(PORT);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }

  logger.log(`Server running on http://localhost:${PORT}`);
}

bootstrap();
