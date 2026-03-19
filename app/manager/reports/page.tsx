"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import {
  createReport,
  deleteReport,
  markReportDone,
  getReportsByDate,
  getReportableSubjects,
  getPendingActionableReports,
} from "../actions/reports";

type Subjects = Awaited<ReturnType<typeof getReportableSubjects>>;
type Report = Awaited<ReturnType<typeof getReportsByDate>>[number];
type ActionableReport = Awaited<ReturnType<typeof getPendingActionableReports>>[number];

const SUBJECT_TYPES = [
  { value: "STAFF", label: "Staff" },
  { value: "TEACHER", label: "Teacher" },
  { value: "STUDENT", label: "Student" },
  { value: "CLASS", label: "Class" },
] as const;

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

function subjectTypeColor(t: string) {
  if (t === "STAFF") return "bg-blue-100 text-blue-700";
  if (t === "TEACHER") return "bg-purple-100 text-purple-700";
  if (t === "STUDENT") return "bg-teal-100 text-teal-700";
  if (t === "CLASS") return "bg-orange-100 text-orange-700";
  return "bg-gray-100 text-gray-600";
}

function reportTypeColor(t: string) {
  if (t === "ABSENT") return "bg-red-100 text-red-700";
  if (t === "LATE") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
}

export default function ReportsPage() {
  const today = toDateStr(new Date());
  const [activeTab, setActiveTab] = useState<"write" | "browse" | "actionable">("browse");

  // Write form
  const [form, setForm] = useState({
    date: today,
    subjectType: "" as "" | "STAFF" | "TEACHER" | "STUDENT" | "CLASS",
    subjectId: "",
    subjectSearch: "",
    reportKind: "SIMPLE" as "SIMPLE" | "ACTIONABLE",
    reportType: "",
    content: "",
    actionDescription: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const [subjects, setSubjects] = useState<Subjects | null>(null);
  const [isPending, startTransition] = useTransition();

  // Browse state
  const [viewDate, setViewDate] = useState(today);
  const [viewType, setViewType] = useState("");
  const [viewKind, setViewKind] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Actionable reports
  const [actionableReports, setActionableReports] = useState<ActionableReport[]>([]);
  const [loadingActionable, setLoadingActionable] = useState(false);

  useEffect(() => {
    getReportableSubjects().then(setSubjects).catch(() => {});
  }, []);

  const loadReports = useCallback(() => {
    setLoadingReports(true);
    getReportsByDate(viewDate, viewType || undefined, viewKind || undefined)
      .then(data => setReports(data as Report[]))
      .catch(() => setReports([]))
      .finally(() => setLoadingReports(false));
  }, [viewDate, viewType, viewKind]);

  const loadActionable = useCallback(() => {
    setLoadingActionable(true);
    getPendingActionableReports()
      .then(data => setActionableReports(data as ActionableReport[]))
      .catch(() => setActionableReports([]))
      .finally(() => setLoadingActionable(false));
  }, []);

  useEffect(() => { if (activeTab === "browse") loadReports(); }, [activeTab, loadReports]);
  useEffect(() => { if (activeTab === "actionable") loadActionable(); }, [activeTab, loadActionable]);

  function getSubjectOptions() {
    if (!subjects || !form.subjectType) return [];
    const search = form.subjectSearch.toLowerCase();
    if (form.subjectType === "STAFF") {
      return subjects.staff
        .filter(u => !search || u.name.toLowerCase().includes(search) || (u.userId ?? "").includes(search))
        .map(u => ({ id: u.id, label: u.staffType ? `${u.name} (${u.staffType})` : u.name, sub: u.userId ?? "" }));
    }
    if (form.subjectType === "TEACHER") {
      return subjects.teachers
        .filter(u => !search || u.name.toLowerCase().includes(search) || (u.userId ?? "").includes(search))
        .map(u => ({ id: u.id, label: u.name, sub: u.userId ?? "" }));
    }
    if (form.subjectType === "STUDENT") {
      return subjects.students
        .filter(s => {
          const full = `${s.firstName} ${s.lastName}`.toLowerCase();
          return !search || full.includes(search) || (s.studentId ?? "").includes(search);
        })
        .map(s => ({ id: s.id, label: `${s.firstName} ${s.lastName}`, sub: s.studentId ?? "" }));
    }
    if (form.subjectType === "CLASS") {
      return subjects.classes
        .filter(c => {
          const name = c.courseTemplate.name.toLowerCase();
          const teachers = c.sections.map(s => s.teacher.name).join(" ").toLowerCase();
          return !search || name.includes(search) || teachers.includes(search);
        })
        .map(c => {
          const teachers = c.sections.map(s => s.teacher.name).join(", ");
          const startYear = new Date(c.startDate).getFullYear();
          return {
            id: c.id,
            label: `${c.courseTemplate.name} (${startYear})`,
            sub: teachers,
          };
        });
    }
    return [];
  }

  function handleSubmit() {
    setFormError("");
    setFormSuccess(false);
    startTransition(async () => {
      try {
        await createReport({
          date: form.date,
          subjectType: form.subjectType as "STAFF" | "TEACHER" | "STUDENT" | "CLASS",
          subjectId: form.subjectId,
          reportKind: form.reportKind,
          reportType: form.reportType,
          content: form.content,
          actionDescription: form.actionDescription || undefined,
        });
        setForm(f => ({ ...f, subjectId: "", subjectSearch: "", reportType: "", content: "", actionDescription: "" }));
        setFormSuccess(true);
        loadReports();
        loadActionable();
        setTimeout(() => setFormSuccess(false), 3000);
      } catch (e: unknown) {
        setFormError(e instanceof Error ? e.message : "Failed to submit report");
      }
    });
  }

  function handleMarkDone(id: string, done: boolean) {
    startTransition(async () => {
      try {
        await markReportDone(id, done);
        loadActionable();
        loadReports();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Failed to update");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteReport(id);
        loadReports();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Failed to delete");
      }
    });
  }

  const subjectOptions = getSubjectOptions();
  const canSubmit = form.subjectType && form.subjectId && form.reportType.trim() && form.content.trim() &&
    (form.reportKind === "SIMPLE" || form.actionDescription.trim());

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm mt-0.5">Write and browse reports about staff, teachers, students, and classes</p>
        </div>
        {actionableReports.length > 0 && (
          <button onClick={() => setActiveTab("actionable")}
            className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-orange-100 transition-colors">
            <span className="bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {actionableReports.length}
            </span>
            Pending Actions
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: "browse", label: "Browse" },
          { key: "write", label: "Write Report" },
          { key: "actionable", label: `Actions${actionableReports.length > 0 ? ` (${actionableReports.length})` : ""}` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Write Report Tab ── */}
      {activeTab === "write" && (
        <div className="max-w-xl">
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            {formError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
            {formSuccess && <p className="text-green-700 text-sm bg-green-50 px-3 py-2 rounded-lg">Report submitted successfully.</p>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date *</label>
                <input type="date" value={form.date} max={today}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Report Kind *</label>
                <select value={form.reportKind}
                  onChange={e => setForm(f => ({ ...f, reportKind: e.target.value as "SIMPLE" | "ACTIONABLE" }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="SIMPLE">Simple (informational)</option>
                  <option value="ACTIONABLE">Actionable (requires action)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Category *</label>
              <select value={form.subjectType}
                onChange={e => setForm(f => ({ ...f, subjectType: e.target.value as typeof form.subjectType, subjectId: "", subjectSearch: "" }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Select…</option>
                {SUBJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {form.subjectType && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Search & Select Subject *</label>
                <input
                  type="text"
                  placeholder={`Search by name or ID…`}
                  value={form.subjectSearch}
                  onChange={e => setForm(f => ({ ...f, subjectSearch: e.target.value, subjectId: "" }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 mb-2"
                />
                {subjectOptions.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    {subjectOptions.map(o => (
                      <button key={o.id} onClick={() => setForm(f => ({ ...f, subjectId: o.id, subjectSearch: o.label }))}
                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-teal-50 transition-colors flex items-center justify-between ${form.subjectId === o.id ? "bg-teal-50 text-teal-700 font-medium" : "text-gray-700"}`}>
                        <span>{o.label}</span>
                        {o.sub && <span className="text-xs font-mono text-gray-400 ml-2 shrink-0">{o.sub}</span>}
                      </button>
                    ))}
                  </div>
                ) : form.subjectSearch ? (
                  <p className="text-xs text-gray-400 px-1">No results for &quot;{form.subjectSearch}&quot;</p>
                ) : null}
                {form.subjectId && (
                  <p className="text-xs text-teal-600 mt-1 font-medium">Selected: {subjectOptions.find(o => o.id === form.subjectId)?.label ?? form.subjectSearch}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-1">Report Type *</label>
              <input type="text" value={form.reportType} placeholder="e.g. Behavioural, Academic, Complaint, Equipment…"
                onChange={e => setForm(f => ({ ...f, reportType: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>

            {form.reportKind === "ACTIONABLE" && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Action Required *</label>
                <input type="text" value={form.actionDescription} placeholder="e.g. Call student's parent, Review class schedule…"
                  onChange={e => setForm(f => ({ ...f, actionDescription: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-1">Details *</label>
              <textarea value={form.content} placeholder="Write the full report here…"
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
            </div>

            <button onClick={handleSubmit} disabled={isPending || !canSubmit}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
              {isPending ? "Submitting…" : "Submit Report"}
            </button>
          </div>
        </div>
      )}

      {/* ── Browse Reports Tab ── */}
      {activeTab === "browse" && (
        <div>
          <div className="flex flex-wrap gap-3 mb-5">
            <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <select value={viewType} onChange={e => setViewType(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">All categories</option>
              {SUBJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={viewKind} onChange={e => setViewKind(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">All kinds</option>
              <option value="SIMPLE">Simple only</option>
              <option value="ACTIONABLE">Actionable only</option>
            </select>
            <button onClick={loadReports}
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Refresh
            </button>
          </div>

          {loadingReports ? (
            <div className="text-gray-400 text-sm">Loading…</div>
          ) : reports.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
              No reports found for this date and filters.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(r => {
                const rWithName = r as typeof r & { subjectName?: string };
                return (
                  <div key={r.id} className={`bg-white border rounded-xl px-5 py-4 ${r.reportKind === "ACTIONABLE" ? "border-orange-200" : "border-gray-200"}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${subjectTypeColor(r.subjectType)}`}>
                          {r.subjectType}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${reportTypeColor(r.reportType)}`}>
                          {r.reportType}
                        </span>
                        {r.reportKind === "ACTIONABLE" && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.isDone ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                            {r.isDone ? "Done" : "Pending Action"}
                          </span>
                        )}
                        {r.isAutomatic && <span className="text-xs text-gray-400 italic">auto</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-400">
                          {new Date(r.createdAt as unknown as string).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {!r.isAutomatic && (
                          <button onClick={() => handleDelete(r.id)} disabled={isPending}
                            className="text-xs text-red-400 hover:text-red-600">Remove</button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700">{rWithName.subjectName ?? r.subjectId}</p>
                    {r.reportKind === "ACTIONABLE" && r.actionDescription && (
                      <p className="text-xs font-medium text-orange-700 mt-1">Action: {r.actionDescription}</p>
                    )}
                    {r.content && <p className="text-sm text-gray-600 mt-1">{r.content}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-400">by {r.manager?.name ?? r.teacher?.name ?? "Unknown"}</p>
                      {r.reportKind === "ACTIONABLE" && (
                        <button onClick={() => handleMarkDone(r.id, !r.isDone)} disabled={isPending}
                          className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${r.isDone ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                          {r.isDone ? "Mark Undone" : "Mark Done"}
                        </button>
                      )}
                    </div>
                    {r.isDone && r.doneBy && (
                      <p className="text-xs text-green-600 mt-1">
                        Resolved by {r.doneBy.name} · {r.doneAt ? new Date(r.doneAt as unknown as string).toLocaleDateString("en-GB") : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Actionable Reports Tab ── */}
      {activeTab === "actionable" && (
        <div>
          <p className="text-sm text-gray-500 mb-5">All pending actionable reports — mark each as done once completed.</p>

          {loadingActionable ? (
            <div className="text-gray-400 text-sm">Loading…</div>
          ) : actionableReports.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center text-green-700 font-medium text-sm">
              No pending actions — everything is handled.
            </div>
          ) : (
            <div className="space-y-3">
              {actionableReports.map(r => {
                const rWithName = r as typeof r & { subjectName?: string };
                return (
                  <div key={r.id} className="bg-white border border-orange-200 rounded-xl px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${subjectTypeColor(r.subjectType)}`}>
                            {r.subjectType}
                          </span>
                          <span className="text-xs font-medium text-gray-700">{rWithName.subjectName ?? r.subjectId}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(r.date as unknown as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-orange-700 mb-1">Action required: {r.actionDescription}</p>
                        <p className="text-sm text-gray-700">{r.content}</p>
                        <p className="text-xs text-gray-400 mt-1.5">Reported by {r.manager?.name ?? r.teacher?.name ?? "Unknown"}</p>
                      </div>
                      <button onClick={() => handleMarkDone(r.id, true)} disabled={isPending}
                        className="shrink-0 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
                        Mark Done
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
