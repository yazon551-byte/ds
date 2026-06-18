import type { Localized } from "@/lib/types";

export type StrategyId =
  | "round-robin"
  | "weighted-round-robin"
  | "least-connections"
  | "power-of-two"
  | "latency"
  | "random";

export interface StrategyInfo {
  id: StrategyId;
  name: Localized;
  short: Localized;
  how: Localized;
  pro: Localized;
  con: Localized;
}

export const strategies: StrategyInfo[] = [
  {
    id: "round-robin",
    name: { en: "Round Robin", ar: "التدوير الدائري" },
    short: {
      en: "Rotate through servers in order.",
      ar: "التدوير على الخوادم بالترتيب.",
    },
    how: {
      en: "Each new request goes to the next server in line, looping back to the first. It completely ignores how busy each server is.",
      ar: "كل طلب جديد يذهب إلى الخادم التالي بالترتيب، ثم يعود للبداية. لا يأخذ بالحسبان مدى انشغال كل خادم.",
    },
    pro: {
      en: "Dead simple, and perfectly even when all servers are identical.",
      ar: "بسيط جداً، وعادل تماماً عندما تكون كل الخوادم متماثلة.",
    },
    con: {
      en: "Blind to load — a slow or overloaded server still gets its turn.",
      ar: "أعمى عن الحِمل — الخادم البطيء أو المحمَّل يأخذ دوره رغم ذلك.",
    },
  },
  {
    id: "weighted-round-robin",
    name: { en: "Weighted Round Robin", ar: "التدوير الموزون" },
    short: {
      en: "Give stronger servers a bigger share.",
      ar: "إعطاء الخوادم الأقوى حصة أكبر.",
    },
    how: {
      en: "Servers with a higher weight receive proportionally more requests. Smooth weighting spreads them evenly instead of in bursts.",
      ar: "الخوادم ذات الوزن الأعلى تستقبل طلبات أكثر بالتناسب. التوزين الناعم ينشرها بانتظام بدلاً من دفعات.",
    },
    pro: {
      en: "Respects servers with different capacities.",
      ar: "يحترم اختلاف قدرات الخوادم.",
    },
    con: {
      en: "Weights are static — it doesn't react to real-time load.",
      ar: "الأوزان ثابتة — لا يتفاعل مع الحِمل اللحظي.",
    },
  },
  {
    id: "least-connections",
    name: { en: "Least Connections", ar: "الأقل اتصالات" },
    short: {
      en: "Send to the server with the fewest active requests.",
      ar: "الإرسال إلى الخادم صاحب أقل عدد طلبات نشطة.",
    },
    how: {
      en: "Before routing, it checks how many requests each server is handling right now and picks the least busy one.",
      ar: "قبل التوجيه، يفحص عدد الطلبات التي يعالجها كل خادم حالياً ويختار الأقل انشغالاً.",
    },
    pro: {
      en: "Adapts to real load — great when request durations vary a lot.",
      ar: "يتكيّف مع الحِمل الفعلي — ممتاز عندما تتفاوت مدد الطلبات كثيراً.",
    },
    con: {
      en: "Needs live connection counts and scans every server (O(N)).",
      ar: "يحتاج لعدّ الاتصالات الحيّة ويمسح كل الخوادم (O(N)).",
    },
  },
  {
    id: "power-of-two",
    name: { en: "Power of Two Choices", ar: "اختيار من اثنين" },
    short: {
      en: "Pick two at random, send to the lighter one.",
      ar: "اختر اثنين عشوائياً، وأرسل للأخف.",
    },
    how: {
      en: "Instead of scanning everyone, it samples two random servers and routes to whichever has fewer active connections.",
      ar: "بدل مسح الجميع، يأخذ عيّنة من خادمين عشوائيين ويوجّه للأقل اتصالات.",
    },
    pro: {
      en: "Almost as good as least-connections but O(1), and it avoids herd behavior.",
      ar: "جيّد تقريباً مثل الأقل-اتصالات لكن بكلفة O(1)، ويتجنّب تكدّس القطيع.",
    },
    con: {
      en: "Slightly less optimal than a full scan of all servers.",
      ar: "أقل مثالية قليلاً من المسح الكامل لكل الخوادم.",
    },
  },
  {
    id: "latency",
    name: { en: "Latency-Based", ar: "حسب زمن الاستجابة" },
    short: {
      en: "Route to whoever has been answering fastest.",
      ar: "التوجيه لمن يستجيب أسرع مؤخراً.",
    },
    how: {
      en: "It tracks a smoothed recent response time per server and sends new requests to the one with the lowest.",
      ar: "يتتبّع زمن استجابة حديث مُنعّم لكل خادم ويرسل الطلبات الجديدة للأقل زمناً.",
    },
    pro: {
      en: "Naturally steers traffic away from slow or overloaded nodes.",
      ar: "يوجّه الترافيك تلقائياً بعيداً عن العُقَد البطيئة أو المحمَّلة.",
    },
    con: {
      en: "Reacts to the past, so it can oscillate if it overcorrects.",
      ar: "يتفاعل مع الماضي، فقد يتذبذب إذا بالغ في التصحيح.",
    },
  },
  {
    id: "random",
    name: { en: "Random", ar: "عشوائي" },
    short: {
      en: "Pick any healthy server at random.",
      ar: "اختيار أي خادم سليم عشوائياً.",
    },
    how: {
      en: "Chooses a server uniformly at random. A surprisingly decent baseline.",
      ar: "يختار خادماً بشكل عشوائي متساوٍ. خط أساس جيّد بشكل مفاجئ.",
    },
    pro: {
      en: "Zero state, trivial to implement.",
      ar: "بلا حالة، وسهل التنفيذ جداً.",
    },
    con: {
      en: "No load awareness; uneven over short windows.",
      ar: "لا وعي بالحِمل؛ غير منتظم على المدى القصير.",
    },
  },
];

export function strategyInfo(id: StrategyId): StrategyInfo {
  return strategies.find((s) => s.id === id) ?? strategies[0];
}

export interface ServerSim {
  id: string;
  name: string;
  color: string;
  weight: number;
  baseLatency: number; // ms, intrinsic processing time
  capacity: number; // soft concurrency capacity
  down: boolean;
  // dynamic state
  active: number; // in-flight requests being processed
  handled: number; // completed count
  latencySum: number; // sum of completed latencies (for average)
  ewma: number; // smoothed recent latency
  currentWeight: number; // smooth weighted round-robin state
}

const SERVER_COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#a78bfa", "#34d399"];

export function defaultServers(): ServerSim[] {
  const defs = [
    { name: "Server A", weight: 3, baseLatency: 350, capacity: 10 },
    { name: "Server B", weight: 2, baseLatency: 600, capacity: 7 },
    { name: "Server C", weight: 1, baseLatency: 1100, capacity: 5 },
    { name: "Server D", weight: 2, baseLatency: 500, capacity: 7 },
  ];
  return defs.map((d, i) => ({
    id: `s${i}`,
    name: d.name,
    color: SERVER_COLORS[i % SERVER_COLORS.length],
    weight: d.weight,
    baseLatency: d.baseLatency,
    capacity: d.capacity,
    down: false,
    active: 0,
    handled: 0,
    latencySum: 0,
    ewma: d.baseLatency,
    currentWeight: 0,
  }));
}

export function avgLatency(s: ServerSim): number {
  return s.handled ? s.latencySum / s.handled : s.baseLatency;
}

/** Time (ms) a server will take to process a new request given its current load. */
export function processingTime(s: ServerSim): number {
  const loadFactor = s.active / s.capacity;
  const penalty = 1 + Math.max(0, loadFactor) * 1.6;
  const jitter = 0.85 + Math.random() * 0.3;
  return s.baseLatency * penalty * jitter;
}

export interface ChooseContext {
  rrPointer: number;
}

/**
 * Pick a healthy server index for the next request, or -1 if all are down.
 * May mutate `ctx` (round-robin pointer) and server weights (weighted RR).
 */
export function chooseServer(
  strategy: StrategyId,
  servers: ServerSim[],
  ctx: ChooseContext,
): number {
  const healthy = servers
    .map((s, i) => ({ s, i }))
    .filter((x) => !x.s.down);
  if (healthy.length === 0) return -1;

  switch (strategy) {
    case "round-robin": {
      const n = servers.length;
      for (let step = 1; step <= n; step++) {
        const idx = (ctx.rrPointer + step) % n;
        if (!servers[idx].down) {
          ctx.rrPointer = idx;
          return idx;
        }
      }
      return -1;
    }

    case "weighted-round-robin": {
      // Smooth weighted round-robin (Nginx-style).
      let total = 0;
      let best = -1;
      for (const { s, i } of healthy) {
        s.currentWeight += s.weight;
        total += s.weight;
        if (best === -1 || s.currentWeight > servers[best].currentWeight) {
          best = i;
        }
      }
      if (best !== -1) servers[best].currentWeight -= total;
      return best;
    }

    case "least-connections": {
      let best = healthy[0].i;
      for (const { s, i } of healthy) {
        if (
          s.active < servers[best].active ||
          (s.active === servers[best].active && s.weight > servers[best].weight)
        ) {
          best = i;
        }
      }
      return best;
    }

    case "power-of-two": {
      if (healthy.length === 1) return healthy[0].i;
      const a = healthy[Math.floor(Math.random() * healthy.length)];
      let b = healthy[Math.floor(Math.random() * healthy.length)];
      let guard = 0;
      while (b.i === a.i && guard++ < 8) {
        b = healthy[Math.floor(Math.random() * healthy.length)];
      }
      return a.s.active <= b.s.active ? a.i : b.i;
    }

    case "latency": {
      let best = healthy[0].i;
      for (const { s, i } of healthy) {
        if (s.ewma < servers[best].ewma) best = i;
      }
      return best;
    }

    case "random":
    default:
      return healthy[Math.floor(Math.random() * healthy.length)].i;
  }
}
