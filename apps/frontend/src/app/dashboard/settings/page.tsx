"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Loader2, LogOut, Monitor, Moon, Sun, Trash2 } from "lucide-react";

import { useAuth } from "@/lib/hooks/use-auth";
import { useAuthStore } from "@/lib/store/auth-store";
import { useUserProfile, useUpdateProfile } from "@/lib/hooks/use-user";
import { usersApi } from "@/lib/api/users.api";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageTransition } from "@/components/motion";
import { toast } from "sonner";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function SettingsPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { theme, setTheme } = useTheme();
  const { data: profile } = useUserProfile();
  const updateProfile = useUpdateProfile();
  const [deleting, setDeleting] = useState(false);

  const unit = profile?.unitPreference ?? "metric";

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await usersApi.deleteAccount();
      clearAuth();
      toast.success("Your account has been deleted.");
      router.push("/");
    } catch {
      // error toast already shown by the API client
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageTransition className="space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">App preferences and account.</p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Appearance</CardTitle>
          <CardDescription>How SnackTrack looks on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid max-w-md grid-cols-3 gap-3">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                aria-pressed={theme === option.value}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors",
                  theme === option.value
                    ? "border-primary bg-accent"
                    : "border-border hover:border-primary/40"
                )}
              >
                <option.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Units</CardTitle>
          <CardDescription>Measurement system for height and weight.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid max-w-md grid-cols-2 gap-3">
            {(
              [
                { value: "metric", label: "Metric", hint: "kg · cm" },
                { value: "imperial", label: "Imperial", hint: "lb · ft" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                onClick={() => updateProfile.mutate({ unitPreference: option.value })}
                disabled={updateProfile.isPending}
                aria-pressed={unit === option.value}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border-2 p-4 transition-colors",
                  unit === option.value
                    ? "border-primary bg-accent"
                    : "border-border hover:border-primary/40"
                )}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.hint}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
          <CardDescription>{profile?.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label>Sign out</Label>
              <p className="text-sm text-muted-foreground">
                Sign out of SnackTrack on this device.
              </p>
            </div>
            <Button variant="outline" onClick={() => logout()}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-destructive">Delete account</Label>
              <p className="text-sm text-muted-foreground">
                Permanently removes your account and all data.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes your profile, meal logs, plans, and
                    preferences. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my account</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={deleteAccount}
                  >
                    Yes, delete everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </PageTransition>
  );
}
