"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChefHat, LogOut, Search, Settings, User } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useAuth } from "@/lib/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/layout/mobile-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const initial =
    user?.displayName?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "U";

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/dashboard/recipes?search=${encodeURIComponent(q)}` : "/dashboard/recipes");
  };

  return (
    <header className="glass sticky top-0 z-40 w-full border-b">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <MobileNav />

        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ChefHat className="h-4.5 w-4.5" />
          </span>
          <span className="hidden font-display text-lg sm:inline">
            SnackTrack
          </span>
        </Link>

        <form
          onSubmit={submitSearch}
          className="ml-2 hidden max-w-md flex-1 md:flex"
          role="search"
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search recipes…"
              className="rounded-full pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search recipes"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Account menu"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-success text-sm font-semibold text-primary-foreground">
                  {initial}
                </span>
                <span className="hidden max-w-[10rem] truncate text-sm font-medium lg:inline">
                  {user?.displayName ?? user?.email}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">
                  {user?.displayName ?? "Your account"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push("/dashboard/profile")}>
                <User /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push("/dashboard/settings")}>
                <Settings /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => logout()}
              >
                <LogOut /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
