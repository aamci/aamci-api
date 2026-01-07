# Activation du Chiffrement - Post-Migration

## ⚠️ Important

L'extension de chiffrement Prisma ne peut être activée qu'**APRÈS** avoir exécuté la migration de la base de données.

## Étapes

### 1. Exécuter la Migration

```bash
cd apps/api

# Installer les dépendances manquantes
pnpm add @nestjs/throttler nodemailer cookie-parser
pnpm add -D @types/nodemailer @types/cookie-parser

# Générer le Prisma Client avec les nouveaux modèles
pnpm prisma:generate

# Créer et appliquer la migration
pnpm prisma migrate dev --name add-all-features
```

### 2. Activer l'Extension de Chiffrement

Une fois la migration terminée, mettez à jour `prisma.service.ts`:

```typescript
// apps/api/src/common/prisma.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { EncryptionService } from './encryption.service';
import { createEncryptionExtension } from './prisma-encryption.extension';

@Injectable()
export class PrismaService implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private encryptionService: EncryptionService;
  public client: any; // PrismaClient étendu

  constructor() {
    // Initialiser le service de chiffrement
    this.encryptionService = new EncryptionService();

    // Créer le client Prisma avec l'extension de chiffrement
    const baseClient = new PrismaClient();
    this.client = baseClient.$extends(createEncryptionExtension(this.encryptionService));
  }

  async onModuleInit() {
    if (process.env.PRISMA_CONNECT_ON_BOOT === 'true') {
      try {
        await this.client.$connect();
        this.logger.log('Prisma connected with encryption enabled');
      } catch (e) {
        this.logger.error('Prisma connect failed', e as any);
      }
    } else {
      this.logger.warn('Skipping Prisma connect on boot (PRISMA_CONNECT_ON_BOOT != true)');
    }
  }

  // Exposer les méthodes Prisma standard
  get patientProfile() {
    return this.client.patientProfile;
  }

  get medicalNote() {
    return this.client.medicalNote;
  }

  get user() {
    return this.client.user;
  }

  get facility() {
    return this.client.facility;
  }

  get doctorProfile() {
    return this.client.doctorProfile;
  }

  get appointment() {
    return this.client.appointment;
  }

  // ... autres modèles selon vos besoins
}
```

### 3. Vérifier que la Clé de Chiffrement est Configurée

```bash
# Générer une clé de chiffrement
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Ajouter dans .env
echo "ENCRYPTION_KEY=<votre_clé_générée>" >> .env
```

### 4. Redémarrer l'API

```bash
pnpm start:dev
```

## Vérification

Pour vérifier que le chiffrement fonctionne:

```typescript
// Créer un profil patient
const profile = await prisma.client.patientProfile.create({
  data: {
    userId: 'user-id',
    firstName: 'Jean',
    socialSecurityNumber: '1 85 03 75 116 001 23',
  },
});

console.log(profile.firstName); // "Jean" (déchiffré)

// Vérifier en DB que c'est chiffré
const raw = await prisma.client.$queryRaw`
  SELECT "firstName", "socialSecurityNumber"
  FROM "PatientProfile"
  WHERE id = ${profile.id}
`;

console.log(raw[0].firstName); // "kJ8xL2mN5pQ9rT1vW3yZ6==:aB4c..." (chiffré)
```

## En Cas d'Erreur

### Erreur: "Property 'patientProfile' does not exist"

**Cause**: Prisma Client n'a pas été régénéré avec les nouveaux modèles.

**Solution**:
```bash
pnpm prisma:generate
```

### Erreur: "Cannot find module 'encryption.service'"

**Cause**: Import manquant.

**Solution**: Vérifier que tous les fichiers sont présents:
- `src/common/encryption.service.ts`
- `src/common/prisma-encryption.extension.ts`

### Erreur: "ENCRYPTION_KEY must be set"

**Cause**: Variable d'environnement manquante.

**Solution**:
```bash
# Générer et ajouter la clé
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" >> .env
```

## État Actuel

**Avant migration**:
- ❌ Extension désactivée (modèles inexistants dans Prisma Client)
- ✅ Code du chiffrement prêt
- ✅ Service EncryptionService créé
- ✅ Extension Prisma créée

**Après migration** (à faire):
- ✅ Modèles disponibles dans Prisma Client
- ✅ Activer l'extension dans PrismaService
- ✅ Tester le chiffrement
- ✅ Vérifier en DB

## Documentation

- [README_ENCRYPTION.md](../../README_ENCRYPTION.md) - Guide rapide
- [DATA_ENCRYPTION_GUIDE.md](../../DATA_ENCRYPTION_GUIDE.md) - Guide complet
- [MANUAL_SETUP.md](../../MANUAL_SETUP.md) - Installation
