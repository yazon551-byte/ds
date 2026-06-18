import type { CategoryMeta, ModuleMeta } from "./types";

export const categories: CategoryMeta[] = [
  {
    id: "foundations",
    name: { en: "Foundations", ar: "الأساسيات" },
    icon: "🌌",
  },
  {
    id: "load-balancing",
    name: { en: "Load Balancing", ar: "موازنة الأحمال" },
    icon: "⚖️",
  },
  {
    id: "resilience",
    name: { en: "Fault Tolerance", ar: "تحمّل الأعطال" },
    icon: "🛡️",
  },
  {
    id: "data",
    name: { en: "Data & Storage", ar: "البيانات والتخزين" },
    icon: "🗄️",
  },
  {
    id: "communication",
    name: { en: "Communication", ar: "التواصل" },
    icon: "📡",
  },
  {
    id: "advanced",
    name: { en: "Advanced", ar: "متقدّم" },
    icon: "🧠",
  },
];

export const modules: ModuleMeta[] = [
  // ── Foundations ────────────────────────────────────────────────────────
  {
    slug: "three-horsemen",
    title: { en: "The Three Horsemen", ar: "الفرسان الثلاثة" },
    tagline: {
      en: "Latency, Partial Failure & Concurrency — the core problems of every distributed system.",
      ar: "التأخير، الفشل الجزئي، والتزامن — المشاكل الأساسية لأي نظام موزّع.",
    },
    category: "foundations",
    difficulty: "Beginner",
    icon: "🐎",
    status: "ready",
  },

  // ── Load Balancing ─────────────────────────────────────────────────────
  {
    slug: "load-balancer",
    title: { en: "Load Balancer Lab", ar: "مختبر موازنة الأحمال" },
    tagline: {
      en: "Send traffic through Round Robin, Least Connections, Power of Two, Weighted & Consistent Hashing — and watch it route live.",
      ar: "وزّع الترافيك عبر Round Robin و Least Connections و Power of Two والأوزان و Consistent Hashing — وشوف التوزيع حيّ.",
    },
    category: "load-balancing",
    difficulty: "Intermediate",
    icon: "⚖️",
    status: "ready",
  },

  // ── Fault Tolerance ────────────────────────────────────────────────────
  {
    slug: "fault-tolerance",
    title: { en: "Fault Tolerance Console", ar: "لوحة تحمّل الأعطال" },
    tagline: {
      en: "Circuit Breaker (CLOSED / OPEN / HALF-OPEN), retry with backoff & jitter, and heartbeat health checks.",
      ar: "قاطع الدارة (CLOSED / OPEN / HALF-OPEN)، وإعادة المحاولة مع التأخّر والتشويش، وفحوصات النبض.",
    },
    category: "resilience",
    difficulty: "Intermediate",
    icon: "🛡️",
    status: "ready",
  },

  // ── Data & Storage ─────────────────────────────────────────────────────
  {
    slug: "sharding",
    title: { en: "Sharding Visualizer", ar: "مُصوِّر التقسيم (Sharding)" },
    tagline: {
      en: "Compare Range, Hash and Directory sharding — type a key and trace exactly which shard it lands on.",
      ar: "قارن بين التقسيم بالمدى والتجزئة والدليل — اكتب مفتاحاً وتتبّع أي قسم بيروح إليه.",
    },
    category: "data",
    difficulty: "Advanced",
    icon: "🧩",
    status: "ready",
  },
  {
    slug: "replication",
    title: { en: "Replication Lab", ar: "مختبر النسخ المتماثل" },
    tagline: {
      en: "Active vs Passive replication, replication lag, stale reads and primary failover.",
      ar: "النسخ النشط مقابل الخامل، تأخّر المزامنة، القراءات القديمة، وترقية النسخة الأساسية.",
    },
    category: "data",
    difficulty: "Advanced",
    icon: "🔁",
    status: "ready",
  },

  // ── Communication ──────────────────────────────────────────────────────
  {
    slug: "remote-invocation",
    title: { en: "Remote Invocation", ar: "الاستدعاء عن بُعد" },
    tagline: {
      en: "See a call travel client → stub → network → server (RMI) and compare REST vs gRPC.",
      ar: "شاهد النداء وهو يسافر العميل → الوكيل → الشبكة → الخادم (RMI)، وقارن REST مقابل gRPC.",
    },
    category: "communication",
    difficulty: "Intermediate",
    icon: "📡",
    status: "ready",
  },
  {
    slug: "messaging",
    title: { en: "Messaging & Pub/Sub", ar: "الرسائل و Pub/Sub" },
    tagline: {
      en: "Publish events to a broker, fan them out to subscribers, and route poison messages to a Dead-Letter Queue.",
      ar: "انشر أحداثاً إلى وسيط، وزّعها على المشتركين، ووجّه الرسائل الفاسدة إلى طابور الرسائل الميتة.",
    },
    category: "communication",
    difficulty: "Intermediate",
    icon: "✉️",
    status: "ready",
  },

  // ── Advanced ───────────────────────────────────────────────────────────
  {
    slug: "raft",
    title: { en: "Raft Consensus", ar: "توافق Raft" },
    tagline: {
      en: "Leader election, terms and log replication across a 3-node cluster with quorum voting.",
      ar: "انتخاب القائد، والفترات، ونسخ السجل عبر عنقود من 3 عُقَد بتصويت الأغلبية.",
    },
    category: "advanced",
    difficulty: "Expert",
    icon: "🗳️",
    status: "soon",
  },
  {
    slug: "saga",
    title: { en: "Saga Coordinator", ar: "منسّق الـ Saga" },
    tagline: {
      en: "Orchestrate a multi-service checkout and run compensating transactions when a step fails.",
      ar: "نسّق عملية شراء عبر عدة خدمات، ونفّذ معاملات تعويضية عند فشل أي خطوة.",
    },
    category: "advanced",
    difficulty: "Expert",
    icon: "🧾",
    status: "ready",
  },
  {
    slug: "rate-limiter",
    title: { en: "Rate Limiter", ar: "محدّد المعدّل" },
    tagline: {
      en: "Token Bucket vs Leaky Bucket — flood it with traffic and watch HTTP 429s kick in.",
      ar: "Token Bucket مقابل Leaky Bucket — أغرقه بالترافيك وشوف ردود 429 وهي تشتغل.",
    },
    category: "advanced",
    difficulty: "Intermediate",
    icon: "🚦",
    status: "ready",
  },
];

export function getModule(slug: string): ModuleMeta | undefined {
  return modules.find((m) => m.slug === slug);
}

export function modulesByCategory(categoryId: string): ModuleMeta[] {
  return modules.filter((m) => m.category === categoryId);
}
