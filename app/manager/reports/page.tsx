"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { createReport, getReportsByDate, getReportableSubjects } from "../actions/reports";

type Subjects = Awaited<ReturnType<typeof getReportableSubjects>>;
type Report = Awaited<ReturnType<typeof getReportsByDate>>[number];

const SUBJECT_TYPES = [
  { value: "STAFF", label: "Staff" },
  { value: "TEACHER", label: "Teacher" },
  { value: "STUDENT", label: "Student" },
  { value: "CLASS", label: "Class" },
] as const;

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function ReportsPage() {
  const today = toDateStr(new Date());

  // Write form state
  const [form, setForm] = useState({
    date: today,
    subjectType: "" as "" | "STAFF" | "TEACHER" | "STUDENT" | "CLASS",
    subjectId: "",
    reportType: "",
    content: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const [subjects, setSubjects] = useState<Subjects | null>(null);

  // View state
  const [viewDate, setViewDate] = useState(today);
  const [viewType, setViewType] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getReportableSubjects().then(setSubjects).catch(() => {});
  }, []);

  const loadReports = useCallback(() => {
    setLoadingReports(true);
    getReportsByDate(viewDate, viewType || undefined)
      .then(data => setReports(data as Report[]))
      .catch(() => setReports([]))
      .finally(() => setLoadingReports(false));
  }, [viewDate, viewType]);

  useEffect(() => { loadReports(); }, [loadReports]);

  function getSubjectOptions() {
    if (!subjects || !form.subjectType) return [];
    if (form.subjectType === "STAFF") return subjects.staff.map(u => ({ id: u.id, label: u.staffType ? `${u.name} (${u.staffType})` : u.name }));
    if (form.subjectType === "TEACHER") return subjects.teachers.map(u => ({ id: u.id, label: u.name }));
    if (form.subjectType === "STUDENT") return subjects.students.map(s => ({ id: s.id, label: `${s.firstName} ${s.lastName} (${s.studentId})` }));
    if (form.subjectType === "CLASS") return subjects.classes.map(c => ({ id: c.id, label: c.courseTemplate.name }));
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
          reportType: form.reportType,
          content: form.content,
        });
        setForm(f => ({ ...f, subjectId: "", reportType: "", content: "" }));
        setFormSuccess(true);
        loadReports();
        setTimeout(() => setFormSuccess(false), 3000);
      } catch (e: unknown) {
        setFormError(e instanceof Error ? e.message : "Failed to submit report");
      }
    });
  }

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

  const subjectOptions = getSubjectOptions();
  const canSubmit = form.subjectType && form.subjectId && form.reportType.trim() && form.content.trim();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Reports</h1>
      <p className="text-gray-500 text-sm mb-8">Write reports about staff, teachers, students, or classes</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Write Report ── */}
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-4">Write a Report</h2>
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
                <label className="block text-xs text-gray-500 mb-1">Category *</label>
                <select value={form.subjectType}
                  onChange={e => setForm(f => ({ ...f, subjectType: e.target.value as typeof form.subjectType, subjectId: "" }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Select…</option>
                  {SUBJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {form.subjectType ? `Select ${SUBJECT_TYPES.find(t => t.value === form.subjectType)?.label} *` : "Select subject *"}
              </label>
              <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                disabled={!form.subjectType}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50">
                <option value="">Choose…</option>
                {subjectOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Report Type *</label>
              <input type="text" value={form.reportType} placeholder="e.g. Behavioural, Academic, Complaint, Equipment, Exam…"
                onChange={e => setForm(f => ({ ...f, reportType: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>

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

        {/* ── View Reports ── */}
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-4">View Reports by Date</h2>

          <div className="flex gap-3 mb-4">
            <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <select value={viewType} onChange={e => setViewType(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">All categories</option>
              {SUBJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {loadingReports ? (
            <div className="text-gray-400 text-sm">Loading…</div>
          ) : reports.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
              No reports for this date{viewType ? ` in ${SUBJECT_TYPES.find(t => t.value === viewType)?.label}` : ""}.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${subjectTypeColor(r.subjectType)}`}>
                        {r.subjectType}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${reportTypeColor(r.reportType)}`}>
                        {r.reportType}
                      </span>
                      {r.isAutomatic && (
                        <span className="text-xs text-gray-400 italic">auto</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(r.createdAt as unknown as string).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">{(r as typeof r & { subjectName?: string }).subjectName ?? r.subjectId}</p>
                  {r.content && <p className="text-sm text-gray-600 mt-1">{r.content}</p>}
                  <p className="text-xs text-gray-400 mt-1.5">by {r.manager.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
