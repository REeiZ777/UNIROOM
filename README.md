## UNIROOM

Plateforme Next.js (App Router) pour la gestion des reservations de salles avec Prisma, Tailwind et NextAuth.

### Prerequis

- Node.js 20+ (22 recommande)
- Variables d'environnement a definir dans `.env` (voir `.env.example`)
  - `DATABASE_URL`
  - `AUTH_SECRET`
  - `SCHOOL_TIMEZONE` (par defaut `Africa/Abidjan`)

### Installation

```bash
npm install
```

### Commandes principales

```bash
npm run dev          # Lancer le serveur applicatif
npm run lint         # Verifier la qualite du code
npm run typecheck    # Verifier les types TypeScript
npm run test         # Executer les tests unitaires (node:test)
npm run db:migrate   # Appliquer les migrations Prisma
npm run db:seed      # Inserer les donnees initiales (idempotent)
```

### Base de donnees & seed

1. Configurez `DATABASE_URL` (SQLite par defaut `file:./prisma/dev.db`). Sur Windows, si vous rencontrez l'erreur `Unable to open the database file`, remplacez la valeur par un chemin absolu (ex : `file:C:/Users/<vous>/uniroom/prisma/dev.db`).
2. Appliquez le schema :
   ```bash
   npm run db:migrate
   ```
3. Generez les donnees de demonstration (5 salles, 3 comptes admin, 2 reservations du jour) :
   ```bash
   npm run db:seed
   ```
   Le seed est idempotent et peut etre relance sans creer de doublons. Les mots de passe sont hashes (bcrypt) via `src/server/security/password.ts`.

### Comptes administrateurs de demonstration

| Email                     | Mot de passe |
| ------------------------- | ------------ |
|   | Admin#12345  |
| cpe@uniroom.school        | Admin#12345  |
| secretaire@uniroom.school | Admin#12345  |

> **Attention** : remplacez ces identifiants en production et stockez les secrets dans un gestionnaire securise.

### Authentification

- Authentification Nedirecteur@uniroom.schoolxtAuth Credentials (strategie JWT, session 8 h).
- `AUTH_SECRET` est obligatoire; l'application echoue explicitement si absent.
- Aucun signup : seuls les comptes admin existants peuvent se connecter.
- Cookies marques `secure` automatiquement en production.
- Les routes protegees (groupe `(protected)`) redirigent vers `/login` si la session est absente.

### Tests

Le test `tests/verify-password.test.ts` couvre la verification des mots de passe. Lancez `npm run test` pour executer la suite.
