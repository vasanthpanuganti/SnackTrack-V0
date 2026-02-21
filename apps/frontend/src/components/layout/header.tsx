"use client";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/auth-store";
import { ChefHat, Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export function Header() {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <ChefHat className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline">SnackTrack</span>
        </Link>

        <div className="flex-1 flex items-center gap-4 md:gap-8">
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipes..."
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium">{user?.displayName || "User"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
