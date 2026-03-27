import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
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
  // El header Origin del navegador nunca lleva barra final; si FRONTEND_ORIGIN sí, CORS falla por mismatch.
  const fe = process.env.FRONTEND_ORIGIN?.trim();
  const corsOrigin = fe ? fe.replace(/\/+$/, '') : true;
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
  const rawPort = process.env.PORT ?? process.env.API_PORT ?? '3000';
  const port = parseInt(rawPort, 10);
  const listenPort = Number.isFinite(port) && port > 0 ? port : 3000;
  // Railway/Docker: escuchar en todas las interfaces; si no, el healthcheck ve "service unavailable".
  await app.listen(listenPort, '0.0.0.0');
}

bootstrap();
