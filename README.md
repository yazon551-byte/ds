# 📡 Distributed Systems Lab

An interactive playground for **distributed systems**. It turns abstract infrastructure concepts — load balancing, fault tolerance, sharding, replication, remote invocation, messaging, rate limiting, sagas and consensus — into live simulations you can run, tweak, and break right in the browser.

Every module is built around the same guided flow: it frames a real **problem** first, pins a few **experiments** at the top with a progress tracker, tells you exactly what to try, and reveals **what just happened** after you cause each effect. Simulations start paused — you press play when you're ready.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** with a dark/light theme (no flash on load)
- No backend — every simulation is pure client-side logic (`requestAnimationFrame` loops)

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

Works out of the box on **Netlify** (via `netlify.toml` + the official Next.js runtime) and **Vercel** (zero config). No environment variables required.

## Project structure

```
src/
  app/
    layout.tsx          # root layout: fonts, theme no-flash script, providers
    page.tsx            # landing page (hero + module grid)
    globals.css         # Tailwind v4 + theme tokens + dark variant
    labs/<slug>/        # one route per lab module
  components/
    providers.tsx       # theme context
    site-header.tsx     # header with theme toggle
    site-footer.tsx
    module-card.tsx
    lab-shell.tsx       # shared chrome for every lab module
    labs/               # the interactive lab components
    labs/ux.tsx         # shared guided-UX kit (TryIt / Aha / MissionTracker)
  lib/
    types.ts            # shared types
    modules.ts          # module registry
    dict.ts             # UI string dictionary
    labs/               # pure simulation engines (framework-agnostic)
```

## Modules

| Module | Topic |
| --- | --- |
| The Three Horsemen | Latency · Partial failure · Concurrency |
| Load Balancer | Routing strategies · failover |
| Fault Tolerance | Circuit breaker · Retry/backoff · Heartbeat |
| Sharding | Range · Hash · Directory · Consistent hashing |
| Replication | Active/passive · Lag · Failover |
| Remote Invocation | RMI · REST vs gRPC · partial failure |
| Messaging & Pub/Sub | Brokers · Fan-out · Dead-letter queue |
| Rate Limiter | Token bucket · Leaky bucket · HTTP 429 |
| Saga | Distributed transactions · compensation |
| Raft Consensus | Leader election · log replication |
