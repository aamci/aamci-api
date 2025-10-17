import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap(){
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin:true, credentials:true });
  // Bind to 0.0.0.0 so it's reachable outside the container
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API running on: http://0.0.0.0:${port}`);
}
bootstrap();
