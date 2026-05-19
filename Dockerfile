# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client for this image
RUN npx prisma generate
# Build your Nest app
RUN npm run build
# Compile seed script (outputs to dist/prisma/seed.js)
RUN npx tsc -p tsconfig.seed.json --noEmit false

# ---- runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy build artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# IMPORTANT: copy node_modules **from build** (after generate), not from deps
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000
CMD ["node","dist/main.js"]
# FROM node:20-alpine AS deps
# WORKDIR /app
# COPY package*.json ./
# RUN npm install

# # ---- build
# FROM node:20-alpine AS build
# WORKDIR /app
# COPY --from=deps /app/node_modules ./node_modules
# COPY . .
# RUN npx prisma generate         # ← OBLIGATOIRE ici
# RUN npm run build

# # ---- runtime
# FROM node:20-alpine AS runner
# WORKDIR /app
# ENV NODE_ENV=production
# COPY --from=build /app/dist ./dist
# COPY --from=build /app/prisma ./prisma
# COPY --from=deps  /app/node_modules ./node_modules
# COPY package*.json ./
# EXPOSE 3000
# CMD ["node", "dist/main.js"]