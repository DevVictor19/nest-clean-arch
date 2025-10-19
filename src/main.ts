import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app-module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppErrorExceptionFilter } from './core/api/filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AppErrorExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
