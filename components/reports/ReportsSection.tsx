"use client";

import { useState } from "react";

type Report = {
  id: string;
  date: Date | string;
  subjectType: string;
  reportKind?: string;
  reportType: string;
  content: string | null;
  isAutomatic: boolean;
  actionDescription?: string | null;
  isDone?: boolean | null;
  doneAt?: Date | string | null;
  doneBy?: { name: string } | null;
  createdAt: Date | string;
  manager?: { name: string } | null;
  teacher?: { name: string } | null;
  branch?: { name: string };
};

interface Props {
  reports: Report[];
  onMarkDone?: (id: string, done: boolean) => void;
  isPending?: boolean;
}

function authorLabel(r: Report) {
  if (r.teacher) return { name: r.teacher.name, badge: "Teacher" };
  if (r.manager) return { name: r.manager.name, badge: "Manager" };
  return { name: "Unknown", badge: "Manager" };
}

function reportTypeColor(t: string) {
  if (t === "ABSENT") return "bg-red-100 text-red-700";
  if (t === "LATE") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
}

export default function ReportsSection({ reports, onMarkDone, isPending }: Props) {
  const [expandedSimple, setExpandedSimple] = useState(false);
  const [expandedActionable, setExpandedActionable] = useState(true);

  const simpleReports = reports.filter(r => !r.reportKind || r.reportKind === "SIMPLE");
  const actionableReports = reports.filter(r => r.reportKind === "ACTIONABLE");

  const pendingActions = actionableReports.filter(r => !r.isDone);
  const doneActions = actionableReports.filter(r => r.isDone);

  if (reports.length === 0) {
    return <div className="text-sm text-gray-400 py-2">No reports on record.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Actionable Reports */}
      {actionableReports.length > 0 && (
        <div>
          <button onClick={() => setExpandedActionable(e => !e)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2 w-full text-left">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
              Actionable {pendingActions.length > 0 && `— ${pendingActions.length} pending`}
            </span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedActionable ? "" : "-rotate-90"}`}
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
            </svg>
          </button>

          {expandedActionable && (
            <div className="space-y-2">
              {pendingActions.map(r => {
                const author = authorLabel(r);
                return (
                  <div key={r.id} className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-gray-500 font-medium">
                            {new Date(r.date as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${reportTypeColor(r.reportType)}`}>
                            {r.reportType}
                          </span>
                          {r.branch && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{r.branch.name}</span>}
                        </div>
                        {r.actionDescription && (
                          <p className="text-xs font-semibold text-orange-700 mb-1">Action: {r.actionDescription}</p>
                        )}
                        {r.content && <p className="text-sm text-gray-700">{r.content}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          by {author.name}
                          <span className={`ml-1 text-xs px-1.5 py-0.5 rounded ${author.badge === "Teacher" ? "bg-purple-50 text-purple-600" : "bg-teal-50 text-teal-600"}`}>
                            {author.badge}
                          </span>
                        </p>
                      </div>
                      {onMarkDone && (
                        <button onClick={() => onMarkDone(r.id, true)} disabled={isPending}
                          className="shrink-0 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                          Mark Done
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {doneActions.map(r => {
                const author = authorLabel(r);
                return (
                  <div key={r.id} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 opacity-75">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-gray-500 font-medium">
                            {new Date(r.date as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${reportTypeColor(r.reportType)}`}>
                            {r.reportType}
                          </span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Done</span>
                          {r.branch && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{r.branch.name}</span>}
                        </div>
                        {r.actionDescription && (
                          <p className="text-xs text-gray-500 mb-1">Action: {r.actionDescription}</p>
                        )}
                        {r.content && <p className="text-sm text-gray-600">{r.content}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          by {author.name}
                          <span className={`ml-1 text-xs px-1.5 py-0.5 rounded ${author.badge === "Teacher" ? "bg-purple-50 text-purple-600" : "bg-teal-50 text-teal-600"}`}>
                            {author.badge}
                          </span>
                          {r.doneBy && ` · Resolved by ${r.doneBy.name}`}
                          {r.doneAt && ` on ${new Date(r.doneAt as string).toLocaleDateString("en-GB")}`}
                        </p>
                      </div>
                      {onMarkDone && (
                        <button onClick={() => onMarkDone(r.id, false)} disabled={isPending}
                          className="shrink-0 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Simple Reports */}
      {simpleReports.length > 0 && (
        <div>
          {actionableReports.length > 0 && (
            <button onClick={() => setExpandedSimple(e => !e)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2 w-full text-left">
              <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">
                Notes ({simpleReports.length})
              </span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedSimple ? "" : "-rotate-90"}`}
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
              </svg>
            </button>
          )}

          {(expandedSimple || actionableReports.length === 0) && (
            <SimpleReportList reports={simpleReports} />
          )}
        </div>
      )}
    </div>
  );
}

function SimpleReportList({ reports }: { reports: Report[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? reports : reports.slice(0, 5);

  return (
    <div className="space-y-2">
      {visible.map(r => {
        const author = authorLabel(r);
        return (
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
              <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
                by {author.name}
                <span className={`text-xs px-1.5 py-0.5 rounded ${author.badge === "Teacher" ? "bg-purple-50 text-purple-600" : "bg-teal-50 text-teal-600"}`}>
                  {author.badge}
                </span>
              </span>
            </div>
            {r.content && <p className="text-sm text-gray-700 mt-1.5">{r.content}</p>}
          </div>
        );
      })}
      {reports.length > 5 && (
        <button onClick={() => setExpanded(e => !e)}
          className="text-sm text-teal-600 hover:text-teal-800 font-medium">
          {expanded ? "Show less" : `Show ${reports.length - 5} more…`}
        </button>
      )}
    </div>
  );
}
