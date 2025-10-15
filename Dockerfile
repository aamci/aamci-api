# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app

# copy dependency manifest first
COPY package*.json ./

# install only production deps here if you want smaller images
RUN npm ci

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma generate + Nest build
RUN npx prisma generate || echo "No Prisma client"
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# copy build output and necessary files
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=deps  /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000
CMD ["node", "dist/main.js"]