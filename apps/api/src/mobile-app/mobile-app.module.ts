import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AccessModule } from '../access/access.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { ApkUploadInterceptor } from './apk-upload.interceptor';
import { MobileAppController, PublicMobileAppController } from './mobile-app.controller';
import { MobileAppService } from './mobile-app.service';
import { MobileAppAdminGuard } from './mobile-app-admin.guard';

@Module({
  imports: [PersistenceModule, AccessModule, ConfigModule, JwtModule.registerAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>('JWT_ACCESS_SECRET') }) })],
  controllers: [MobileAppController, PublicMobileAppController],
  providers: [MobileAppService, ApkUploadInterceptor, MobileAppAdminGuard],
})
export class MobileAppModule {}
