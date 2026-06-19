"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  GridIcon,
  ImageIcon,
  MailIcon,
  MailLogIcon,
  QuizIcon,
  SettingsIcon,
  TypeIcon,
} from "./icons";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const items: NavItem[] = [
  { href: "/admin", label: "Overview", icon: <GridIcon /> },
  { href: "/admin/photos", label: "Photos", icon: <ImageIcon /> },
  { href: "/admin/quiz", label: "Quiz", icon: <QuizIcon /> },
  { href: "/admin/whitelist", label: "Whitelist", icon: <MailIcon /> },
  { href: "/admin/phrases", label: "Phrases", icon: <TypeIcon /> },
  { href: "/admin/logs", label: "Email logs", icon: <MailLogIcon /> },
  { href: "/admin/settings", label: "Settings", icon: <SettingsIcon /> },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 lg:flex-col" aria-label="Admin menu">
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:flex-none ${
              active
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            <span className="shrink-0" aria-hidden>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
