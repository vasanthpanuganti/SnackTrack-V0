"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ChefHat,
  Calendar,
  BookOpen,
  User,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Recipes", href: "/dashboard/recipes", icon: ChefHat },
  { name: "Meal Plans", href: "/dashboard/meal-plans", icon: Calendar },
  { name: "Meal Logs", href: "/dashboard/meal-logs", icon: BookOpen },
  { name: "Recommendations", href: "/dashboard/recommendations", icon: Sparkles },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r bg-muted/5 px-4 py-6">
      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <Button
        variant="ghost"
        className="justify-start text-muted-foreground hover:text-foreground"
        onClick={() => logout()}
      >
        <LogOut className="h-5 w-5 mr-3" />
        Logout
      </Button>
    </aside>
  );
}
