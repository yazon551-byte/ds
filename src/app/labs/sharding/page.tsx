import type { Metadata } from "next";
import { ShardingLab } from "@/components/labs/sharding-lab";

export const metadata: Metadata = {
  title: "Sharding Visualizer · Distributed Systems Lab",
  description:
    "Interactive sharding: range, hash, directory and consistent hashing — trace any key and see rebalancing cost.",
};

export default function Page() {
  return <ShardingLab />;
}
