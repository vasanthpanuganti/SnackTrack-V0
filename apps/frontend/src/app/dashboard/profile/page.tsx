"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, SlidersHorizontal, User as UserIcon } from "lucide-react";

import {
  useUserProfile,
  useUpdateProfile,
  useUpdatePreferences,
  useReplaceAllergens,
} from "@/lib/hooks/use-user";
import {
  ACTIVITY_OPTIONS,
  CUISINE_OPTIONS,
  DIET_OPTIONS,
  FDA_ALLERGENS,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
} from "@/lib/constants";
import { estimateTargets } from "@/lib/nutrition";
import type { AllergenSeverity, UserProfile } from "@/types";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTransition } from "@/components/motion";

function ProfileTab({ profile }: { profile: UserProfile }) {
  const update = useUpdateProfile();
  const [form, setForm] = useState({
    displayName: profile.displayName ?? "",
    dateOfBirth: profile.dateOfBirth ?? "",
    gender: profile.gender ?? "",
    heightCm: profile.heightCm?.toString() ?? "",
    weightKg: profile.weightKg?.toString() ?? "",
    activityLevel: profile.activityLevel ?? "",
    healthGoal: profile.healthGoal ?? "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      ...(form.displayName.trim() ? { displayName: form.displayName.trim() } : {}),
      ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
      ...(form.gender ? { gender: form.gender } : {}),
      ...(form.heightCm ? { heightCm: Number(form.heightCm) } : {}),
      ...(form.weightKg ? { weightKg: Number(form.weightKg) } : {}),
      ...(form.activityLevel ? { activityLevel: form.activityLevel } : {}),
      ...(form.healthGoal ? { healthGoal: form.healthGoal } : {}),
    });
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Personal details</CardTitle>
        <CardDescription>
          Used to estimate your daily calorie target with the Mifflin–St Jeor formula.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label>Gender</Label>
            <Select
              value={form.gender}
              onValueChange={(v) => setForm({ ...form, gender: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="heightCm">Height (cm)</Label>
            <Input
              id="heightCm"
              type="number"
              min="50"
              max="300"
              value={form.heightCm}
              onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="weightKg">Weight (kg)</Label>
            <Input
              id="weightKg"
              type="number"
              min="10"
              max="500"
              step="0.1"
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label>Activity level</Label>
            <Select
              value={form.activityLevel}
              onValueChange={(v) => setForm({ ...form, activityLevel: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} — {option.hint}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Health goal</Label>
            <Select
              value={form.healthGoal}
              onValueChange={(v) => setForm({ ...form, healthGoal: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {GOAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PreferencesTab({ profile }: { profile: UserProfile }) {
  const update = useUpdatePreferences();
  const prefs = profile.preferences;
  const estimate = estimateTargets(profile);

  const [dietType, setDietType] = useState<string>(prefs?.dietType ?? "none");
  const [cuisines, setCuisines] = useState<string[]>(prefs?.cuisinePreferences ?? []);
  const [maxPrep, setMaxPrep] = useState(prefs?.maxPrepTimeMin?.toString() ?? "");
  const [calorieTarget, setCalorieTarget] = useState(prefs?.calorieTarget?.toString() ?? "");
  const [proteinTarget, setProteinTarget] = useState(prefs?.proteinTargetG?.toString() ?? "");
  const [carbTarget, setCarbTarget] = useState(prefs?.carbTargetG?.toString() ?? "");
  const [fatTarget, setFatTarget] = useState(prefs?.fatTargetG?.toString() ?? "");

  const toggleCuisine = (cuisine: string) =>
    setCuisines((current) =>
      current.includes(cuisine)
        ? current.filter((c) => c !== cuisine)
        : [...current, cuisine]
    );

  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      dietType: dietType === "none" ? null : dietType,
      cuisinePreferences: cuisines,
      maxPrepTimeMin: numOrNull(maxPrep),
      calorieTarget: numOrNull(calorieTarget),
      proteinTargetG: numOrNull(proteinTarget),
      carbTargetG: numOrNull(carbTarget),
      fatTargetG: numOrNull(fatTarget),
    });
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Diet & targets</CardTitle>
        <CardDescription>
          Drives recipe filtering, meal-plan generation, and your dashboard rings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Diet type</Label>
              <Select value={dietType} onValueChange={setDietType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIET_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxPrep">Max prep time (min)</Label>
              <Input
                id="maxPrep"
                type="number"
                min="5"
                max="480"
                placeholder="e.g. 45"
                value={maxPrep}
                onChange={(e) => setMaxPrep(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Favorite cuisines</Label>
            <div className="flex flex-wrap gap-2">
              {CUISINE_OPTIONS.map((cuisine) => (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => toggleCuisine(cuisine)}
                  aria-pressed={cuisines.includes(cuisine)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    cuisines.includes(cuisine)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Daily targets</Label>
            <p className="mb-3 text-xs text-muted-foreground">
              Leave blank to use our estimate (~{estimate.calories} kcal,{" "}
              {estimate.proteinG}g protein, {estimate.carbsG}g carbs, {estimate.fatG}g fat).
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="calT" className="text-xs">Calories</Label>
                <Input id="calT" type="number" min="500" max="10000" placeholder={String(estimate.calories)} value={calorieTarget} onChange={(e) => setCalorieTarget(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="proT" className="text-xs">Protein (g)</Label>
                <Input id="proT" type="number" min="0" max="1000" placeholder={String(estimate.proteinG)} value={proteinTarget} onChange={(e) => setProteinTarget(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="carbT" className="text-xs">Carbs (g)</Label>
                <Input id="carbT" type="number" min="0" max="2000" placeholder={String(estimate.carbsG)} value={carbTarget} onChange={(e) => setCarbTarget(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fatT" className="text-xs">Fat (g)</Label>
                <Input id="fatT" type="number" min="0" max="1000" placeholder={String(estimate.fatG)} value={fatTarget} onChange={(e) => setFatTarget(e.target.value)} />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save preferences
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AllergensTab({ profile }: { profile: UserProfile }) {
  const replace = useReplaceAllergens();
  const [selected, setSelected] = useState<Map<string, AllergenSeverity>>(new Map());
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setSelected(
      new Map(profile.allergens.map((a) => [a.allergenType, a.severity]))
    );
    setDirty(false);
  }, [profile.allergens]);

  const toggle = (value: string) => {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.set(value, "severe");
      }
      return next;
    });
    setDirty(true);
  };

  const setSeverity = (value: string, severity: AllergenSeverity) => {
    setSelected((current) => new Map(current).set(value, severity));
    setDirty(true);
  };

  const save = () =>
    replace.mutate(
      [...selected.entries()].map(([allergenType, severity]) => ({
        allergenType,
        severity,
      }))
    );

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Allergens</CardTitle>
        <CardDescription>
          Flagged recipes are filtered from search, plans, and recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FDA_ALLERGENS.map((allergen) => {
            const isOn = selected.has(allergen.value);
            return (
              <div
                key={allergen.value}
                className={cn(
                  "rounded-xl border-2 p-3 transition-colors",
                  isOn ? "border-primary bg-accent" : "border-border"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(allergen.value)}
                  aria-pressed={isOn}
                  className="flex w-full items-center justify-between text-sm font-medium"
                >
                  {allergen.label}
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                      isOn
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 text-transparent"
                    )}
                  >
                    ✓
                  </span>
                </button>
                {isOn && (
                  <Select
                    value={selected.get(allergen.value)}
                    onValueChange={(v) => setSeverity(allergen.value, v as AllergenSeverity)}
                  >
                    <SelectTrigger className="mt-2 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="severe">Severe allergy</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="intolerance">Intolerance</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}
        </div>
        <Button onClick={save} disabled={!dirty || replace.isPending}>
          {replace.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save allergens
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { data: profile, isLoading } = useUserProfile();

  if (isLoading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <PageTransition className="space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Tell us about yourself — everything personalizes from here.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <UserIcon /> Profile
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <SlidersHorizontal /> Preferences
          </TabsTrigger>
          <TabsTrigger value="allergens">
            <ShieldAlert /> Allergens
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab profile={profile} />
        </TabsContent>
        <TabsContent value="preferences">
          <PreferencesTab profile={profile} />
        </TabsContent>
        <TabsContent value="allergens">
          <AllergensTab profile={profile} />
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
}
