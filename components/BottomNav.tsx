"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  CheckSquare,
  Map,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "ホーム" },
  { href: "/agenda", icon: Calendar, label: "予定" },
  { href: "/diario", icon: BookOpen, label: "日記" },
  { href: "/rotinas", icon: CheckSquare, label: "ルーティン" },
  { href: "/planos", icon: Map, label: "プラン" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around px-1 py-1 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] ${
                active
                  ? "text-primary-600"
                  : "text-gray-400 active:text-gray-600"
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-all ${
                  active ? "stroke-[2.5px]" : "stroke-[1.5px]"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-all ${
                  active ? "text-primary-600" : "text-gray-400"
                }`}
              >
                {item.label}
              </span>
              {active && (
                <span className="w-1 h-1 rounded-full bg-primary-600 mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
