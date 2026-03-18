"use client";

import { useEffect, useState } from "react";

type Report = {
  id: string;
  date: Date | string;
  subjectType: string;
  reportType: string;
  content: string | null;
  isAutomatic: boolean;
  createdAt: Date | string;
  manager: { name: string };
  branch?: { name: string };
};

interface Props {
  reports: Report[];
}

function reportTypeColor(t: string) {
  if (t === "ABSENT") return "bg-red-100 text-red-700";
  if (t === "LATE") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
}

export default function ReportsSection({ reports }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (reports.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-2">No reports on record.</div>
    );
  }

  const visible = expanded ? reports : reports.slice(0, 5);

  return (
    <div className="space-y-2">
      {visible.map(r => (
        <div key={r.id} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 font-medium">
                {new Date(r.date as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${reportTypeColor(r.reportType)}`}>
                {r.reportType}
              </span>
              {r.isAutomatic && <span className="text-xs text-gray-400 italic">auto</span>}
              {r.branch && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{r.branch.name}</span>}
            </div>
            <span className="text-xs text-gray-400 shrink-0">by {r.manager.name}</span>
          </div>
          {r.content && <p className="text-sm text-gray-700 mt-1.5">{r.content}</p>}
        </div>
      ))}
      {reports.length > 5 && (
        <button onClick={() => setExpanded(e => !e)}
          className="text-sm text-teal-600 hover:text-teal-800 font-medium">
          {expanded ? "Show less" : `Show ${reports.length - 5} more…`}
        </button>
      )}
    </div>
  );
}
