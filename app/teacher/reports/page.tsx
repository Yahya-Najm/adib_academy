"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getMyReports,
  getMyPendingActionableReports,
  createTeacherReport,
  markTeacherReportDone,
  getTeacherReportableSubjects,
} from "../actions/reports";
import ReportsSection from "@/components/reports/ReportsSection";

type Report = Awaited<ReturnType<typeof getMyReports>>[number];
type Subjects = Awaited<ReturnType<typeof getTeacherReportableSubjects>>;

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function TeacherReportsPage() {
  const [tab, setTab] = useState<"browse" | "write" | "actions">("browse");
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingActions, setPendingActions] = useState<Report[]>([]);
  const [subjects, setSubjects] = useState<Subjects | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [filterKind, setFilterKind] = useState("");
  const [filterType, setFilterType] = useState("");

  // Write form
  const [form, setForm] = useState({
    date: toDateStr(new Date()),
    subjectType: "STUDENT" as "STUDENT" | "CLASS",
    subjectId: "",
    reportKind: "SIMPLE" as "SIMPLE" | "ACTIONABLE",
    reportType: "",
    content: "",
    actionDescription: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  async function loadReports() {
    try {
      const [r, p] = await Promise.all([
        getMyReports(undefined, filterKind || undefined),
        getMyPendingActionableReports(),
      ]);
      setReports(r);
      setPendingActions(p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getTeacherReportableSubjects().then(setSubjects).catch(() => {});
  }, []);

  useEffect(() => { loadReports(); }, [filterKind]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMarkDone(id: string, done: boolean) {
    startTransition(async () => {
      try {
        await markTeacherReportDone(id, done);
        await loadReports();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    startTransition(async () => {
      try {
        await createTeacherReport({
          date: form.date,
          subjectType: form.subjectType,
          subjectId: form.subjectId,
          reportKind: form.reportKind,
          reportType: form.reportType,
          content: form.content,
          actionDescription: form.reportKind === "ACTIONABLE" ? form.actionDescription : undefined,
        });
        setForm(f => ({ ...f, subjectId: "", reportType: "", content: "", actionDescription: "" }));
        setFormSuccess(true);
        setTimeout(() => setFormSuccess(false), 2000);
        await loadReports();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  const filtered = filterType
    ? reports.filter(r => r.reportType.toLowerCase().includes(filterType.toLowerCase()))
    : reports;

  const subjectOptions = form.subjectType === "STUDENT"
    ? (subjects?.students ?? []).map(s => ({ id: s.id, label: `${s.firstName} ${s.lastName}` }))
    : (subjects?.classes ?? []).map(c => ({ id: c.id, label: c.courseTemplate.name }));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Reports you have written about your students and classes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <button onClick={() => setTab("browse")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === "browse" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          Browse
        </button>
        <button onClick={() => setTab("write")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === "write" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          Write Report
        </button>
        <button onClick={() => setTab("actions")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${tab === "actions" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          Actions
          {pendingActions.length > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
              {pendingActions.length}
            </span>
          )}
        </button>
      </div>

      {/* Browse Tab */}
      {tab === "browse" && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            <select value={filterKind} onChange={e => setFilterKind(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
              <option value="">All types</option>
              <option value="SIMPLE">Simple Notes</option>
              <option value="ACTIONABLE">Actionable</option>
            </select>
            <input type="text" placeholder="Filter by type…" value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-44" />
          </div>
          {loading ? (
            <div className="text-gray-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
              No reports found.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => (
                <div key={r.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-medium text-gray-500">
                          {new Date(r.date as unknown as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.subjectType === "STUDENT" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                          {r.subjectType}
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.reportType}</span>
                        {r.reportKind === "ACTIONABLE" && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.isDone ? "bg-gray-100 text-gray-500" : "bg-orange-100 text-orange-700"}`}>
                            {r.isDone ? "Done" : "Pending action"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-700">{r.subjectName}</p>
                      {r.actionDescription && (
                        <p className="text-xs text-orange-700 mt-0.5">Action: {r.actionDescription}</p>
                      )}
                      {r.content && <p className="text-sm text-gray-600 mt-1">{r.content}</p>}
                    </div>
                    {r.reportKind === "ACTIONABLE" && (
                      <button onClick={() => handleMarkDone(r.id, !r.isDone)} disabled={isPending}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${r.isDone ? "text-gray-500 border-gray-200 hover:bg-gray-50" : "text-white bg-green-600 hover:bg-green-700 border-transparent"}`}>
                        {r.isDone ? "Reopen" : "Mark Done"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Write Report Tab */}
      {tab === "write" && (
        <div className="max-w-lg">
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" value={form.date} max={toDateStr(new Date())}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Report Kind</label>
                <select value={form.reportKind} onChange={e => setForm(f => ({ ...f, reportKind: e.target.value as "SIMPLE" | "ACTIONABLE" }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400">
                  <option value="SIMPLE">Simple Note</option>
                  <option value="ACTIONABLE">Actionable</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject Type</label>
                <select value={form.subjectType} onChange={e => setForm(f => ({ ...f, subjectType: e.target.value as "STUDENT" | "CLASS", subjectId: "" }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400">
                  <option value="STUDENT">Student</option>
                  <option value="CLASS">Class</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{form.subjectType === "STUDENT" ? "Student" : "Class"} *</label>
                <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400">
                  <option value="">Select…</option>
                  {subjectOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Report Type *</label>
              <input type="text" list="report-types" value={form.reportType}
                onChange={e => setForm(f => ({ ...f, reportType: e.target.value }))} required
                placeholder="e.g. Behaviour, Academic, Attendance"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400" />
              <datalist id="report-types">
                {["Behaviour", "Academic", "Attendance", "Health", "Participation", "Other"].map(t => <option key={t} value={t} />)}
              </datalist>
            </div>

            {form.reportKind === "ACTIONABLE" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Action Required *</label>
                <input type="text" value={form.actionDescription}
                  onChange={e => setForm(f => ({ ...f, actionDescription: e.target.value }))} required
                  placeholder="Describe what action needs to be taken…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400" />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Content *</label>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required
                rows={4} placeholder="Describe the observation or incident…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none" />
            </div>

            {formError && <p className="text-xs text-red-500">{formError}</p>}
            {formSuccess && <p className="text-xs text-green-600">Report saved successfully.</p>}

            <button type="submit" disabled={isPending}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60">
              {isPending ? "Saving…" : "Save Report"}
            </button>
          </form>
        </div>
      )}

      {/* Actions Tab */}
      {tab === "actions" && (
        <div>
          {pendingActions.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-700">
              No pending actions.
            </div>
          ) : (
            <div className="space-y-2">
              {pendingActions.map(r => (
                <div key={r.id} className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-gray-500 font-medium">
                          {new Date(r.date as unknown as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.subjectType === "STUDENT" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                          {r.subjectType}
                        </span>
                        <span className="text-xs font-medium text-gray-600">{r.subjectName}</span>
                      </div>
                      {r.actionDescription && (
                        <p className="text-xs font-semibold text-orange-700 mb-1">Action: {r.actionDescription}</p>
                      )}
                      {r.content && <p className="text-sm text-gray-700">{r.content}</p>}
                    </div>
                    <button onClick={() => handleMarkDone(r.id, true)} disabled={isPending}
                      className="shrink-0 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      Mark Done
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
