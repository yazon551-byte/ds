import type { Metadata } from "next";
import { RemoteInvocationLab } from "@/components/labs/remote-invocation-lab";

export const metadata: Metadata = {
  title: "Remote Invocation · Distributed Systems Lab",
  description:
    "Watch an RMI/RPC call travel client → stub → network → server, and compare Java RMI, REST and gRPC.",
};

export default function Page() {
  return <RemoteInvocationLab />;
}
