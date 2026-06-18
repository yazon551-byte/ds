import type { Localized } from "@/lib/types";

export interface InfoCard {
  key: string;
  title: Localized;
  body: Localized;
}

export const messagingInfo: InfoCard[] = [
  {
    key: "pubsub",
    title: { en: "Publish / Subscribe", ar: "النشر / الاشتراك" },
    body: {
      en: "Publishers don't call subscribers directly — they send messages to a broker (topic). Senders and receivers are decoupled in time: a subscriber can be slow or briefly down without blocking the publisher.",
      ar: "الناشرون لا ينادون المشتركين مباشرة — يرسلون رسائل إلى وسيط (topic). المرسِل والمستقبِل منفصلان زمنياً: قد يتأخّر مشترك أو يتوقّف قليلاً دون أن يعطّل الناشر.",
    },
  },
  {
    key: "fanout",
    title: { en: "Fan-out", ar: "التوزيع المتعدّد" },
    body: {
      en: "One published message is delivered to every subscriber — each gets its own copy and processes it independently. (A point-to-point queue, by contrast, gives each message to only one consumer.)",
      ar: "الرسالة المنشورة الواحدة تُسلَّم لكل مشترك — كلٌّ يأخذ نسخته ويعالجها باستقلال. (بينما الطابور نقطة-لنقطة يعطي كل رسالة لمستهلك واحد فقط.)",
    },
  },
  {
    key: "retry",
    title: { en: "Retry", ar: "إعادة المحاولة" },
    body: {
      en: "If a subscriber fails to process a message (a NACK), the broker re-delivers it a few times — transient errors often clear on the next try.",
      ar: "إن فشل مشترك في معالجة رسالة (NACK)، يعيد الوسيط تسليمها بضع مرّات — كثير من الأعطال العابرة تزول بالمحاولة التالية.",
    },
  },
  {
    key: "dlq",
    title: { en: "Dead-Letter Queue (DLQ)", ar: "طابور الرسائل الميتة (DLQ)" },
    body: {
      en: "A 'poison' message that keeps failing after the retry limit is moved aside to a DLQ, so it stops blocking the pipeline. You inspect and fix it later.",
      ar: "الرسالة «السامّة» التي تستمر بالفشل بعد حدّ المحاولات تُنحَّى إلى DLQ كي لا تعطّل الأنبوب. تفحصها وتصلحها لاحقاً.",
    },
  },
];
