import type { Metadata } from "next";
import { FaultToleranceLab } from "@/components/labs/fault-tolerance-lab";

export const metadata: Metadata = {
  title: "Fault Tolerance Console · Distributed Systems Lab",
  description:
    "Interactive circuit breaker (CLOSED/OPEN/HALF-OPEN), retry with backoff & jitter, fallback, and heartbeat health checks.",
};

export default function Page() {
  return <FaultToleranceLab />;
}
