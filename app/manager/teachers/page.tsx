"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTeachersForBranch } from "../actions/teachers";

type Teacher = Awaited<ReturnType<typeof getTeachersForBranch>>[number];

const PAYMENT_LABELS: Record<string, string> = {
  PER_CLASS: "Per Class",
  REVENUE_PERCENTAGE: "Revenue %",
  MONTHLY_SALARY: "Monthly Salary",
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeachersForBranch().then(data => { setTeachers(data); setLoading(false); });
  }, []);

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.userId ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (t.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Teachers</h1>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, ID, or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-10 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-400 py-10 text-center bg-white border border-gray-200 rounded-xl">
          {search ? "No teachers match your search." : "No teachers in this branch yet."}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{t.name}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-gray-500">{t.userId ?? "—"}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{t.email ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-gray-600">
                      {t.paymentType ? PAYMENT_LABELS[t.paymentType] ?? t.paymentType : "—"}
                      {t.paymentType === "PER_CLASS" && t.perClassRate != null && ` · $${t.perClassRate}/class`}
                      {t.paymentType === "REVENUE_PERCENTAGE" && t.revenuePercentage != null && ` · ${t.revenuePercentage}%`}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/manager/teachers/${t.id}`}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-teal-50 transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
