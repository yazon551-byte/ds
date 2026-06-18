"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/providers";
import { LabShell } from "@/components/lab-shell";
import { TryIt, Aha, MissionTracker } from "@/components/labs/ux";
import type { Localized } from "@/lib/types";

type StepState = "idle" | "running" | "done" | "failed" | "compensating" | "compensated";

const STEPS: { name: Localized; comp: Localized; icon: string }[] = [
  { icon: "📝", name: { en: "Create Order", ar: "إنشاء الطلب" }, comp: { en: "Cancel Order", ar: "إلغاء الطلب" } },
  { icon: "📦", name: { en: "Reserve Inventory", ar: "حجز المخزون" }, comp: { en: "Release Inventory", ar: "تحرير المخزون" } },
  { icon: "💳", name: { en: "Charge Payment", ar: "خصم الدفع" }, comp: { en: "Refund Payment", ar: "ردّ الدفع" } },
  { icon: "🚚", name: { en: "Schedule Shipping", ar: "جدولة الشحن" }, comp: { en: "Cancel Shipping", ar: "إلغاء الشحن" } },
];
const DELAY = 750;

const L = {
  failAt: { en: "Make this step fail", ar: "اجعل هذه الخطوة تفشل" },
  none: { en: "Nothing (all succeed)", ar: "لا شيء (الكل ينجح)" },
  run: { en: "Run saga", ar: "شغّل الـ Saga" },
  running: { en: "Running…", ar: "يعمل…" },
  reset: { en: "Reset", ar: "إعادة" },
  success: { en: "✓ Saga committed — all steps succeeded.", ar: "✓ اكتمل الـ Saga — كل الخطوات نجحت." },
  rolledback: { en: "↩ Saga rolled back — a step failed, so completed steps were compensated in reverse.", ar: "↩ تراجع الـ Saga — خطوة فشلت، فعُوّضت الخطوات المكتملة بالعكس." },
  log: { en: "Transaction log", ar: "سجل المعاملات" },
  idleHint: { en: "Pick a step to fail (or none) and run the saga.", ar: "اختر خطوة لتفشل (أو لا شيء) وشغّل الـ Saga." },
  forward: { en: "Forward transaction", ar: "معاملة أمامية" },
  compensate: { en: "Compensating transaction", ar: "معاملة تعويضية" },
  about: { en: "A Saga splits one distributed transaction into a chain of local steps. There's no global lock — instead, if any step fails, each already-completed step is undone by its own compensating action, in reverse order. This keeps services consistent without holding locks across the network.", ar: "يقسّم الـ Saga معاملة موزّعة واحدة إلى سلسلة خطوات محلية. لا قفل عام — بدلاً من ذلك، إن فشلت خطوة، تُلغى كل خطوة مكتملة عبر إجرائها التعويضي بالترتيب العكسي. هذا يحافظ على اتساق الخدمات دون أقفال عبر الشبكة." },
} satisfies Record<string, Localized>;

type LogKind = "do" | "ok" | "fail" | "comp" | "compdone";
interface LogEntry { seq: number; kind: LogKind; i: number; }

const stateStyle: Record<StepState, string> = {
  idle: "border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/[0.03] opacity-70",
  running: "border-indigo-400 ring-2 ring-indigo-400/40 bg-indigo-500/5",
  done: "border-emerald-400/60 bg-emerald-500/10",
  failed: "border-rose-400 ring-2 ring-rose-400/40 bg-rose-500/10",
  compensating: "border-amber-400 ring-2 ring-amber-400/40 bg-amber-500/10",
  compensated: "border-amber-300/50 bg-amber-500/5",
};
const stateIcon: Record<StepState, string> = { idle: "", running: "⏳", done: "✓", failed: "✕", compensating: "↩", compensated: "↩ ✓" };

export function SagaLab() {
  const { lang } = useApp();
  const tr = (o: Localized) => o[lang];

  const [failAt, setFailAt] = useState(2);
  const [states, setStates] = useState<StepState[]>(() => STEPS.map(() => "idle"));
  const [status, setStatus] = useState<"idle" | "running" | "success" | "rolledback">("idle");
  const [log, setLog] = useState<LogEntry[]>([]);

  // ── gamification: commit, roll back, and fully unwind ───────────────
  const [missions, setMissions] = useState({ committed: false, rolledback: false, fullUnwind: false });
  const allDone = missions.committed && missions.rolledback && missions.fullUnwind;

  const failAtRef = useRef(failAt);
  useEffect(() => void (failAtRef.current = failAt), [failAt]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const seqRef = useRef(0);

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
  useEffect(() => () => clearTimers(), []);

  const setStep = (i: number, s: StepState) => setStates((prev) => prev.map((v, idx) => (idx === i ? s : v)));
  const addLog = (kind: LogKind, i: number) => setLog((prev) => [...prev, { seq: seqRef.current++, kind, i }]);
  const later = (fn: () => void) => { timersRef.current.push(setTimeout(fn, DELAY)); };

  // Recursive timed steppers — plain (hoisted) functions so they can call
  // themselves; only ever invoked from event handlers / timeouts.
  function markRolledBack() {
    setMissions((m) => {
      const next = { ...m };
      next.rolledback = true;
      if (failAtRef.current === STEPS.length - 1) next.fullUnwind = true;
      return next.rolledback === m.rolledback && next.fullUnwind === m.fullUnwind ? m : next;
    });
  }

  function compensate(j: number) {
    if (j < 0) { setStatus("rolledback"); markRolledBack(); return; }
    setStep(j, "compensating");
    addLog("comp", j);
    later(() => { setStep(j, "compensated"); addLog("compdone", j); compensate(j - 1); });
  }

  function forward(i: number) {
    setStep(i, "running");
    addLog("do", i);
    later(() => {
      if (failAtRef.current === i) {
        setStep(i, "failed");
        addLog("fail", i);
        if (i - 1 >= 0) compensate(i - 1);
        else { setStatus("rolledback"); markRolledBack(); }
      } else {
        setStep(i, "done");
        addLog("ok", i);
        if (i < STEPS.length - 1) forward(i + 1);
        else { setStatus("success"); setMissions((m) => (m.committed ? m : { ...m, committed: true })); }
      }
    });
  }

  function run() {
    clearTimers();
    seqRef.current = 0;
    setStates(STEPS.map(() => "idle"));
    setLog([]);
    setStatus("running");
    forward(0);
  }

  function reset() {
    clearTimers();
    setStates(STEPS.map(() => "idle"));
    setLog([]);
    setStatus("idle");
  }

  const logText = (e: LogEntry): string => {
    const step = STEPS[e.i];
    const n = tr(step.name);
    const c = tr(step.comp);
    if (e.kind === "do") return lang === "ar" ? `▶ تنفيذ: ${n}` : `▶ run: ${n}`;
    if (e.kind === "ok") return lang === "ar" ? `✓ نجح: ${n}` : `✓ ok: ${n}`;
    if (e.kind === "fail") return lang === "ar" ? `✕ فشل: ${n}` : `✕ failed: ${n}`;
    if (e.kind === "comp") return lang === "ar" ? `↩ تعويض: ${c}` : `↩ compensate: ${c}`;
    return lang === "ar" ? `↩ تمّ التعويض: ${c}` : `↩ compensated: ${c}`;
  };

  return (
    <LabShell
      icon="🧾"
      title={{ en: "Saga Coordinator", ar: "منسّق الـ Saga" }}
      difficulty="Expert"
      intro={{
        en: "The problem: a checkout touches four separate services — order, inventory, payment, shipping — each with its own database. You can't wrap them in one transaction, and holding a lock across all of them over the network would be a nightmare. So what happens if payment succeeds but shipping fails? The Saga pattern: run them as a chain of local steps, and if any step fails, undo the completed ones with compensating actions (refund, release, cancel) in reverse. Run the three experiments below.",
        ar: "المشكلة: عملية الشراء بتلمس أربع خدمات منفصلة — الطلب، المخزون، الدفع، الشحن — كل وحدة إلها قاعدة بياناتها. ما فيك تلفّهم بمعاملة وحدة، وإمساك قفل عبر كلهم على الشبكة كابوس. فشو بيصير إذا الدفع نجح بس الشحن فشل؟ نمط الـ Saga: شغّلهم كسلسلة خطوات محلية، وإذا فشلت خطوة، تراجَع عن المكتملة بإجراءات تعويضية (ردّ، تحرير، إلغاء) بالعكس. جرّب التجارب الثلاث تحت.",
      }}
    >
      {/* ── Sticky mission tracker ────────────────────────────── */}
      <MissionTracker
        title="Experiments"
        missions={[
          { label: "Commit (all succeed)", done: missions.committed },
          { label: "Force a rollback", done: missions.rolledback },
          { label: "Fail the last step", done: missions.fullUnwind },
        ]}
      />

      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{tr(L.failAt)}</span>
          <select value={failAt} onChange={(e) => setFailAt(Number(e.target.value))} disabled={status === "running"} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400 disabled:opacity-50 dark:border-white/10 dark:bg-[#0d1322] dark:text-slate-100">
            <option value={-1}>{tr(L.none)}</option>
            {STEPS.map((s, i) => <option key={i} value={i}>{i + 1}. {tr(s.name)}</option>)}
          </select>
        </label>
        <button type="button" onClick={run} disabled={status === "running"} className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50">
          {status === "running" ? tr(L.running) : `▶ ${tr(L.run)}`}
        </button>
        <button type="button" onClick={reset} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5">↺ {tr(L.reset)}</button>
      </div>

      <TryIt
        items={[
          <>Set <b>{tr(L.failAt)}</b> to <b>{tr(L.none)}</b> and press <b>▶ {tr(L.run)}</b> — all four steps go green.</>,
          <>Now set it to fail on <b>3. {tr(STEPS[2].name)}</b> and run — watch steps 1–2 undo in reverse (↩).</>,
          <>Set it to fail on the <b>last</b> step (<b>4. {tr(STEPS[3].name)}</b>) — every earlier step compensates.</>,
        ]}
      />

      {/* ── Steps ────────────────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={i} className={["flex flex-col items-center gap-1 rounded-xl border p-4 text-center transition-all duration-200", stateStyle[states[i]]].join(" ")}>
            <span className="text-2xl">{s.icon}</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{tr(s.name)}</span>
            <span className="min-h-5 text-sm">
              {states[i] === "running" && <span className="text-indigo-500">{stateIcon.running}</span>}
              {states[i] === "done" && <span className="text-emerald-500">{stateIcon.done}</span>}
              {states[i] === "failed" && <span className="font-bold text-rose-500">{stateIcon.failed}</span>}
              {(states[i] === "compensating" || states[i] === "compensated") && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{stateIcon[states[i]]} {tr(s.comp)}</span>}
            </span>
          </div>
        ))}
      </div>

      {/* ── Status ───────────────────────────────────────────── */}
      <div className="mt-4 text-center">
        {status === "success" && <span className="inline-block rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">{tr(L.success)}</span>}
        {status === "rolledback" && <span className="inline-block rounded-lg bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400">{tr(L.rolledback)}</span>}
        {status === "idle" && <span className="text-sm text-slate-400">{tr(L.idleHint)}</span>}
      </div>

      <Aha show={missions.committed}>
        Each step ran on its own service and committed locally — no global lock held across the
        network the whole time. When every step succeeds, the saga is simply done. The catch
        is that there&apos;s a window where some steps are committed and others aren&apos;t yet, which is
        exactly what compensation handles.
      </Aha>
      <Aha show={missions.rolledback}>
        A step failed, so the saga walked <i>backwards</i> and ran each completed step&apos;s
        compensating action in reverse order. Note these aren&apos;t a database rollback — payment
        was really charged, so its compensation is a real <i>refund</i>. Saga gives you eventual
        consistency through business-level undo, not ACID atomicity. (Fail step 1 and there&apos;s
        nothing to undo — compensation only touches <i>completed</i> steps.)
      </Aha>

      {/* ── Log ──────────────────────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tr(L.log)}</h3>
        {log.length === 0 ? <p className="text-sm text-slate-400">—</p> : (
          <ul className="flex flex-col gap-1 font-mono text-xs">
            {log.map((e) => (
              <li key={e.seq} className={
                e.kind === "fail" ? "text-rose-500" : e.kind === "ok" ? "text-emerald-600 dark:text-emerald-400" : e.kind === "comp" || e.kind === "compdone" ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"
              }>{logText(e)}</li>
            ))}
          </ul>
        )}
      </div>

      {/* ── About ────────────────────────────────────────────── */}
      <p className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 text-sm leading-relaxed text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
        {tr(L.about)}
      </p>

      {/* ── Closing: what to explore next ─────────────────────── */}
      <section
        className={[
          "mt-8 rounded-2xl border p-6 transition-colors",
          allDone
            ? "border-emerald-400/40 bg-emerald-500/5"
            : "border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]",
        ].join(" ")}
      >
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {allDone ? "🎉 You've committed, rolled back, and fully unwound a saga." : "How do the steps actually talk to each other?"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          A saga is usually wired together with events, and each step is a remote call that can
          fail or time out — so it leans on the patterns from earlier modules. These continue
          the story:
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            {
              fix: "Messaging & Pub/Sub",
              desc: "Each saga step often emits an event that triggers the next — the queue is the saga's backbone.",
              href: "/labs/messaging",
            },
            {
              fix: "Fault Tolerance",
              desc: "A failing step needs timeouts, retries and idempotency before you give up and compensate.",
              href: "/labs/fault-tolerance",
            },
          ].map((s) => (
            <Link
              key={s.fix}
              href={s.href}
              className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-indigo-400/40"
            >
              <p className="font-semibold text-slate-900 dark:text-white">{s.fix} →</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </LabShell>
  );
}
