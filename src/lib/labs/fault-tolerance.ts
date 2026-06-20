import type { Localized } from "@/lib/types";

export type BreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface BreakerStateInfo {
  id: BreakerState;
  label: Localized;
  desc: Localized;
  color: string; // tailwind text/border accent base
}

export const breakerStates: BreakerStateInfo[] = [
  {
    id: "CLOSED",
    label: { en: "Closed", ar: "مغلق" },
    desc: {
      en: "Normal operation. Requests flow through to the service, and the breaker counts consecutive failures.",
      ar: "تشغيل طبيعي. الطلبات تمرّ إلى الخدمة، والقاطع يعدّ الأعطال المتتالية.",
    },
    color: "emerald",
  },
  {
    id: "OPEN",
    label: { en: "Open", ar: "مفتوح" },
    desc: {
      en: "Too many failures. Calls are blocked and fail fast (a fallback is served) so the struggling service can recover. Waits out a cooldown.",
      ar: "أعطال كثيرة. الطلبات محجوبة وتفشل فوراً (يُقدَّم بديل) كي تتعافى الخدمة المتعثّرة. ينتظر مهلة تهدئة.",
    },
    color: "rose",
  },
  {
    id: "HALF_OPEN",
    label: { en: "Half-Open", ar: "نصف مفتوح" },
    desc: {
      en: "After the cooldown, a single trial request is let through. If it succeeds → Closed; if it fails → back to Open.",
      ar: "بعد التهدئة، يُسمح بطلب تجريبي واحد. إن نجح → مغلق؛ وإن فشل → يعود مفتوحاً.",
    },
    color: "amber",
  },
];

export function breakerStateInfo(s: BreakerState): BreakerStateInfo {
  return breakerStates.find((x) => x.id === s) ?? breakerStates[0];
}

/** Exponential backoff with optional ±25% jitter. retryIndex is 0-based. */
export function backoffDelay(
  retryIndex: number,
  baseMs: number,
  capMs: number,
  jitter: boolean,
): number {
  const raw = Math.min(capMs, baseMs * Math.pow(2, retryIndex));
  if (!jitter) return Math.round(raw);
  const factor = 0.75 + Math.random() * 0.5; // 0.75x – 1.25x
  return Math.round(raw * factor);
}

export interface PatternInfo {
  key: string;
  title: Localized;
  body: Localized;
}

export const patterns: PatternInfo[] = [
  {
    key: "breaker",
    title: { en: "Circuit Breaker", ar: "قاطع الدارة" },
    body: {
      en: "Wraps a risky call. After N consecutive failures it 'trips' to OPEN and fails fast instead of hanging, giving the downstream service room to recover. Like a home electrical breaker.",
      ar: "يغلّف نداءً خطِراً. بعد N أعطال متتالية «يقفز» إلى مفتوح ويفشل فوراً بدل التعليق، ليعطي الخدمة فرصة للتعافي. مثل قاطع الكهرباء بالبيت.",
    },
  },
  {
    key: "retry",
    title: { en: "Retry + Backoff + Jitter", ar: "إعادة المحاولة + التأخّر + التشويش" },
    body: {
      en: "Retry a failed call, waiting longer each time (1s → 2s → 4s…), capped at a maximum. Jitter adds randomness so thousands of clients don't retry in sync (the thundering herd).",
      ar: "أعد المحاولة مع انتظار أطول كل مرة (1ث → 2ث → 4ث…) بحدّ أقصى. التشويش يضيف عشوائية كي لا يعيد آلاف العملاء المحاولة معاً (قطيع الرعد).",
    },
  },
  {
    key: "fallback",
    title: { en: "Fallback", ar: "الخطة البديلة" },
    body: {
      en: "When the call can't succeed, return a sensible 'Plan B' — cached or default data — instead of an error. A degraded answer beats a failed one.",
      ar: "عندما يتعذّر نجاح النداء، أعِد «خطة بديلة» معقولة — بيانات مخزّنة أو افتراضية — بدل خطأ. إجابة منقوصة أفضل من فشل.",
    },
  },
  {
    key: "heartbeat",
    title: { en: "Heartbeat / Health Check", ar: "النبض / فحص الصحّة" },
    body: {
      en: "A monitor pings the service on a fixed interval. Miss too many recent beats and it's flagged UNHEALTHY (here that's a status indicator; in production it would be pulled out of rotation), and marked healthy again once beats recover.",
      ar: "مراقب ينبض للخدمة على فترات ثابتة. إن غابت نبضات حديثة كثيرة تُعلَّم «غير سليمة» (هون مؤشّر حالة فقط؛ بالإنتاج كانت تُخرَج من الخدمة)، وتُعلَّم سليمة لمّا ترجع النبضات.",
    },
  },
];
