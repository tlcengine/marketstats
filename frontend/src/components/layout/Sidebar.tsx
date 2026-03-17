"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BarChart3,
  TrendingUp,
  Search,
  Zap,
  FileText,
  Building2,
  Calculator,
  Palette,
  Rss,
  User,
  LogOut,
  Menu,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Market Analytics", href: "/dashboard", icon: BarChart3 },
  { label: "Price Forecast", href: "/forecast", icon: TrendingUp },
  { label: "Browse Listings", href: "/browse", icon: Search },
  { label: "FastStats", href: "/faststats", icon: Zap },
  { label: "Market Report", href: "/report", icon: FileText },
  { label: "Tax Analysis", href: "/tax", icon: Building2 },
  { label: "Tax Predictor", href: "/tax/predictor", icon: Calculator },
  { label: "Branding", href: "/admin/branding", icon: Palette },
  { label: "Feed Manager", href: "/admin/feeds", icon: Rss },
  { label: "My Account", href: "/account", icon: User },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="flex h-full flex-col">
      {/* User section */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={session?.user?.image ?? undefined} alt={session?.user?.name ?? "User"} />
            <AvatarFallback className="bg-navy text-white text-xs font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-dark-gray">
              {session?.user?.name ?? "User"}
            </p>
            <p className="truncate text-xs text-body-gray">
              {session?.user?.email ?? ""}
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-border-warm" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-white text-dark-gray border-b-2 border-gold shadow-sm"
                      : "text-body-gray hover:bg-white hover:text-dark-gray"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator className="bg-border-warm" />

      {/* Sign out */}
      <div className="p-3">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-body-gray transition-colors hover:bg-white hover:text-dark-gray"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40 bg-cream border-r border-border-warm">
      <div className="px-4 pt-5 pb-3">
        <h1 className="font-serif text-xl font-bold text-dark-gray tracking-tight">
          MarketStats
        </h1>
        <div className="mt-1 h-0.5 w-8 bg-gold" />
      </div>
      <NavContent />
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-cream border-b border-border-warm px-4 py-3">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-cream">
          <SheetTitle className="px-4 pt-5 pb-3 font-serif text-xl font-bold text-dark-gray tracking-tight">
            MarketStats
            <span className="block mt-1 h-0.5 w-8 bg-gold" />
          </SheetTitle>
          <NavContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <h1 className="font-serif text-lg font-bold text-dark-gray tracking-tight">
        MarketStats
      </h1>
    </div>
  );
}
