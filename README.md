# 📡 Distributed Systems Lab

An interactive, bilingual (English / العربية) playground for **distributed systems**. It turns abstract infrastructure concepts — load balancing, fault tolerance, sharding, replication, remote invocation, messaging and consensus — into live simulations you can run, tweak, and break right in the browser.

Each module is a self-contained sandbox: change the parameters, inject failures, and watch how real systems behave under load.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- Bilingual UI (EN/AR) with full RTL support + dark/light theme, no flash on load

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

## Deploying

Works out of the box on **Netlify** (via `netlify.toml` + the Next.js runtime) and **Vercel** (zero config). No environment variables required.

## Project structure

```
src/
  app/
    layout.tsx          # root layout: fonts, theme/lang no-flash script, providers
    page.tsx            # landing page (hero + module grid + about)
    globals.css         # Tailwind v4 + theme tokens + dark variant
    labs/<slug>/        # one route per lab module
  components/
    providers.tsx       # language + theme context
    site-header.tsx     # header with language & theme toggles
    site-footer.tsx
    module-card.tsx
    lab-shell.tsx       # shared chrome for every lab module
    labs/               # the interactive lab components
  lib/
    types.ts            # shared types
    modules.ts          # module registry
    dict.ts             # UI string dictionary (en/ar)
    labs/               # pure simulation engines (framework-agnostic)
```

## Modules

| Module | Topic |
| --- | --- |
| The Three Horsemen | Latency · Partial failure · Concurrency |
| Load Balancer Lab | Routing strategies |
| Consistent Hashing Ring | Hash ring rebalancing |
| Fault Tolerance Console | Circuit breaker · Retry/backoff · Heartbeat |
| Sharding Visualizer | Range · Hash · Directory |
| Replication Lab | Active/passive · Lag · Failover |
| Remote Invocation | RMI · REST vs gRPC |
| Messaging & Pub/Sub | Brokers · Fan-out · DLQ |
| Raft · Saga · Rate Limiter | Consensus · Transactions · Throttling |
