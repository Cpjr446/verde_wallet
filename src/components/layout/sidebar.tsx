"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AreaChart, Bot, Leaf, LayoutDashboard, List, Moon, Sun, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: List },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/analytics", label: "Analytics", icon: AreaChart },
  { href: "/assistant", label: "AI Assistant", icon: Bot },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border bg-card flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Leaf className="w-7 h-7 text-primary" />
          <h1 className="text-xl font-bold font-headline">Verde Wallet</h1>
        </Link>
      </div>
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Button
                variant={pathname.startsWith(item.href) ? "secondary" : "ghost"}
                className="w-full justify-start"
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 mt-auto border-t border-border">
        <ThemeToggle showLabel={true} className="w-full justify-center" />
      </div>
    </aside>
  );
}
