# ---- base: deps install
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml package.json ./     
COPY ./package.json ./
COPY ./tsconfig*.json ./
COPY ./nest-cli.json ./    
COPY ./prisma ./prisma
RUN pnpm install --frozen-lockfile

# ---- build
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm -C . prisma generate
RUN pnpm -C . build                  # -> ./dist/main.js

# ---- runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# copy built dist and production node_modules for the app scope
COPY --from=build /app/dist ./dist
COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma

# optional: run migrations on start
# CMD ["sh", "-lc", "node dist/main.js"]
CMD ["node", "dist/main.js"]
EXPOSE 3000