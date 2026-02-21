import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Apple, BarChart3, Calendar, ChefHat, Sparkles, Users } from "lucide-react";

export default function HomePage() {
  const features = [
    {
      icon: ChefHat,
      title: "Smart Recipe Discovery",
      description:
        "AI-powered recipe recommendations based on your preferences and dietary needs.",
    },
    {
      icon: Calendar,
      title: "Meal Planning",
      description:
        "Plan your weekly meals with drag-and-drop simplicity and auto-generated plans.",
    },
    {
      icon: BarChart3,
      title: "Nutrition Tracking",
      description:
        "Track your daily nutrition with detailed macros and micronutrient breakdowns.",
    },
    {
      icon: Sparkles,
      title: "Personalized Recommendations",
      description:
        "Get recipe suggestions tailored to your health goals and taste preferences.",
    },
    {
      icon: Apple,
      title: "Allergen Management",
      description:
        "Safely manage dietary restrictions and allergies with smart filtering.",
    },
    {
      icon: Users,
      title: "Goal-Oriented",
      description:
        "Whether you're losing weight or gaining muscle, we've got you covered.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-6">
          <Sparkles className="h-4 w-4" />
          <span>AI-Powered Nutrition Platform</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          Your Personal
          <br />
          <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Nutrition Assistant
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Track your nutrition, plan your meals, and discover personalized recipes
          with AI-powered recommendations tailored to your health goals.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/signup">Get Started Free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Powerful features to help you achieve your nutrition and health goals.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-primary to-secondary text-white border-0">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Transform Your Nutrition?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Join thousands of users achieving their health goals with SnackTrack.
            </p>
            <Button size="lg" variant="outline" className="bg-white hover:bg-white/90 text-primary" asChild>
              <Link href="/signup">Start Your Journey</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Copyright 2026 SnackTrack. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

