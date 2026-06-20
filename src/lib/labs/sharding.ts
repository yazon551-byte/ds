import type { Localized } from "@/lib/types";

export type ShardStrategy = "range" | "hash" | "directory" | "consistent";

export const KEY_SPACE = 1000; // keys are user IDs 0..999
export const RING = 360; // consistent-hashing ring in degrees
export const VIRTUAL = 3; // virtual nodes per shard

export const SHARD_COLORS = [
  "#6366f1",
  "#22d3ee",
  "#f59e0b",
  "#a78bfa",
  "#34d399",
  "#f472b6",
];

/** Deterministic 32-bit integer hash (so SSR and client agree). */
export function hashInt(n: number): number {
  let x = n | 0;
  x = (x ^ 61) ^ (x >>> 16);
  x = x + (x << 3);
  x = x ^ (x >>> 4);
  x = Math.imul(x, 0x27d4eb2d);
  x = x ^ (x >>> 15);
  return x >>> 0;
}

/** A fixed, well-spread set of sample keys (user IDs). */
export const sampleKeys: number[] = [
  12, 145, 233, 678, 401, 99, 555, 820, 7, 318, 462, 199, 733, 88, 901, 277,
  634, 510, 156, 389, 720, 45, 866, 213,
];

// ── Range ────────────────────────────────────────────────────────────────
export function rangeBounds(n: number): { lo: number; hi: number }[] {
  const size = KEY_SPACE / n;
  return Array.from({ length: n }, (_, i) => ({
    lo: Math.round(i * size),
    hi: i === n - 1 ? KEY_SPACE - 1 : Math.round((i + 1) * size) - 1,
  }));
}
export function rangeShard(key: number, n: number): number {
  const size = KEY_SPACE / n;
  return Math.min(n - 1, Math.floor(key / size));
}

// ── Hash (mod N) ──────────────────────────────────────────────────────────
export function hashShard(key: number, n: number): number {
  return hashInt(key) % n;
}

// ── Consistent hashing ────────────────────────────────────────────────────
export interface VNode {
  angle: number; // 0..359
  shard: number;
}
export function ringNodes(n: number): VNode[] {
  const nodes: VNode[] = [];
  for (let s = 0; s < n; s++) {
    for (let v = 0; v < VIRTUAL; v++) {
      nodes.push({ angle: hashInt(s * 7919 + v * 104729) % RING, shard: s });
    }
  }
  return nodes.sort((a, b) => a.angle - b.angle);
}
export function keyAngle(key: number): number {
  return hashInt(key * 2654435761) % RING;
}
export function consistentShard(key: number, n: number, nodes?: VNode[]): number {
  const ring = nodes ?? ringNodes(n);
  const a = keyAngle(key);
  for (const node of ring) {
    if (node.angle >= a) return node.shard;
  }
  return ring[0].shard; // wrap around
}

// ── Generic mapping + movement (for range/hash/consistent) ────────────────
export function mapShard(strategy: ShardStrategy, key: number, n: number): number {
  switch (strategy) {
    case "range":
      return rangeShard(key, n);
    case "hash":
      return hashShard(key, n);
    case "consistent":
      return consistentShard(key, n);
    default:
      return hashShard(key, n);
  }
}

/** % of keys that change shard when going from n shards to newN (range/hash/consistent). */
export function movementPct(
  strategy: ShardStrategy,
  keys: number[],
  n: number,
  newN: number,
): number {
  if (newN < 1 || n < 1) return 0;
  let moved = 0;
  for (const k of keys) {
    if (mapShard(strategy, k, n) !== mapShard(strategy, k, newN)) moved++;
  }
  return (moved / keys.length) * 100;
}

// ── Representative rebalancing statistics ─────────────────────────────────
// The on-screen ring deliberately uses a small key set + few virtual nodes so
// it stays legible. That sample is too small for the "hash reshuffles ~all,
// consistent moves ~1/N" thesis to hold at low shard counts. So the *displayed
// percentages* are computed here over a large key population with many virtual
// nodes on a high-resolution ring — i.e. how the algorithms behave at scale.
const STAT_RING = 100000;
const STAT_VIRTUAL = 80;
// Keep keys inside KEY_SPACE so range-based stats are correct (range clamps to it).
const STAT_KEYS: number[] = Array.from({ length: 360 }, (_, i) => Math.floor((i / 360) * KEY_SPACE));

function statRing(n: number): VNode[] {
  const nodes: VNode[] = [];
  for (let s = 0; s < n; s++) {
    for (let v = 0; v < STAT_VIRTUAL; v++) {
      nodes.push({ angle: hashInt(s * 7919 + v * 104729 + 17) % STAT_RING, shard: s });
    }
  }
  return nodes.sort((a, b) => a.angle - b.angle);
}
function statConsistent(key: number, ring: VNode[]): number {
  const a = hashInt(key * 2654435761) % STAT_RING;
  for (const node of ring) if (node.angle >= a) return node.shard;
  return ring[0].shard;
}

/** % of keys that move from n→newN shards, measured over a large population. */
export function statMovementPct(strategy: ShardStrategy, n: number, newN: number): number {
  if (newN < 1 || n < 1) return 0;
  let moved = 0;
  if (strategy === "consistent") {
    const ringA = statRing(n);
    const ringB = statRing(newN);
    for (const k of STAT_KEYS) {
      if (statConsistent(k, ringA) !== statConsistent(k, ringB)) moved++;
    }
  } else {
    for (const k of STAT_KEYS) {
      if (mapShard(strategy, k, n) !== mapShard(strategy, k, newN)) moved++;
    }
  }
  return (moved / STAT_KEYS.length) * 100;
}

export interface StrategyInfo {
  id: ShardStrategy;
  name: Localized;
  how: Localized;
  pro: Localized;
  con: Localized;
}

export const shardStrategies: StrategyInfo[] = [
  {
    id: "range",
    name: { en: "Range-based", ar: "حسب المدى" },
    how: {
      en: "The key space is split into contiguous ranges (0–249 → shard 0, 250–499 → shard 1 …). The key's value decides its shard directly.",
      ar: "يُقسَّم فضاء المفاتيح إلى مدَيات متتالية (0–249 → قسم 0، 250–499 → قسم 1 …). قيمة المفتاح تحدّد قسمه مباشرة.",
    },
    pro: { en: "Range queries are easy (neighbours sit together).", ar: "استعلامات المدى سهلة (المتجاورون معاً)." },
    con: {
      en: "Hot spots: sequential new IDs all pile onto the newest shard.",
      ar: "نقاط ساخنة: المعرّفات الجديدة المتسلسلة تتكدّس على أحدث قسم.",
    },
  },
  {
    id: "hash",
    name: { en: "Hash (mod N)", ar: "تجزئة (mod N)" },
    how: {
      en: "shard = hash(key) % N. The hash scrambles the key, then modulo picks a shard. Spread is very even.",
      ar: "القسم = hash(key) % N. التجزئة تخلط المفتاح ثم باقي القسمة يختار القسم. التوزيع منتظم جداً.",
    },
    pro: { en: "Uniform distribution; no hot spots.", ar: "توزيع منتظم؛ بلا نقاط ساخنة." },
    con: {
      en: "Changing N remaps almost everything — terrible for adding/removing nodes.",
      ar: "تغيير N يعيد توزيع كل شيء تقريباً — كارثي عند إضافة/حذف عُقَد.",
    },
  },
  {
    id: "directory",
    name: { en: "Directory-based", ar: "حسب الدليل" },
    how: {
      en: "A central lookup table maps each key → shard explicitly — any key can live on any shard, independent of its value. Here the table is precomputed and kept balanced.",
      ar: "جدول بحث مركزي يربط كل مفتاح → قسم صراحةً — أي مفتاح ممكن يكون على أي قسم بغضّ النظر عن قيمته. هون الجدول محسوب مسبقاً ومتوازن.",
    },
    pro: { en: "Total placement freedom — any key can go on any shard.", ar: "حرية كاملة بالتوزيع — أي مفتاح ممكن يروح لأي قسم." },
    con: {
      en: "The directory is a single point of failure + an extra lookup hop.",
      ar: "الدليل نقطة فشل وحيدة + قفزة بحث إضافية.",
    },
  },
  {
    id: "consistent",
    name: { en: "Consistent hashing", ar: "التجزئة الثابتة" },
    how: {
      en: "Shards and keys are placed on a ring by their hash; a key belongs to the next shard clockwise. Virtual nodes even out the load.",
      ar: "تُوضع الأقسام والمفاتيح على حلقة حسب تجزئتها؛ المفتاح يتبع أقرب قسم باتجاه عقارب الساعة. العُقَد الافتراضية توازن الحِمل.",
    },
    pro: {
      en: "Adding/removing a node moves only ~1/N of keys.",
      ar: "إضافة/حذف عقدة ينقل فقط ~1/N من المفاتيح.",
    },
    con: { en: "More complex; needs virtual nodes to stay balanced.", ar: "أعقد؛ يحتاج عُقَداً افتراضية ليبقى متوازناً." },
  },
];

export function shardStrategyInfo(id: ShardStrategy): StrategyInfo {
  return shardStrategies.find((s) => s.id === id) ?? shardStrategies[0];
}
