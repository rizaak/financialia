import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? true,
    credentials: true,
  });
  const rawPort = process.env.PORT ?? process.env.API_PORT ?? '3000';
  const port = parseInt(rawPort, 10);
  const listenPort = Number.isFinite(port) && port > 0 ? port : 3000;
  const logger = new Logger('Bootstrap');
  logger.log(
    `PORT=${process.env.PORT ?? '(unset)'} API_PORT=${process.env.API_PORT ?? '(unset)'} → escuchando en ${listenPort} (0.0.0.0)`,
  );
  // Railway/Docker: escuchar en todas las interfaces; si no, el healthcheck ve "service unavailable".
  await app.listen(listenPort, '0.0.0.0');
}

bootstrap();
