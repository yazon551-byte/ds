"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/providers";
import { LabShell } from "@/components/lab-shell";
import { TryIt, Aha, MissionTracker } from "@/components/labs/ux";
import type { Localized } from "@/lib/types";

const N = 5;
const MAJORITY = 3;
const HB = 700; // leader heartbeat interval (ms)
const CAND_DECIDE = 500; // candidate waits this long to tally votes
const randTimeout = () => 2500 + Math.random() * 2000;

type RState = "follower" | "candidate" | "leader" | "down";
interface LogEntry { term: number; value: number; }
interface RNode {
  id: number;
  state: RState;
  term: number;
  votedForTerm: number;
  electionAt: number;
  decideAt: number;
  votes: number;
  log: LogEntry[];
  commit: number;
}

const L = {
  propose: { en: "Propose value", ar: "اقترح قيمة" },
  killHint: { en: "Click a node to kill or revive it.", ar: "انقر عقدة لإيقافها أو تشغيلها." },
  reset: { en: "Reset", ar: "إعادة" },
  pause: { en: "Pause", ar: "إيقاف" },
  run: { en: "Run", ar: "تشغيل" },
  term: { en: "term", ar: "فترة" },
  log: { en: "log", ar: "سجل" },
  committed: { en: "committed", ar: "مُثبَّت" },
  leader: { en: "LEADER", ar: "قائد" },
  candidate: { en: "CANDIDATE", ar: "مرشّح" },
  follower: { en: "FOLLOWER", ar: "تابع" },
  down: { en: "DOWN", ar: "متوقف" },
  committedLog: { en: "Committed log (replicated state machine)", ar: "السجل المُثبَّت (آلة الحالة المنسوخة)" },
  events: { en: "Cluster events", ar: "أحداث العنقود" },
  empty: { en: "Watch the cluster elect a leader, then propose values to replicate.", ar: "شاهد العنقود ينتخب قائداً، ثم اقترح قيماً لتُنسخ." },
  about: { en: "Raft keeps a cluster agreeing on one ordered log despite failures. Followers wait a random time for a leader's heartbeat; if it's silent they become candidates, bump the term, and ask for votes. A candidate that wins a MAJORITY (3 of 5) becomes leader and replicates the log. Kill the leader and watch a new election — quorum is why an odd number of nodes survives failures.", ar: "يبقي Raft العنقود متّفقاً على سجل واحد مرتّب رغم الأعطال. التابعون ينتظرون نبض القائد لوقت عشوائي؛ فإن صمت يصبحون مرشّحين، يرفعون الفترة، ويطلبون أصواتاً. المرشّح الذي ينال الأغلبية (3 من 5) يصبح قائداً وينسخ السجل. أوقف القائد وشاهد انتخاباً جديداً — النِّصاب هو سبب نجاة عدد فردي من العُقَد." },
} satisfies Record<string, Localized>;

type EvKind = "campaign" | "elected" | "lost" | "down" | "up" | "propose" | "noleader";
interface Ev { seq: number; kind: EvKind; node?: number; term?: number; value?: number; }

interface NodeView { id: number; state: RState; term: number; logLen: number; commit: number; votes: number; }
interface Snapshot { nodes: NodeView[]; committed: LogEntry[]; events: Ev[]; hasLeader: boolean; }

function buildNodes(): RNode[] {
  return Array.from({ length: N }, (_, i) => ({
    id: i + 1, state: "follower", term: 0, votedForTerm: -1, electionAt: 0, decideAt: 0, votes: 0, log: [], commit: 0,
  }));
}

function initialSnapshot(): Snapshot {
  return {
    nodes: buildNodes().map((n) => ({ id: n.id, state: n.state, term: n.term, logLen: 0, commit: 0, votes: 0 })),
    committed: [],
    events: [],
    hasLeader: false,
  };
}

const stateStyle: Record<RState, string> = {
  leader: "border-indigo-400 ring-2 ring-indigo-400/40 bg-indigo-500/10",
  candidate: "border-amber-400 ring-2 ring-amber-400/40 bg-amber-500/10",
  follower: "border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]",
  down: "border-rose-400/50 bg-rose-500/5 opacity-60",
};

export function RaftLab() {
  const { lang } = useApp();
  const tr = (o: Localized) => o[lang];

  const [running, setRunning] = useState(false); // start paused — user presses ▶ to kick off the election
  const runningRef = useRef(running);
  useEffect(() => void (runningRef.current = running), [running]);

  // ── gamification: elect, replicate, survive a leader crash ──────────
  const [missions, setMissions] = useState({ elected: false, replicated: false, crash: false });
  const allDone = missions.elected && missions.replicated && missions.crash;

  const nodesRef = useRef<RNode[]>(buildNodes());
  const committedRef = useRef<LogEntry[]>([]);
  const eventsRef = useRef<Ev[]>([]);
  const seqRef = useRef(0);
  const valueRef = useRef(0);
  const lastHbRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const lastSnapRef = useRef(0);

  const [snap, setSnap] = useState<Snapshot>(initialSnapshot);

  const addEv = (kind: EvKind, extra?: Partial<Ev>) => {
    eventsRef.current.push({ seq: seqRef.current++, kind, ...extra });
    if (eventsRef.current.length > 60) eventsRef.current = eventsRef.current.slice(-60);
  };

  const buildSnapshot = useCallback((): Snapshot => {
    const nodes = nodesRef.current;
    const hasLeader = nodes.some((n) => n.state === "leader");
    return {
      nodes: nodes.map((n) => ({ id: n.id, state: n.state, term: n.term, logLen: n.log.length, commit: n.commit, votes: n.votes })),
      committed: [...committedRef.current],
      events: eventsRef.current.slice(-9).reverse(),
      hasLeader,
    };
  }, []);

  const propose = useCallback(() => {
    const leader = nodesRef.current.find((n) => n.state === "leader");
    if (!leader) { addEv("noleader"); setSnap(buildSnapshot()); return; }
    valueRef.current += 1;
    leader.log.push({ term: leader.term, value: valueRef.current });
    addEv("propose", { value: valueRef.current, term: leader.term });
    setSnap(buildSnapshot());
  }, [buildSnapshot]);

  const toggleNode = useCallback((idx: number) => {
    const node = nodesRef.current[idx];
    const now = performance.now();
    if (node.state === "down") {
      node.state = "follower";
      node.electionAt = now + randTimeout();
      node.votes = 0;
      addEv("up", { node: node.id });
    } else {
      if (node.state === "leader") setMissions((m) => (m.crash ? m : { ...m, crash: true }));
      node.state = "down";
      addEv("down", { node: node.id });
    }
    setSnap(buildSnapshot());
  }, [buildSnapshot]);

  const reset = useCallback(() => {
    nodesRef.current = buildNodes();
    committedRef.current = [];
    eventsRef.current = [];
    seqRef.current = 0;
    valueRef.current = 0;
    lastHbRef.current = 0;
    setSnap(buildSnapshot());
  }, [buildSnapshot]);

  // ── Raft loop ──────────────────────────────────────────────────────
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      lastTsRef.current = now;
      const nodes = nodesRef.current;
      const aliveCount = nodes.filter((n) => n.state !== "down").length;

      if (runningRef.current) {
        // seed initial election timeouts
        for (const n of nodes) if (n.state !== "down" && n.electionAt === 0) n.electionAt = now + randTimeout();

        const leader = nodes.find((n) => n.state === "leader");

        // leader heartbeats: reset followers, replicate log, advance commit
        if (leader) {
          if (now - lastHbRef.current >= HB) {
            lastHbRef.current = now;
            for (const f of nodes) {
              if (f === leader || f.state === "down") continue;
              f.state = "follower";
              f.term = leader.term;
              f.electionAt = now + randTimeout();
              f.decideAt = 0;
              f.votes = 0;
              f.log = leader.log.slice();
              f.commit = leader.commit;
            }
            if (aliveCount >= MAJORITY) {
              leader.commit = leader.log.length;
              committedRef.current = leader.log.slice(0, leader.commit);
              if (committedRef.current.length > 0) setMissions((m) => (m.replicated ? m : { ...m, replicated: true }));
            }
          }
        }

        // elections
        for (const n of nodes) {
          if (n.state === "down" || n.state === "leader") continue;

          if (n.state === "candidate" && now >= n.decideAt) {
            if (n.votes >= MAJORITY) {
              n.state = "leader";
              n.electionAt = Infinity;
              lastHbRef.current = 0; // heartbeat immediately next pass
              addEv("elected", { node: n.id, term: n.term });
              setMissions((m) => (m.elected ? m : { ...m, elected: true }));
            } else {
              n.state = "follower";
              n.electionAt = now + randTimeout();
              addEv("lost", { node: n.id, term: n.term });
            }
            continue;
          }

          if (n.state !== "candidate" && now >= n.electionAt) {
            // start a campaign
            n.state = "candidate";
            n.term += 1;
            n.votedForTerm = n.term;
            n.votes = 1;
            n.decideAt = now + CAND_DECIDE;
            n.electionAt = now + randTimeout();
            for (const k of nodes) {
              if (k === n || k.state === "down") continue;
              if (k.votedForTerm < n.term) {
                k.votedForTerm = n.term;
                if (k.term < n.term) k.term = n.term;
                if (k.state === "candidate") { k.state = "follower"; k.decideAt = 0; }
                k.electionAt = now + randTimeout();
                n.votes += 1;
              }
            }
            addEv("campaign", { node: n.id, term: n.term });
          }
        }
      }

      if (now - lastSnapRef.current >= 80) {
        lastSnapRef.current = now;
        setSnap(buildSnapshot());
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [buildSnapshot]);

  const evText = (e: Ev): string => {
    const a = lang === "ar";
    switch (e.kind) {
      case "campaign": return a ? `🗳 العقدة N${e.node} ترشّحت (فترة ${e.term})` : `🗳 N${e.node} started election (term ${e.term})`;
      case "elected": return a ? `👑 N${e.node} أصبحت القائد (فترة ${e.term})` : `👑 N${e.node} became leader (term ${e.term})`;
      case "lost": return a ? `↩ N${e.node} لم تنل الأغلبية` : `↩ N${e.node} failed to win majority`;
      case "down": return a ? `💥 N${e.node} توقفت` : `💥 N${e.node} went down`;
      case "up": return a ? `✓ N${e.node} عادت` : `✓ N${e.node} recovered`;
      case "propose": return a ? `📥 اقتُرحت القيمة ${e.value} (فترة ${e.term})` : `📥 proposed value ${e.value} (term ${e.term})`;
      case "noleader": return a ? `⚠ لا قائد — تعذّر اقتراح القيمة` : `⚠ no leader — can't propose`;
    }
  };

  const stateLabel = (s: RState) => (s === "leader" ? `👑 ${tr(L.leader)}` : s === "candidate" ? tr(L.candidate) : s === "down" ? tr(L.down) : tr(L.follower));

  return (
    <LabShell
      icon="🗳️"
      title={{ en: "Raft Consensus", ar: "توافق Raft" }}
      difficulty="Expert"
      intro={{
        en: "The problem from the Replication lab: when the leader dies, who takes over — and how do you stop two nodes from both believing they're in charge (split-brain)? Raft's answer is a vote. Five nodes elect ONE leader by majority; only the leader accepts writes and replicates them. Because every decision needs a majority (3 of 5), two leaders can never coexist. Run the three experiments below to drive a full election cycle.",
        ar: "المشكلة من مختبر النسخ: لمّا يموت القائد، مين بياخد محلّه — وكيف بتمنع عقدتين تظنّوا حالهم القائد بنفس الوقت (split-brain)؟ جواب Raft تصويت. خمس عُقَد بتنتخب قائد **واحد** بالأغلبية؛ القائد بس بيقبل الكتابات وبينسخها. وبما إنّ كل قرار بدّه أغلبية (3 من 5)، مستحيل يصير قائدين بنفس الوقت. جرّب التجارب الثلاث تحت لتمشّي دورة انتخاب كاملة.",
      }}
    >
      {/* ── Sticky mission tracker ────────────────────────────── */}
      <MissionTracker
        title="Experiments"
        missions={[
          { label: "Elect a leader", done: missions.elected },
          { label: "Replicate a value", done: missions.replicated },
          { label: "Kill the leader", done: missions.crash },
        ]}
      />

      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <button type="button" onClick={propose} className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25">
          📥 {tr(L.propose)}
        </button>
        <button type="button" onClick={() => setRunning((r) => !r)} className={["rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors", running ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"].join(" ")}>
          {running ? `⏸ ${tr(L.pause)}` : `▶ ${tr(L.run)}`}
        </button>
        <button type="button" onClick={reset} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5">↺ {tr(L.reset)}</button>
        <span className="text-xs text-slate-400">{tr(L.killHint)}</span>
      </div>

      <TryIt
        items={[
          <>Press <b>▶ {tr(L.run)}</b> and wait — a follower times out, campaigns, and wins <b>{MAJORITY}/{N}</b> votes to become <b>{tr(L.leader)}</b>.</>,
          <>Press <b>📥 {tr(L.propose)}</b> a few times — values replicate from the leader and appear in the committed log.</>,
          <>Click the <b>👑 {tr(L.leader)}</b> node to kill it — watch the survivors run a new election with a higher term.</>,
        ]}
      />

      {/* ── Nodes ────────────────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {snap.nodes.map((n, i) => (
          <button
            key={n.id}
            type="button"
            onClick={() => toggleNode(i)}
            className={["flex flex-col items-center gap-1 rounded-xl border p-4 text-center transition-all duration-200", stateStyle[n.state]].join(" ")}
          >
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">N{n.id}</span>
            <span className={[
              "rounded-full px-2 py-0.5 text-[10px] font-bold",
              n.state === "leader" ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                : n.state === "candidate" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : n.state === "down" ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    : "bg-slate-200/70 text-slate-500 dark:bg-white/10 dark:text-slate-400",
            ].join(" ")}>
              {stateLabel(n.state)}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{tr(L.term)} {n.term}</span>
            {n.state === "candidate" && <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">{n.votes}/{MAJORITY} votes</span>}
            {n.state !== "down" && n.state !== "candidate" && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{tr(L.log)} {n.logLen} · {tr(L.committed)} {n.commit}</span>
            )}
          </button>
        ))}
      </div>

      <Aha show={missions.elected}>
        A follower&apos;s random timer ran out first, so it became a candidate, bumped the term, and
        asked everyone for a vote. It got <b>{MAJORITY} of {N}</b> — a majority — so it&apos;s the
        leader. The randomized timeouts are what stop all five from campaigning at once, and the
        majority rule guarantees only one winner per term.
      </Aha>
      <Aha show={missions.crash}>
        You killed the leader, so its heartbeats stopped. The remaining followers waited out
        their timers, one campaigned with a <i>higher term</i>, and the survivors elected a new
        leader — all on their own. As long as a majority (3 of 5) is alive, the cluster keeps
        going. That&apos;s why clusters use an odd number: 5 nodes tolerate 2 failures.
      </Aha>

      {/* ── Committed log ────────────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tr(L.committedLog)}</h3>
        {snap.committed.length === 0 ? (
          <p className="text-sm text-slate-400">{tr(L.empty)}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {snap.committed.map((e, i) => (
              <span key={i} className="rounded-lg bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-medium text-emerald-700 dark:text-emerald-300">
                #{i + 1}: {e.value} <span className="opacity-60">@t{e.term}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Events ───────────────────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tr(L.events)}</h3>
        {snap.events.length === 0 ? <p className="text-sm text-slate-400">—</p> : (
          <ul className="flex flex-col gap-1 font-mono text-xs">
            {snap.events.map((e) => (
              <li key={e.seq} className={e.kind === "elected" ? "font-bold text-indigo-600 dark:text-indigo-400" : e.kind === "down" || e.kind === "noleader" ? "text-rose-500" : e.kind === "up" ? "text-emerald-500" : "text-slate-600 dark:text-slate-300"}>
                {evText(e)}
              </li>
            ))}
          </ul>
        )}
      </div>

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
          {allDone ? "🎉 You ran a full Raft election cycle — elect, replicate, recover." : "This is the machinery behind a lot of what you've seen"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Consensus is how a cluster safely picks the leader that the Replication lab promoted
          by hand — and it&apos;s the deepest answer to the &quot;agreement&quot; problem from the intro.
          Loop back to see where it fits:
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            {
              fix: "Replication",
              desc: "Raft is the real failover machinery — it elects the new primary instead of you clicking one.",
              href: "/labs/replication",
            },
            {
              fix: "The Three Horsemen",
              desc: "Consensus is how machines agree under concurrency — the third horseman from the intro.",
              href: "/labs/three-horsemen",
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
