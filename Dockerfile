# ---- base: deps install
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml package.json ./     
COPY apps/api/package.json ./apps/api/
COPY apps/api/tsconfig*.json ./apps/api/
COPY apps/api/nest-cli.json ./apps/api/    
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm install --frozen-lockfile

# ---- build
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm -C apps/api prisma generate
RUN pnpm -C apps/api build                  # -> apps/api/dist/main.js

# ---- runtime
FROM node:20-alpine AS runner
WORKDIR /app/apps/api
ENV NODE_ENV=production
# copy built dist and production node_modules for the app scope
COPY --from=build /app/apps/api/dist ./dist
COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/apps/api/prisma ./prisma

# optional: run migrations on start
# CMD ["sh", "-lc", "node dist/main.js"]
CMD ["node", "dist/main.js"]
EXPOSE 3000