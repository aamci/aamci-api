// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { exec } from 'child_process';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origins = [
  'http://localhost:3000',
  'https://web-doctor-p93i.onrender.com',
  'https://web-patient.onrender.com',   // 👈 ton front Render
];
  app.enableCors({
    origin: (origin, cb) => cb(null, !origin || origins.includes(origin)),
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    credentials: true,
  });
  //app.use(bodyParser.json({ limit: '10mb' }));
  //app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

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