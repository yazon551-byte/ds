import type { Localized } from "@/lib/types";

export interface InfoCard {
  key: string;
  title: Localized;
  body: Localized;
}

export const replicationInfo: InfoCard[] = [
  {
    key: "active",
    title: { en: "Active replication", ar: "النسخ النشط" },
    body: {
      en: "Every replica processes every request in the same order (state-machine replication, kept in step by consensus like Raft/Paxos). All copies stay identical → strong consistency and instant failover, but every node does all the work (costly).",
      ar: "كل نسخة تعالج كل طلب بنفس الترتيب (نسخ آلة الحالة، متزامن عبر توافق مثل Raft/Paxos). كل النسخ متطابقة → اتساق قوي وتبديل فوري، لكن كل عقدة تنفّذ كل العمل (مكلف).",
    },
  },
  {
    key: "passive",
    title: { en: "Passive replication (primary-backup)", ar: "النسخ الخامل (أساسي-احتياطي)" },
    body: {
      en: "Only the primary handles writes, then ships the changes to follower replicas. On primary failure, a backup is promoted (leader election). Cheaper, but followers can lag behind.",
      ar: "الأساسي وحده يعالج الكتابة ثم يرسل التغييرات إلى النسخ التابعة. عند فشل الأساسي تُرقَّى نسخة احتياطية (انتخاب قائد). أرخص، لكن التابعين قد يتأخّرون.",
    },
  },
  {
    key: "sync",
    title: { en: "Synchronous", ar: "متزامن" },
    body: {
      en: "A write is acknowledged only after replicas have applied it. No stale reads and no data loss on failover — but writes are slower (you wait for the slowest replica).",
      ar: "لا تُؤكَّد الكتابة إلا بعد أن تطبّقها النسخ. لا قراءات قديمة ولا فقدان بيانات عند التبديل — لكن الكتابة أبطأ (تنتظر أبطأ نسخة).",
    },
  },
  {
    key: "async",
    title: { en: "Asynchronous", ar: "غير متزامن" },
    body: {
      en: "The write is acknowledged immediately; replicas catch up afterwards. Fast writes, but reads from a lagging replica can be stale — and a failover can lose writes that hadn't replicated yet.",
      ar: "تُؤكَّد الكتابة فوراً ثم تلحق النسخ لاحقاً. كتابة سريعة، لكن القراءة من نسخة متأخّرة قد تكون قديمة — والتبديل قد يفقد كتابات لم تُنسخ بعد.",
    },
  },
];
