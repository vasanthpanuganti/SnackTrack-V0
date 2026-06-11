"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  ChefHat,
  Flame,
  Leaf,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  UtensilsCrossed,
} from "lucide-react";

import { IMAGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";

/* ───────────────────────── Nav ───────────────────────── */

function Nav() {
  return (
    <header className="glass fixed inset-x-0 top-0 z-50 border-b border-border/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ChefHat className="h-4.5 w-4.5" />
          </span>
          <span className="font-display text-lg">SnackTrack</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#testimonials" className="transition-colors hover:text-foreground">
            Loved by
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link href="/signup">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

function FloatingCard({
  className,
  delay = 0,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`glass absolute rounded-2xl border border-white/30 p-4 shadow-xl dark:border-white/10 ${className ?? ""}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -7, 0] }}
        transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      {/* soft background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-20%] left-[-10%] h-[420px] w-[420px] rounded-full bg-warning/10 blur-3xl"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 md:px-6 lg:grid-cols-2">
        <div>
          <FadeIn y={20}>
            <Badge variant="soft" className="mb-6 px-3 py-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered nutrition, minus the spreadsheet feeling
            </Badge>
          </FadeIn>

          <FadeIn y={24} delay={0.08}>
            <h1 className="font-display text-5xl leading-[1.05] text-balance md:text-6xl lg:text-7xl">
              Eat well,{" "}
              <em className="text-primary">effortlessly</em>.
            </h1>
          </FadeIn>

          <FadeIn y={24} delay={0.16}>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Log meals in seconds, watch your macros fill in real time, and get
              recipes chosen for your taste, your goals, and your allergies —
              not someone else&apos;s.
            </p>
          </FadeIn>

          <FadeIn y={24} delay={0.24}>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button size="lg" asChild className="rounded-full px-7">
                <Link href="/signup">
                  Start tracking free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full px-7">
                <Link href="/login">I have an account</Link>
              </Button>
            </div>
          </FadeIn>

          <FadeIn y={20} delay={0.32}>
            <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </span>
              Free forever for personal tracking · No credit card
            </div>
          </FadeIn>
        </div>

        {/* Hero visual */}
        <FadeIn delay={0.15} className="relative">
          <div className="relative aspect-[4/5] max-h-[560px] w-full overflow-hidden rounded-[2rem] shadow-2xl">
            <Image
              src={IMAGES.heroBowl}
              alt="A vibrant bowl of fresh vegetables and greens"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 560px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </div>

          <FloatingCard className="-left-4 top-10 hidden sm:block" delay={0.5}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                <Flame className="h-5 w-5 text-primary" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-sm font-bold tabular-nums">
                  1,486 <span className="font-normal text-muted-foreground">/ 2,100 kcal</span>
                </p>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard className="-right-3 top-1/3 hidden sm:block" delay={0.7}>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-semibold">Allergen safe</p>
                <p className="text-xs text-muted-foreground">Peanut-free matches only</p>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard className="-bottom-5 left-10 hidden sm:block" delay={0.9}>
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm font-semibold">94% taste match</p>
                <p className="text-xs text-muted-foreground">Miso-glazed salmon bowl</p>
              </div>
            </div>
          </FloatingCard>
        </FadeIn>
      </div>
    </section>
  );
}

/* ───────────────────────── Features ───────────────────────── */

const FEATURES = [
  {
    icon: BarChart3,
    title: "Live macro tracking",
    description:
      "Calories, protein, carbs, and fat update the moment you log — with targets computed from your body, not a generic 2,000.",
  },
  {
    icon: Sparkles,
    title: "A recommender that learns you",
    description:
      "Every log, swap, and skip teaches the model. Suggestions go from good to uncanny within a week.",
  },
  {
    icon: Calendar,
    title: "One-tap meal plans",
    description:
      "Generate a day or a full week of meals matched to your calorie target. Don't like one? Swap it in place.",
  },
  {
    icon: ShieldCheck,
    title: "Allergen guardrails",
    description:
      "Flag the FDA top-9 once and unsafe recipes vanish from search, plans, and picks — with severity levels you control.",
  },
  {
    icon: Timer,
    title: "Log in under 10 seconds",
    description:
      "Search a unified USDA + Spoonacular database and macros autofill. Manual entry is there when you need it.",
  },
  {
    icon: Leaf,
    title: "Built around your diet",
    description:
      "Vegan, keto, Mediterranean, pescatarian and more — filters that follow you across the whole product.",
  },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-24 md:px-6">
      <FadeIn className="mx-auto mb-14 max-w-2xl text-center">
        <h2 className="font-display text-4xl text-balance md:text-5xl">
          Everything you need to <em className="text-primary">actually</em> stick with it
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Most trackers die in week two. SnackTrack removes the friction that kills the habit.
        </p>
      </FadeIn>

      <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <StaggerItem key={feature.title}>
            <div className="group h-full rounded-2xl border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
              <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-5.5 w-5.5" />
              </span>
              <h3 className="mb-2 font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/* ───────────────────────── How it works ───────────────────────── */

const STEPS = [
  {
    number: "01",
    title: "Tell us about you",
    description:
      "Goals, diet, allergens, and how active you are. We compute your daily targets with the Mifflin–St Jeor formula.",
    image: IMAGES.avocadoToast,
    alt: "Avocado toast with eggs on a ceramic plate",
  },
  {
    number: "02",
    title: "Log as you eat",
    description:
      "Search any food and macros fill themselves in. Breakfast to midnight snack, it takes seconds.",
    image: IMAGES.greenBowl,
    alt: "A fresh green salad bowl",
  },
  {
    number: "03",
    title: "Let the picks come to you",
    description:
      "Recommendations and auto-generated meal plans tuned to your taste profile — and always allergen-safe.",
    image: IMAGES.salmonPlate,
    alt: "Seared salmon with vegetables",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y bg-muted/40 py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <FadeIn className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="font-display text-4xl text-balance md:text-5xl">
            Three steps to a better plate
          </h2>
        </FadeIn>

        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <FadeIn key={step.number} delay={index * 0.12}>
              <div className="group overflow-hidden rounded-3xl border bg-card">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={step.image}
                    alt={step.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 font-display text-sm text-white backdrop-blur-sm">
                    {step.number}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="mb-2 font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Testimonials ───────────────────────── */

const TESTIMONIALS = [
  {
    quote:
      "I've abandoned every macro app within a month. SnackTrack is the first one where logging feels lighter than skipping it.",
    name: "Priya N.",
    role: "Marathon runner",
  },
  {
    quote:
      "The allergen filter is the feature I didn't know I needed. My shellfish allergy just… never comes up anymore.",
    name: "Marcus T.",
    role: "Busy dad of two",
  },
  {
    quote:
      "Generated a week of meals at my cut calories and swapped the two I didn't like. Ten seconds of planning, done.",
    name: "Sofia R.",
    role: "Powerlifter",
  },
];

function Testimonials() {
  return (
    <section id="testimonials" className="mx-auto max-w-6xl px-4 py-24 md:px-6">
      <FadeIn className="mx-auto mb-14 max-w-2xl text-center">
        <h2 className="font-display text-4xl text-balance md:text-5xl">
          People keep using this one
        </h2>
      </FadeIn>

      <Stagger className="grid gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((testimonial) => (
          <StaggerItem key={testimonial.name}>
            <figure className="flex h-full flex-col rounded-2xl border bg-card p-6">
              <span className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </span>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed">
                “{testimonial.quote}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-success text-sm font-semibold text-primary-foreground">
                  {testimonial.name[0]}
                </span>
                <div>
                  <p className="text-sm font-semibold">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </figcaption>
            </figure>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/* ───────────────────────── CTA + Footer ───────────────────────── */

function CallToAction() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 md:px-6">
      <FadeIn>
        <div className="relative overflow-hidden rounded-[2rem] px-6 py-16 text-center md:py-20">
          <Image
            src={IMAGES.platesSpread}
            alt=""
            aria-hidden
            fill
            sizes="(max-width: 1152px) 100vw, 1152px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/65" />
          <div className="relative">
            <h2 className="font-display text-4xl text-white text-balance md:text-5xl">
              Tonight&apos;s dinner could already be picked.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">
              Join SnackTrack and get a personalized meal plan in your first
              two minutes.
            </p>
            <Button
              size="lg"
              asChild
              className="mt-8 rounded-full bg-white px-8 text-foreground hover:bg-white/90 dark:text-background"
            >
              <Link href="/signup">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 md:flex-row md:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="h-4 w-4" />
          </span>
          <span className="font-display text-lg">SnackTrack</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#how-it-works" className="hover:text-foreground">How it works</a>
          <Link href="/login" className="hover:text-foreground">Sign in</Link>
          <Link href="/signup" className="hover:text-foreground">Get started</Link>
        </nav>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} SnackTrack. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
