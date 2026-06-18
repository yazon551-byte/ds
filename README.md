# 📡 Distributed Systems Lab

An interactive, bilingual (English / العربية) lab for learning **distributed systems** by playing with them. Every concept from the course — load balancing, fault tolerance, sharding, replication, remote invocation, messaging and more — becomes a live simulation you run in the browser.

> The course teaches these ideas with **Java RMI** examples. Since Java RMI can't run on the web, this lab re-creates the same ideas as interactive browser simulations and deploys cleanly on **Vercel**.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- Bilingual UI (EN/AR) with RTL support + dark/light theme, no flash on load

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build (Turbopack)
npm run start    # serve the production build
npm run lint     # ESLint
```

## Deploying to Vercel

1. Push this folder to a GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. If the repo root is the parent folder, set **Root Directory** to `ds-lab`.
4. Framework preset is auto-detected (Next.js). Click **Deploy**.

No environment variables are required.

## Project structure

```
src/
  app/
    layout.tsx        # root layout: fonts, theme/lang no-flash script, providers
    page.tsx          # landing page (hero + module grid + about)
    globals.css       # Tailwind v4 + theme tokens + dark variant
    labs/<slug>/      # one folder per lab module (added per phase)
  components/
    providers.tsx     # language + theme context
    site-header.tsx   # header with language & theme toggles
    site-footer.tsx
    module-card.tsx
  lib/
    types.ts          # shared types
    modules.ts        # module registry (maps each module to a lecture)
    dict.ts           # UI string dictionary (en/ar)
```

## Modules → lectures

| Module | Lecture |
| --- | --- |
| The Three Horsemen | Session 1 |
| Load Balancer Lab | Sessions 3–5 |
| Consistent Hashing Ring | Sessions 4–5 |
| Fault Tolerance Console | Session 6 |
| Sharding Visualizer | Session 6 |
| Replication Lab | Session 6 |
| Remote Invocation | Java RMI + Session 5 |
| Messaging & Pub/Sub | Session 5 |
| Raft / Saga / Rate Limiter | Bonus |
