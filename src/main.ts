import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = Number(process.env.PORT) || 3000;
  console.log('[BOOT] PORT env =', process.env.PORT, '-> using', port);

  // IMPORTANT: bind to all interfaces for cloud/container
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API listening on http://0.0.0.0:${port}`);
}

bootstrap().catch((e) => {
  console.error('[BOOT] Fatal error:', e);
  process.exit(1);
});