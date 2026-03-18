"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStaffForBranch } from "../actions/teachers";

type StaffMember = Awaited<ReturnType<typeof getStaffForBranch>>[number];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStaffForBranch().then(data => { setStaff(data); setLoading(false); });
  }, []);

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.userId ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (s.staffType ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Staff</h1>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, ID, or role…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-10 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-400 py-10 text-center bg-white border border-gray-200 rounded-xl">
          {search ? "No staff match your search." : "No staff in this branch yet."}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{s.name}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-gray-500">{s.userId ?? "—"}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{s.staffType ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {s.monthlySalary != null ? `$${s.monthlySalary}/mo` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/manager/staff/${s.id}`}
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
