import type { Metadata } from "next";
import { SagaLab } from "@/components/labs/saga-lab";

export const metadata: Metadata = {
  title: "Saga Coordinator · Distributed Systems Lab",
  description: "A distributed checkout saga with compensating transactions — pick a step to fail and watch the rollback.",
};

export default function Page() {
  return <SagaLab />;
}
