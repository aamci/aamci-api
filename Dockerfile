# # ---------- deps ----------
# FROM node:20-alpine AS deps
# WORKDIR /app
# COPY package*.json ./
# RUN npm install      # 👈 instead of npm ci

# # ---------- build ----------
# FROM node:20-alpine AS build
# WORKDIR /app
# COPY --from=deps /app/node_modules ./node_modules
# COPY . .
# RUN npx prisma generate || echo "No Prisma client"
# RUN npm run build

# # ---------- runtime ----------
# FROM node:20-alpine AS runner
# WORKDIR /app
# ENV NODE_ENV=production
# COPY --from=build /app/dist ./dist
# COPY --from=build /app/prisma ./prisma
# COPY --from=deps /app/node_modules ./node_modules
# COPY package*.json ./
# # entrypoint
# COPY docker-entrypoint.sh ./docker-entrypoint.sh  
# EXPOSE 3000
# EXPOSE 6543
# RUN chmod +x docker-entrypoint.sh
# ENTRYPOINT ["./docker-entrypoint.sh"]
# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate || echo "No Prisma client"
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=deps  /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
EXPOSE 6543
# Start quickly; do NOT block on DB here
CMD ["node","dist/main.js"]