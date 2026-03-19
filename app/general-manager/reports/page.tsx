"use client";

import { useEffect, useState, useTransition } from "react";
import { getAllReportsGM, getAllActionableReportsGM } from "../actions/reports";
import { getBranchesGM } from "../actions/classes";
import { markReportDoneGM } from "../actions/reports";

type Report = Awaited<ReturnType<typeof getAllReportsGM>>[number];
type ActionableReport = Awaited<ReturnType<typeof getAllActionableReportsGM>>[number];
type Branch = Awaited<ReturnType<typeof getBranchesGM>>[number];

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

function reportTypeColor(t: string) {
  if (t === "ABSENT") return "bg-red-100 text-red-700";
  if (t === "LATE") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
}

export default function GMReportsPage() {
  const [tab, setTab] = useState<"browse" | "actions">("browse");
  const [branches, setBranches] = useState<Branch[]>([]);

  // Browse state
  const [reports, setReports] = useState<Report[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [browseLoading, setBrowseLoading] = useState(false);

  // Actions state
  const [actionable, setActionable] = useState<ActionableReport[]>([]);
  const [actionBranchFilter, setActionBranchFilter] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { getBranchesGM().then(setBranches); }, []);

  useEffect(() => {
    setBrowseLoading(true);
    getAllReportsGM({
      branchId: branchFilter || undefined,
      dateStr: dateFilter || undefined,
      subjectType: typeFilter || undefined,
      reportKind: kindFilter || undefined,
    }).then(data => { setReports(data); setBrowseLoading(false); });
  }, [branchFilter, dateFilter, typeFilter, kindFilter]);

  useEffect(() => {
    setActionsLoading(true);
    getAllActionableReportsGM(
      actionBranchFilter || undefined,
      showDone ? undefined : true,
    ).then(data => { setActionable(data); setActionsLoading(false); });
  }, [actionBranchFilter, showDone]);

  function handleMarkDone(id: string, done: boolean) {
    startTransition(async () => {
      await markReportDoneGM(id, done);
      getAllActionableReportsGM(actionBranchFilter || undefined, showDone ? undefined : true)
        .then(setActionable);
    });
  }

  const pendingCount = actionable.filter(r => !r.isDone).length;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab("browse")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "browse" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          Browse
        </button>
        <button onClick={() => setTab("actions")}
          className={`relative px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "actions" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          Actions
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center bg-orange-500 text-white text-xs font-bold rounded-full w-4 h-4">
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Browse Tab */}
      {tab === "browse" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">All Types</option>
              <option value="STAFF">Staff</option>
              <option value="TEACHER">Teachers</option>
              <option value="STUDENT">Students</option>
              <option value="CLASS">Classes</option>
            </select>
            <select value={kindFilter} onChange={e => setKindFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">All Kinds</option>
              <option value="SIMPLE">Notes</option>
              <option value="ACTIONABLE">Actionable</option>
            </select>
            {(branchFilter || dateFilter || typeFilter || kindFilter) && (
              <button onClick={() => { setBranchFilter(""); setDateFilter(""); setTypeFilter(""); setKindFilter(""); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                Clear
              </button>
            )}
          </div>

          {browseLoading ? (
            <div className="text-sm text-gray-400 text-center py-10">Loading…</div>
          ) : reports.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
              No reports found.
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map(r => (
                <div key={r.id} className={`bg-white border rounded-xl px-5 py-4 ${r.reportKind === "ACTIONABLE" && !r.isDone ? "border-orange-200" : "border-gray-200"}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-gray-500 font-medium">
                          {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${reportTypeColor(r.reportType)}`}>
                          {r.reportType}
                        </span>
                        {r.reportKind === "ACTIONABLE" && (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${r.isDone ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                            {r.isDone ? "Done" : "Pending Action"}
                          </span>
                        )}
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{r.subjectType}</span>
                        {r.branch && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{r.branch.name}</span>}
                      </div>
                      {"subjectName" in r && r.subjectName && (
                        <p className="text-xs font-medium text-gray-700 mb-0.5">{r.subjectName as string}</p>
                      )}
                      {r.actionDescription && (
                        <p className="text-xs font-semibold text-orange-700 mb-1">Action: {r.actionDescription}</p>
                      )}
                      {r.content && <p className="text-sm text-gray-700">{r.content}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        by {r.manager?.name ?? r.teacher?.name ?? "Unknown"}
                        {r.doneBy && ` · Resolved by ${r.doneBy.name}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400 text-center pt-2">Showing up to 200 most recent</p>
            </div>
          )}
        </>
      )}

      {/* Actions Tab */}
      {tab === "actions" && (
        <>
          <div className="flex flex-wrap gap-3 mb-5">
            <select value={actionBranchFilter} onChange={e => setActionBranchFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer border border-gray-200 rounded-lg px-3 py-2">
              <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} className="rounded" />
              Show resolved
            </label>
          </div>

          {actionsLoading ? (
            <div className="text-sm text-gray-400 text-center py-10">Loading…</div>
          ) : actionable.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-700 font-medium">
              {showDone ? "No actionable reports found." : "No pending actions — all clear."}
            </div>
          ) : (
            <div className="space-y-2">
              {actionable.map(r => (
                <div key={r.id} className={`border rounded-xl px-5 py-4 ${r.isDone ? "bg-gray-50 border-gray-200 opacity-75" : "bg-orange-50 border-orange-200"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">{r.subjectType}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        {r.branch && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{r.branch.name}</span>}
                        {r.isDone && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Done</span>}
                      </div>
                      {"subjectName" in r && r.subjectName && (
                        <p className="text-xs font-medium text-gray-700 mb-0.5">{r.subjectName as string}</p>
                      )}
                      {r.actionDescription && (
                        <p className="text-sm font-semibold text-orange-800 mb-1">{r.actionDescription}</p>
                      )}
                      {r.content && <p className="text-sm text-gray-700">{r.content}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        by {r.manager?.name ?? r.teacher?.name ?? "Unknown"}
                        {r.doneBy && ` · Resolved by ${r.doneBy.name}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleMarkDone(r.id, !r.isDone)}
                      disabled={isPending}
                      className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap ${
                        r.isDone
                          ? "text-gray-500 border border-gray-200 hover:bg-gray-100"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                    >
                      {r.isDone ? "Reopen" : "Mark Done"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
