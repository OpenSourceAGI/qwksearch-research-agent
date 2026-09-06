"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/config", label: "Site Config" },
  { href: "/admin/freekeys", label: "API Keys" },
  { href: "/admin/chat-test", label: "Chat Test" },
];

export default function AdminNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <nav className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-6 h-12">
          <span className="font-semibold text-sm text-gray-500 dark:text-gray-400 pr-4 border-r border-gray-300 dark:border-gray-700">
            Admin
          </span>
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors ${
                pathname === href || pathname.startsWith(href + "/")
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="ml-auto">
            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ← Back to app
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
