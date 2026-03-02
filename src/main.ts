// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { exec } from 'child_process';
import * as bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const origins = [
  'http://localhost:3000',
  'http://localhost:53785',
  'http://localhost:3001',
  'https://web-doctor-p93i.onrender.com',
  'https://web-patient.onrender.com',
];

  app.useWebSocketAdapter(new IoAdapter(app));

  // Enable cookie parser for reading httpOnly cookies
  app.use(cookieParser());

  app.use(
    '/payments/stripe/webhook',
    bodyParser.raw({ type: 'application/json' }),
  );

  const isDev = process.env.NODE_ENV !== 'production';
  app.enableCors({
    origin: (origin, cb) => {
      const isLocalhost = isDev && !!origin && /^http:\/\/localhost:\d+$/.test(origin);
      cb(null, !origin || origins.includes(origin) || isLocalhost);
    },
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    credentials: true, // Required for cookies to work cross-origin
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