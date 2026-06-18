import type { Localized } from "@/lib/types";

export type Protocol = "rmi" | "rest" | "grpc";

export interface ProtoConfig {
  id: Protocol;
  name: string;
  color: string;
  format: Localized; // serialization format
  transport: string; // wire protocol
  networkMs: number; // one-way network time
  payloadBytes: number; // example payload size
  note: Localized;
}

export const protocols: ProtoConfig[] = [
  {
    id: "rmi",
    name: "Java RMI",
    color: "#f59e0b",
    format: { en: "Java serialization", ar: "تسلسل Java" },
    transport: "JRMP / TCP",
    networkMs: 500,
    payloadBytes: 87,
    note: {
      en: "Java-to-Java only. Carries class metadata, so payloads are bulky. Auto-generates stub & skeleton.",
      ar: "بين Java و Java فقط. يحمل بيانات الأصناف فيكبر الحِمل. يولّد الـ stub والـ skeleton تلقائياً.",
    },
  },
  {
    id: "rest",
    name: "REST",
    color: "#22d3ee",
    format: { en: "JSON (text)", ar: "JSON (نصّي)" },
    transport: "HTTP/1.1",
    networkMs: 600,
    payloadBytes: 41,
    note: {
      en: "Universal and human-readable. Text JSON is larger and slower to parse; HTTP/1.1 can head-of-line block.",
      ar: "عالمي ومقروء للبشر. JSON النصّي أكبر وأبطأ بالتحليل؛ وHTTP/1.1 قد يسبب انسداد رأس الطابور.",
    },
  },
  {
    id: "grpc",
    name: "gRPC",
    color: "#34d399",
    format: { en: "Protobuf (binary)", ar: "Protobuf (ثنائي)" },
    transport: "HTTP/2",
    networkMs: 300,
    payloadBytes: 13,
    note: {
      en: "Compact binary on multiplexed HTTP/2 — smallest and fastest. Strict .proto contract; great for internal microservices.",
      ar: "ثنائي مدمج فوق HTTP/2 متعدّد القنوات — الأصغر والأسرع. عقد .proto صارم؛ ممتاز للخدمات الداخلية.",
    },
  },
];

export function protoConfig(id: Protocol): ProtoConfig {
  return protocols.find((p) => p.id === id) ?? protocols[0];
}
