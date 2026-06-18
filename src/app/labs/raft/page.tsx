import type { Metadata } from "next";
import { RaftLab } from "@/components/labs/raft-lab";

export const metadata: Metadata = {
  title: "Raft Consensus · Distributed Systems Lab",
  description: "Watch a 5-node cluster elect a leader, replicate a log, and re-elect when the leader fails.",
};

export default function Page() {
  return <RaftLab />;
}
