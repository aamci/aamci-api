import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { exec } from 'child_process';
async function bootstrap(){
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin:true, credentials:true });
  // Bind to 0.0.0.0 so it's reachable outside the container
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API running on: http://0.0.0.0:${port}`);

  // 🔽 Run Prisma commands asynchronously (after port is open)
  if (process.env.PRISMA_POST_START !== 'false') {
    console.log('⏳ Running Prisma generate in background...');
    exec('npx prisma generate', (err, stdout, stderr) => {
      if (err) {
        console.error('⚠️ Prisma generate failed:', err.message);
      } else {
        console.log('✅ Prisma generate completed');
        if (stdout) console.log(stdout);
      }
      if (stderr) console.error(stderr);
    });

    // Optionally run migrations after generate
    if (process.env.PRISMA_MIGRATIONS === '1') {
      exec('npx prisma migrate deploy', (err, stdout, stderr) => {
        if (err) {
          console.error('⚠️ Prisma migrate failed:', err.message);
        } else {
          console.log('✅ Prisma migrate deploy completed');
          if (stdout) console.log(stdout);
        }
        if (stderr) console.error(stderr);
      });
    }
  }


}
bootstrap();
