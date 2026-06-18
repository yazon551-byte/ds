"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/providers";
import { LabShell } from "@/components/lab-shell";
import { protocols, protoConfig, type Protocol } from "@/lib/labs/remote-invocation";
import type { Localized } from "@/lib/types";

const L = {
  protocol: { en: "Protocol", ar: "البروتوكول" },
  dropNet: { en: "Drop network", ar: "قطع الشبكة" },
  send: { en: "Send call", ar: "أرسل النداء" },
  sending: { en: "Calling…", ar: "جارٍ النداء…" },
  reset: { en: "Reset", ar: "إعادة" },
  client: { en: "Client", ar: "العميل" },
  server: { en: "Server", ar: "الخادم" },
  network: { en: "Network", ar: "الشبكة" },
  result: { en: "Result returned", ar: "عادت النتيجة" },
  error: { en: "ConnectException — server unreachable (partial failure)", ar: "ConnectException — الخادم غير قابل للوصول (فشل جزئي)" },
  rtt: { en: "Round-trip time", ar: "زمن الذهاب والإياب" },
  payload: { en: "Payload size", ar: "حجم الحمولة" },
  format: { en: "Format", ar: "الصيغة" },
  transport: { en: "Transport", ar: "النقل" },
  latency1: { en: "One-way latency", ar: "زمن اتجاه واحد" },
  compare: { en: "Protocol comparison", ar: "مقارنة البروتوكولات" },
  smaller: { en: "smaller than REST", ar: "أصغر من REST" },
  idleHint: { en: "Press “Send call” to watch a request travel through the stub, the network, and back.", ar: "اضغط «أرسل النداء» لمشاهدة الطلب يسافر عبر الـ stub والشبكة ويعود." },
} satisfies Record<string, Localized>;

interface Stage {
  key: string;
  side: "client" | "net" | "server";
  ms: number;
  label: Localized;
}

function buildStages(networkMs: number): Stage[] {
  return [
    { key: "invoke", side: "client", ms: 200, label: { en: "Client invokes method", ar: "العميل ينادي الدالة" } },
    { key: "marshal", side: "client", ms: 300, label: { en: "Stub marshals args", ar: "الـ stub يُسلسل المعطيات" } },
    { key: "net-req", side: "net", ms: networkMs, label: { en: "Network → request", ar: "الشبكة → الطلب" } },
    { key: "unmarshal-s", side: "server", ms: 250, label: { en: "Skeleton unmarshals", ar: "الـ skeleton يفكّ التسلسل" } },
    { key: "execute", side: "server", ms: 600, label: { en: "Server executes", ar: "الخادم ينفّذ" } },
    { key: "marshal-r", side: "server", ms: 300, label: { en: "Marshal result", ar: "تسلسل النتيجة" } },
    { key: "net-resp", side: "net", ms: networkMs, label: { en: "Network ← response", ar: "الشبكة ← الرد" } },
    { key: "unmarshal-c", side: "client", ms: 250, label: { en: "Stub unmarshals → result", ar: "الـ stub يفكّ → النتيجة" } },
  ];
}

const NET_REQ_INDEX = 2;

const sideTint: Record<Stage["side"], string> = {
  client: "border-indigo-300/50 bg-indigo-500/5",
  net: "border-cyan-300/50 bg-cyan-500/5",
  server: "border-violet-300/50 bg-violet-500/5",
};

type Status = "idle" | "running" | "done" | "failed";

export function RemoteInvocationLab() {
  const { lang } = useApp();
  const tr = (o: Localized) => o[lang];

  const [protocol, setProtocol] = useState<Protocol>("rmi");
  const [dropNet, setDropNet] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);

  const cfg = protoConfig(protocol);
  const stages = useMemo(() => buildStages(cfg.networkMs), [cfg.networkMs]);
  const cum = useMemo(() => {
    const arr: number[] = [];
    let t = 0;
    for (const s of stages) { t += s.ms; arr.push(t); }
    return arr;
  }, [stages]);
  const total = cum[cum.length - 1];
  const failAt = cum[NET_REQ_INDEX];

  const startRef = useRef(0);
  const dropRef = useRef(dropNet);
  const totalRef = useRef(total);
  const failAtRef = useRef(failAt);
  useEffect(() => void (dropRef.current = dropNet), [dropNet]);
  useEffect(() => void (totalRef.current = total), [total]);
  useEffect(() => void (failAtRef.current = failAt), [failAt]);

  const rafRef = useRef(0);
  const send = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    startRef.current = performance.now();
    setStatus("running");
    setElapsed(0);
    const loop = () => {
      const e = performance.now() - startRef.current;
      if (dropRef.current && e >= failAtRef.current) {
        setElapsed(failAtRef.current);
        setStatus("failed");
        return;
      }
      if (e >= totalRef.current) {
        setElapsed(totalRef.current);
        setStatus("done");
        return;
      }
      setElapsed(e);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setStatus("idle");
    setElapsed(0);
  }, []);

  // which stage is active
  let activeIndex = -1;
  if (status === "running") {
    activeIndex = cum.findIndex((c) => elapsed < c);
    if (activeIndex === -1) activeIndex = stages.length - 1;
  } else if (status === "failed") {
    activeIndex = NET_REQ_INDEX;
  } else if (status === "done") {
    activeIndex = stages.length - 1;
  }

  const grpc = protoConfig("grpc");
  const rest = protoConfig("rest");
  const grpcSmaller = Math.round((1 - grpc.payloadBytes / rest.payloadBytes) * 100);

  return (
    <LabShell
      icon="📡"
      title={{ en: "Remote Invocation", ar: "الاستدعاء عن بُعد" }}
      difficulty="Intermediate"
      intro={{
        en: "Watch a remote call travel: client → stub (marshal) → network → server skeleton → execute → back. Switch between Java RMI, REST and gRPC to compare payload size and speed — and drop the network to trigger the dreaded partial failure.",
        ar: "شاهد نداءً بعيداً وهو يسافر: العميل → الـ stub (تسلسل) → الشبكة → skeleton الخادم → تنفيذ → عودة. بدّل بين Java RMI و REST و gRPC لمقارنة حجم الحمولة والسرعة — واقطع الشبكة لتفجير الفشل الجزئي.",
      }}
    >
      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{tr(L.protocol)}</span>
          <div className="flex gap-1.5">
            {protocols.map((p) => (
              <button key={p.id} type="button" onClick={() => { setProtocol(p.id); reset(); }} className={["rounded-lg px-3 py-2 text-sm font-medium transition-colors", protocol === p.id ? "text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"].join(" ")} style={protocol === p.id ? { background: p.color } : undefined}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => setDropNet((v) => !v)} className={["rounded-lg px-3 py-2 text-sm font-semibold transition-colors", dropNet ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"].join(" ")}>
          {dropNet ? `✕ ${tr(L.dropNet)}: ${lang === "ar" ? "مفعّل" : "on"}` : `${tr(L.dropNet)}`}
        </button>
        <button type="button" onClick={send} disabled={status === "running"} className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-transform hover:scale-[1.03] disabled:opacity-50">
          {status === "running" ? tr(L.sending) : `▶ ${tr(L.send)}`}
        </button>
        <button type="button" onClick={reset} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5">↺ {tr(L.reset)}</button>
      </div>

      {/* ── Pipeline ─────────────────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mb-3 flex justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span>🖥️ {tr(L.client)}</span>
          <span>🌐 {tr(L.network)}</span>
          <span>🗄️ {tr(L.server)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {stages.map((s, i) => {
            const active = i === activeIndex;
            const failedHere = status === "failed" && i === NET_REQ_INDEX;
            const done = status === "done" || (status === "running" && i < activeIndex) || (status === "failed" && i < NET_REQ_INDEX);
            return (
              <div
                key={s.key}
                className={[
                  "flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition-all duration-200",
                  failedHere ? "border-rose-400 bg-rose-500/15 ring-2 ring-rose-400/40"
                    : active ? "border-indigo-400 ring-2 ring-indigo-400/40 scale-105 " + sideTint[s.side]
                      : done ? "border-emerald-300/50 bg-emerald-500/5"
                        : sideTint[s.side] + " opacity-60",
                ].join(" ")}
              >
                <span className="text-[11px] font-medium leading-tight text-slate-700 dark:text-slate-200">{tr(s.label)}</span>
                {done && !active && <span className="text-emerald-500">✓</span>}
                {failedHere && <span className="text-rose-500">✕</span>}
              </div>
            );
          })}
        </div>

        {/* result line */}
        <div className="mt-4 text-center">
          {status === "done" && (
            <span className="inline-block rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ {tr(L.result)} · {tr(L.rtt)}: {(total / 1000).toFixed(1)}s
            </span>
          )}
          {status === "failed" && (
            <span className="inline-block rounded-lg bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
              ✕ {tr(L.error)}
            </span>
          )}
          {status === "idle" && <span className="text-sm text-slate-400">{tr(L.idleHint)}</span>}
          {status === "running" && <span className="text-sm text-slate-400">{tr(L.sending)}</span>}
        </div>
      </div>

      {/* ── Current protocol stats ───────────────────────────── */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-lg font-bold text-slate-900 dark:text-white">{tr(cfg.format)}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{tr(L.format)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-lg font-bold text-slate-900 dark:text-white">{cfg.transport}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{tr(L.transport)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-lg font-bold" style={{ color: cfg.color }}>{cfg.payloadBytes} B</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{tr(L.payload)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-lg font-bold text-slate-900 dark:text-white">{cfg.networkMs}ms</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{tr(L.latency1)}</div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{tr(cfg.note)}</p>

      {/* ── Comparison table ─────────────────────────────────── */}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tr(L.compare)}</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-400">
              <th className="py-2 pe-4">{tr(L.protocol)}</th>
              <th className="py-2 pe-4">{tr(L.format)}</th>
              <th className="py-2 pe-4">{tr(L.transport)}</th>
              <th className="py-2 pe-4">{tr(L.payload)}</th>
              <th className="py-2">{tr(L.latency1)}</th>
            </tr>
          </thead>
          <tbody>
            {protocols.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 dark:border-white/5">
                <td className="py-2 pe-4 font-semibold" style={{ color: p.color }}>{p.name}</td>
                <td className="py-2 pe-4 text-slate-600 dark:text-slate-300">{tr(p.format)}</td>
                <td className="py-2 pe-4 text-slate-600 dark:text-slate-300">{p.transport}</td>
                <td className="py-2 pe-4 text-slate-600 dark:text-slate-300">{p.payloadBytes} B</td>
                <td className="py-2 text-slate-600 dark:text-slate-300">{p.networkMs}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          gRPC payload is <b className="text-emerald-600 dark:text-emerald-400">~{grpcSmaller}%</b> {tr(L.smaller)}.
        </p>
      </div>
    </LabShell>
  );
}
