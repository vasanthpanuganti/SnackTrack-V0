import type { Metadata } from "next";
import { Landing } from "@/components/marketing/landing";

export const metadata: Metadata = {
  title: "SnackTrack — Eat well, effortlessly",
  description:
    "AI-powered nutrition tracking, meal planning, and recipe discovery. Log meals in seconds, hit your macros, and get recipes that match your taste.",
};

export default function HomePage() {
  return <Landing />;
}
