"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getReportCountsGM } from "./actions/reports";

type ReportCounts = Awaited<ReturnType<typeof getReportCountsGM>>;

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function GeneralManagerPage() {
  const [reportDate, setReportDate] = useState(toDateStr(new Date()));
  const [reportCounts, setReportCounts] = useState<ReportCounts | null>(null);

  useEffect(() => {
    getReportCountsGM(reportDate).then(setReportCounts).catch(() => {});
  }, [reportDate]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
      <p className="text-gray-500 mt-1">Welcome, General Manager</p>

      {/* Reports Widget */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-base font-semibold text-gray-800">Reports — All Branches</h2>
          <input type="date" value={reportDate} max={toDateStr(new Date())}
            onChange={e => setReportDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>

        {reportCounts ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              {[
                { label: "Total", value: reportCounts.total, color: "bg-gray-50 border-gray-200 text-gray-900" },
                { label: "Staff", value: reportCounts.staff, color: "bg-blue-50 border-blue-200 text-blue-800" },
                { label: "Teachers", value: reportCounts.teachers, color: "bg-purple-50 border-purple-200 text-purple-800" },
                { label: "Students", value: reportCounts.students, color: "bg-teal-50 border-teal-200 text-teal-800" },
                { label: "Classes", value: reportCounts.classes, color: "bg-orange-50 border-orange-200 text-orange-800" },
              ].map(item => (
                <div key={item.label} className={`border rounded-xl px-4 py-3 ${item.color}`}>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs font-medium mt-0.5 opacity-70">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Per-branch breakdown */}
            {reportCounts.byBranch.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                      <th className="text-left px-5 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Reports</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reportCounts.byBranch.map(b => (
                      <tr key={b.branchName} className="hover:bg-gray-50">
                        <td className="px-5 py-2 font-medium text-gray-800">{b.branchName}</td>
                        <td className="px-5 py-2 text-gray-600">{b.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-400">Loading…</div>
        )}
      </div>
    </div>
  );
}
