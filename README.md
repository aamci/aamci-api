# @health/api — NestJS REST API

API backend de la plateforme santé. Gère l'authentification, les profils médecins, la prise de rendez-vous, les paiements, les portefeuilles et la messagerie temps réel.

## Description

Application NestJS structurée en modules (feature-based). Elle expose une API REST sécurisée par JWT et supporte OAuth2 (Google, Facebook). La base de données est PostgreSQL, accessible via Prisma ORM. Les paiements sont traités par Stripe et Airtel Money. Les champs sensibles (notes médicales, messages) sont chiffrés en AES-256-GCM.

**Port local :** `3000`

---

## Stack technique

<!-- STACK:START -->
| Module | Version | Type | Description |
|--------|---------|------|-------------|
| @nestjs/common | 10.x | Framework | Décorateurs, pipes, guards, interceptors NestJS |
| @nestjs/config | 4.x | Framework | Gestion de la configuration via `.env` |
| @nestjs/core | 10.x | Framework | Noyau NestJS — bootstrapping et injection de dépendances |
| @nestjs/jwt | 10.x | Auth | Signature et vérification des JWT |
| @nestjs/mapped-types | 2.x | Framework | Utilitaires PartialType / PickType pour les DTOs |
| @nestjs/passport | 10.x | Auth | Intégration Passport.js dans NestJS |
| @nestjs/platform-express | 10.x | Framework | Adaptateur HTTP Express pour NestJS |
| @nestjs/platform-socket.io | 10.x | Realtime | Adaptateur WebSocket Socket.IO pour NestJS |
| @nestjs/throttler | 5.x | Sécurité | Rate limiting par route |
| @nestjs/websockets | 10.x | Realtime | Module WebSocket NestJS |
| @prisma/client | 6.17.x | BDD | Client TypeScript généré par Prisma pour PostgreSQL |
| argon2 | 0.31.x | Sécurité | Hachage des mots de passe (algorithme Argon2id) |
| body-parser | 2.x | HTTP | Parsing JSON/urlencoded des corps de requête |
| class-transformer | 0.5.x | Validation | Transformation et sérialisation des objets (DTOs) |
| class-validator | 0.14.x | Validation | Validation déclarative des DTOs via décorateurs |
| cookie-parser | 1.4.x | HTTP | Parsing des cookies dans les requêtes Express |
| node-fetch | 2.x | HTTP | Requêtes HTTP côté serveur (utilisé par les webhooks Airtel Money) |
| nodemailer | 7.x | Email | Envoi d'emails transactionnels (vérification, notifications) |
| passport | 0.7.x | Auth | Middleware d'authentification multi-stratégies |
| passport-facebook | 3.x | Auth | Stratégie OAuth2 Facebook |
| passport-google-oauth20 | 2.x | Auth | Stratégie OAuth2 Google |
| passport-jwt | 4.x | Auth | Stratégie JWT pour Passport |
| socket.io | 4.x | Realtime | WebSocket temps réel (messagerie, notifications) |
| stripe | 19.x | Paiement | SDK Stripe — paiements, webhooks, remboursements |
| @nestjs/cli | 11.x | Dev | CLI NestJS — génération de modules, build, watch |
| @nestjs/schematics | 10.x | Dev | Schematics de génération de code pour `@nestjs/cli` |
| @nestjs/testing | 10.x | Test | Module de test unitaire et d'intégration NestJS |
| @faker-js/faker | 10.x | Dev | Génération de données fictives pour le seed |
| jest | 29.x | Test | Framework de tests unitaires |
| prisma | 6.17.x | BDD | CLI Prisma — migrations, génération du client, Prisma Studio |
| ts-jest | 29.x | Test | Transformateur Jest pour TypeScript |
| ts-node | 10.x | Dev | Exécution TypeScript sans compilation (seeds, scripts) |
| typescript | 5.x | Dev | Compilateur TypeScript |
<!-- STACK:END -->

---

## Variables d'environnement

Fichier : `apps/api/.env` (non commité — copier `.env.example`)

| Variable | Obligatoire | Description |
|----------|:-----------:|-------------|
| `PORT` | Non | Port HTTP de l'API (défaut : `3000`) |
| `DATABASE_URL` | Oui | URL de connexion PostgreSQL — `postgresql://user:pass@host:5432/healthdb?schema=public` |
| `JWT_SECRET` | Oui | Clé secrète de signature des JWT (min. 32 caractères) |
| `JWT_EXPIRATION` | Non | Durée de validité des JWT (défaut : `7d`) |
| `STRIPE_SECRET_KEY` | Oui | Clé secrète Stripe (`sk_live_...` ou `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Non | Secret de validation des webhooks Stripe |
| `GOOGLE_CLIENT_ID` | Non | OAuth2 Google — Client ID |
| `GOOGLE_CLIENT_SECRET` | Non | OAuth2 Google — Client Secret |
| `GOOGLE_CALLBACK_URL` | Non | URL de callback Google OAuth2 |
| `FACEBOOK_APP_ID` | Non | OAuth2 Facebook — App ID |
| `FACEBOOK_APP_SECRET` | Non | OAuth2 Facebook — App Secret |
| `FACEBOOK_CALLBACK_URL` | Non | URL de callback Facebook OAuth2 |
| `SMTP_HOST` | Non | Hôte SMTP pour Nodemailer |
| `SMTP_PORT` | Non | Port SMTP (défaut : `587`) |
| `SMTP_USER` | Non | Identifiant SMTP |
| `SMTP_PASS` | Non | Mot de passe SMTP |
| `SMTP_FROM` | Non | Adresse expéditrice des emails |
| `ENCRYPTION_KEY` | Non | Clé AES-256-GCM en base64 (32 octets) — active le chiffrement des données sensibles |
| `ENCRYPTION_KEY_OLD` | Non | Ancienne clé AES-256-GCM — active la rotation paresseuse des données |
| `CORS_ORIGINS` | Non | Origines CORS autorisées (séparées par des virgules) |

---

## Lancement en local

### Prérequis

- Node.js ≥ 20
- pnpm ≥ 9
- PostgreSQL 16 (ou via Docker)

### Démarrage

```bash
# 1. Démarrer PostgreSQL (si via Docker depuis la racine du monorepo)
docker-compose up postgres -d

# 2. Installer les dépendances (depuis la racine du monorepo)
pnpm install

# 3. Configurer l'environnement
cp apps/api/.env.example apps/api/.env
# → Remplir DATABASE_URL, JWT_SECRET, etc.

# 4. Synchroniser le schéma Prisma et générer le client
cd apps/api
pnpm prisma:migrate
pnpm prisma:generate

# 5. Alimenter la base avec des données de test
pnpm seed

# 6. Démarrer le serveur en mode watch
pnpm start:dev
```

L'API est accessible sur `http://localhost:3000`.

### Commandes utiles

```bash
pnpm test          # Tests unitaires
pnpm test:cov      # Tests avec couverture
pnpm build         # Build de production

# Prisma
pnpm prisma:generate   # Régénérer le client après un changement de schéma
pnpm prisma:migrate    # Créer et appliquer une migration
npx prisma studio      # Interface graphique de la base de données

# Chiffrement
pnpm encrypt:migrate   # Chiffrer les données existantes avec ENCRYPTION_KEY
pnpm encrypt:rotate    # Rotation de clé AES (OLD → NEW)
```

### Structure des modules

```
src/
├── auth/            Authentification JWT + OAuth2
├── users/           Gestion des utilisateurs
├── appointments/    Rendez-vous (booking, statut, reschedule)
├── slots/           Créneaux de disponibilité
├── doctor-profiles/ Profils médecins et spécialités
├── facilities/      Établissements (cliniques, hôpitaux)
├── payments/        Webhooks Stripe et Airtel Money
├── wallet/          Portefeuille et mouvements financiers
├── messages/        Messagerie temps réel (Socket.IO)
├── two-factor/      Authentification 2FA TOTP
└── common/          PrismaService, EncryptionService, guards
```
