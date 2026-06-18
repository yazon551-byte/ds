import type { Metadata } from "next";
import { ThreeHorsemenLab } from "@/components/labs/three-horsemen-lab";

export const metadata: Metadata = {
  title: "The Three Horsemen · Distributed Systems Lab",
  description:
    "Latency, partial failure and concurrency — the three core problems of distributed systems, made interactive.",
};

export default function Page() {
  return <ThreeHorsemenLab />;
}
