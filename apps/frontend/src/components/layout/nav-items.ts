import {
  BookOpen,
  Calendar,
  ChefHat,
  LayoutDashboard,
  Settings,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Track",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
      { name: "Meal Diary", href: "/dashboard/meal-logs", icon: BookOpen },
    ],
  },
  {
    label: "Plan & Discover",
    items: [
      { name: "Recipes", href: "/dashboard/recipes", icon: ChefHat },
      { name: "Meal Plans", href: "/dashboard/meal-plans", icon: Calendar },
      { name: "For You", href: "/dashboard/recommendations", icon: Sparkles },
    ],
  },
  {
    label: "Account",
    items: [
      { name: "Profile", href: "/dashboard/profile", icon: User },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
}
