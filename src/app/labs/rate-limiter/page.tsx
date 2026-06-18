import type { Metadata } from "next";
import { RateLimiterLab } from "@/components/labs/rate-limiter-lab";

export const metadata: Metadata = {
  title: "Rate Limiter · Distributed Systems Lab",
  description: "Token Bucket vs Leaky Bucket rate limiting — flood it and watch HTTP 429s kick in.",
};

export default function Page() {
  return <RateLimiterLab />;
}
