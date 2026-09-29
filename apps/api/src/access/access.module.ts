import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { PersistenceModule } from '../persistence/persistence.module';
import { AccessController } from './access.controller';
import { AccessService } from './access.service';
import { PermissionGuard } from './permission.guard';

@Module({
  imports: [
    PersistenceModule,
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [AccessController],
  providers: [AccessService, PermissionGuard],
  exports: [AccessService, PermissionGuard],
})
export class AccessModule {}
