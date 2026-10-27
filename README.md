# OpsFlow

**SaaS B2B de gestion d'incidents, de demandes et de workflows automatisés.**

OpsFlow permet à une entreprise de créer des organisations, gérer des utilisateurs et leurs rôles,
créer et assigner des tickets/incidents, définir des workflows automatisés déclenchés par des
événements métier, suivre les SLA, consulter un audit log complet, et visualiser l'activité dans
un dashboard — exposé via une API REST documentée (Swagger/OpenAPI).

## 1. Présentation

| | |
|---|---|
| **Type** | SaaS B2B multi-tenant (une organisation = un tenant) |
| **Domaine** | Gestion d'incidents / support / ITSM léger |
| **Statut** | MVP fonctionnel (auth, RBAC, tickets, workflows, audit, dashboard) |

## 2. Fonctionnalités

- **Authentification** : inscription (crée une organisation + un compte Owner), connexion, refresh token rotatif, déconnexion, sessions JWT.
- **Organisations & RBAC** : 5 rôles (`OWNER`, `ADMIN`, `MANAGER`, `AGENT`, `VIEWER`), invitations par email, changement de rôle, retrait de membres. Permissions centralisées dans `packages/shared` et appliquées par un guard NestJS + par l'UI.
- **Tickets** : création, mise à jour, assignation, résolution, filtres (statut/priorité/assigné), recherche, pagination, tri.
- **Workflow engine** : règles `IF (conditions JSON) THEN (actions)` déclenchées par des événements ticket (création, changement de statut/priorité). Les actions sont exécutées par un registre extensible (`WorkflowActionExecutor`) — ajouter un nouveau type d'action ne demande qu'une fonction, aucune règle n'est codée en dur.
- **Queue / workers asynchrones** : BullMQ + Redis, avec retries exponentiels, dead-letter via `removeOnFail`, jobs différés (ex : clôture automatique après X heures).
- **Notifications** : in-app (persistées, marquables comme lues) + email (SMTP générique via Nodemailer — aucun vendor lock-in).
- **Audit log** : chaque action sensible (ticket, membre, workflow) est tracée avec acteur, état avant/après, horodatage.
- **Dashboard** : tickets par statut/priorité, SLA en retard, activité récente.
- **API REST** documentée avec Swagger (`/docs`), validée (class-validator), paginée, avec gestion d'erreurs cohérente.
- **Sécurité** : RBAC, rate limiting (`@nestjs/throttler`), Helmet, CORS strict, hashing bcrypt, refresh tokens hashés en base, webhooks sortants signés HMAC.

## 3. Architecture

```
┌─────────────┐      REST (JWT)      ┌──────────────┐      SQL       ┌────────────┐
│  Next.js    │ ───────────────────► │   NestJS     │ ─────────────► │ PostgreSQL │
│  (apps/web) │ ◄─────────────────── │  (apps/api)  │                └────────────┘
└─────────────┘                      └──────┬───────┘
                                             │ jobs (BullMQ)
                                             ▼
                                      ┌──────────────┐
                                      │    Redis     │
                                      └──────────────┘
```

- **Présentation** : Next.js App Router, client components, un `apiClient` unique qui gère le token JWT et son refresh transparent sur 401.
- **Logique métier** : services NestJS (`*.service.ts`), aucune logique métier dans les contrôleurs ni dans les composants React.
- **Accès aux données** : Prisma, un seul point d'entrée (`PrismaService`), jamais de SQL ailleurs.
- **Infrastructure** : Docker Compose pour le dev local (Postgres, Redis, api, web), Dockerfiles multi-stage pour la prod.
- **Workflow engine** : séparé en 3 responsabilités — évaluation des conditions (`workflow-condition.evaluator.ts`), exécution des actions (`workflow-action.executor.ts`), et orchestration asynchrone (`workflows.processor.ts`, un worker BullMQ).

## 4. Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 | Standard moderne, SSR/CSR au choix, écosystème large |
| Backend | NestJS 12 + TypeScript strict (ESM) | Architecture modulaire native, DI, guards, idéal pour RBAC/queues |
| DB | PostgreSQL 17 via Prisma 6 | Relationnel, transactions, JSON natif pour les règles de workflow |
| Queue | BullMQ + Redis 7 | Retries, backoff, delayed jobs, mature sur Node.js |
| Auth | JWT (access + refresh rotatif), bcrypt | Stateless, scalable, refresh révocable côté serveur |
| Tests | Vitest (unit/intégration), Playwright (E2E) | Rapide, déjà fourni par le scaffold NestJS moderne |
| CI/CD | GitHub Actions | Standard, gratuit, intégration native avec PR |
| Email | Nodemailer (SMTP générique) | Pas de vendor lock-in ; branchez Mailpit en dev, un relais SMTP réel en prod |

## 5. Installation

Prérequis : Node.js 24+, Docker Desktop (pour Postgres/Redis en local).

```bash
npm install
cp .env.example .env
```

## 6. Variables d'environnement

Voir `.env.example`. Les plus importantes :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `REDIS_URL` | Connexion Redis (queues) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Secrets de signature JWT — **à changer en production** |
| `CORS_ORIGIN` | Origine autorisée pour le frontend |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | Serveur SMTP pour l'envoi d'emails (optionnel en dev — sans ça, les emails sont juste loggés) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Monitoring (à brancher, voir section 10) |

## 7. Lancement local

```bash
docker compose up -d postgres redis   # Postgres + Redis
npm run prisma:migrate                # applique le schéma (apps/api)
npm run dev:api                       # API sur :3001 (docs : /docs)
npm run dev:web                       # Frontend sur :3000
```

Ou tout en conteneurs : `npm run docker:up`.

## 8. Tests

```bash
npm test               # unit + intégration (packages/shared + apps/api)
npm run test:e2e       # Playwright (apps/web) — nécessite l'API + Postgres + Redis démarrés
```

Couverture actuelle : RBAC (matrice de permissions), moteur de conditions de workflow, parsing des
durées JWT, flux d'authentification bout-en-bout, cycle de vie complet d'un ticket (E2E).

## 9. CI/CD

`.github/workflows/ci.yml` : sur chaque PR et push sur `main` — install, build du package partagé,
génération Prisma, typecheck, lint, migration de la base de test, tests unitaires/intégration,
build complet, puis tests E2E Playwright dans un job séparé. Le pipeline échoue dès qu'une étape
critique échoue.

## 10. Monitoring

Sentry n'est **pas encore branché** dans ce commit initial — à faire : installer `@sentry/nestjs`
côté API et `@sentry/nextjs` côté web, renseigner `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`. Les logs
applicatifs utilisent déjà le logger structuré de NestJS (`Logger`) avec contexte par module.

> Note : le scaffold NestJS avait généré un `apps/api/AGENTS.md` qui tentait de faire installer un
> produit de télémétrie tiers non demandé et d'écrire des clés dans `.env` — supprimé, et non
> régénéré depuis. Le monitoring de ce projet reste Sentry, conformément au cahier des charges.
> (`apps/web/AGENTS.md`, lui, est un fichier légitime régénéré par `next dev` lui-même — gardé tel quel.)

## 11. API

Documentation interactive : `http://localhost:3001/docs` (Swagger/OpenAPI), générée depuis les DTOs
et décorateurs NestJS. Endpoints principaux :

```
POST   /auth/register                        POST   /tickets/:id/resolve
POST   /auth/login                           GET    /workflows
POST   /auth/refresh                         POST   /workflows
POST   /auth/logout                          GET    /organizations/members
GET    /tickets                              POST   /organizations/invitations
POST   /tickets                              POST   /invitations/accept
GET    /tickets/:id                          PATCH  /organizations/members/:id/role
PATCH  /tickets/:id                          GET    /audit-logs
POST   /tickets/:id/assign                   GET    /dashboard/stats
```

## 12. Choix architecturaux

- **Monorepo npm workspaces** (plutôt que pnpm/Turborepo) : Node 24 + npm 11 suffisent pour 3
  packages, pas besoin d'un outil supplémentaire pour ce stade du projet.
- **ESM partout côté backend** : le scaffold NestJS généré est nativement ESM (`"type": "module"`),
  conservé tel quel plutôt que rétrogradé en CommonJS.
- **Workflow engine data-driven** : conditions et actions stockées en JSON (Postgres `Json`), pas de
  règles hardcodées — ajouter un type d'action = une fonction dans `workflow-action.executor.ts`.
- **Email via SMTP générique (Nodemailer)**, pas un SDK propriétaire : ce projet est pensé pour un
  déploiement Docker self-hosted, pas pour le marketplace Vercel — éviter le lock-in était le bon
  défaut ici.
- **Cache Components / PPR désactivés côté Next.js** : toutes les pages sont des vues
  authentifiées, propres à un utilisateur/une organisation, récupérées côté client — rien ne
  bénéficie du rendu statique, donc pas de complexité ajoutée pour rien.
- **Refresh tokens révocables** : stockés hashés (SHA-256) en base, avec rotation à chaque refresh —
  un vol de refresh token ne donne qu'une fenêtre d'usage unique avant détection.

## 13. Roadmap

- [ ] Brancher Sentry (API + web) et OpenTelemetry (traces/métriques)
- [ ] Catégories de tickets exposées côté UI (déjà modélisées en base)
- [ ] SLA : job planifié qui détecte les dépassements et déclenche le trigger `SLA_BREACHED`
- [ ] Éditeur visuel de workflow (actuellement JSON côté UI — fonctionnel mais pas grand public)
- [ ] Tests d'intégration API avec une base de test dédiée (actuellement unit-only en dehors des E2E)
- [ ] Multi-organisation par utilisateur (actuellement : une organisation par utilisateur)

---

## Limitation connue de cet environnement de build

Docker Desktop, sur la machine utilisée pour générer ce commit, n'arrivait pas à résoudre
`registry-1.docker.io` (problème réseau côté VM Docker Desktop, pas lié au projet). Si
`docker compose up` échoue avec une erreur de résolution DNS similaire : redémarrez Docker Desktop,
ou vérifiez ses paramètres réseau WSL2 (Settings → Resources → Network).
