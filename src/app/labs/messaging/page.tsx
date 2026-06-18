import type { Metadata } from "next";
import { MessagingLab } from "@/components/labs/messaging-lab";

export const metadata: Metadata = {
  title: "Messaging & Pub/Sub · Distributed Systems Lab",
  description:
    "Interactive message broker: publish/subscribe fan-out, retries, and a dead-letter queue for poison messages.",
};

export default function Page() {
  return <MessagingLab />;
}
