"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export interface NavItem {
  label: string;
  href: string;
}

interface Props {
  children: React.ReactNode;
  nav: NavItem[];
  role: string;
  accent: "orange" | "teal" | "dark";
}

const styles = {
  orange: {
    label: "text-orange-500",
    active: "bg-orange-50 text-orange-600 border-l-2 border-orange-500 font-medium",
  },
  teal: {
    label: "text-teal-600",
    active: "bg-teal-50 text-teal-700 border-l-2 border-teal-500 font-medium",
  },
  dark: {
    label: "text-gray-700",
    active: "bg-gray-100 text-gray-900 border-l-2 border-gray-700 font-medium",
  },
};

export default function DashboardLayout({ children, nav, role, accent }: Props) {
  const pathname = usePathname();
  const s = styles[accent];

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Adib Academy</p>
          <p className={`text-sm font-semibold mt-0.5 ${s.label}`}>{role}</p>
        </div>

        <nav className="flex-1 pt-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-5 py-2.5 text-sm transition-colors ${
                pathname === item.href
                  ? s.active
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
