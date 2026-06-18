import type { Metadata } from "next";
import { LoadBalancerLab } from "@/components/labs/load-balancer-lab";

export const metadata: Metadata = {
  title: "Load Balancer Lab · Distributed Systems Lab",
  description:
    "Interactive load balancing simulator — Round Robin, Weighted, Least Connections, Power of Two, Latency-based and Random.",
};

export default function Page() {
  return <LoadBalancerLab />;
}
