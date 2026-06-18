import type { Metadata } from "next";
import { ReplicationLab } from "@/components/labs/replication-lab";

export const metadata: Metadata = {
  title: "Replication Lab · Distributed Systems Lab",
  description:
    "Interactive replication: active vs passive, sync vs async, replication lag, stale reads, and primary failover with data loss.",
};

export default function Page() {
  return <ReplicationLab />;
}
