// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { exec } from 'child_process';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origins = [
  'http://localhost:3001',
  'https://web-patient-teal.vercel.app',
  'https://web-patient.onrender.com',   // 👈 ton front Render
];
  app.enableCors({
    origin: (origin, cb) => cb(null, !origin || origins.includes(origin)),
    credentials: true,
  });
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Listening on ${port}`);

  // Post-start (ne bloque pas l’ouverture du port)
  if (process.env.PRISMA_MIGRATIONS === '1') {
    exec('npx prisma migrate deploy', (err, stdout, stderr) => {
      if (err) console.error('prisma migrate failed:', err.message);
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    });
  }
}
bootstrap();