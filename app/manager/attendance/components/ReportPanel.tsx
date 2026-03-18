"use client";

import { useState, useTransition } from "react";
import { createReport, deleteReport } from "../../actions/reports";

type Report = {
  id: string;
  reportType: string;
  content: string | null;
  isAutomatic: boolean;
  createdAt: Date;
  manager: { name: string };
};

interface Props {
  date: string;
  subjectType: "STAFF" | "TEACHER" | "STUDENT" | "CLASS";
  subjectId: string;
  reports: Report[];
  finalized: boolean;
  onReportsChange: () => void;
}

export default function ReportPanel({ date, subjectType, subjectId, reports, finalized, onReportsChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [reportType, setReportType] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError("");
    startTransition(async () => {
      try {
        await createReport({ date, subjectType, subjectId, reportType, content });
        setReportType("");
        setContent("");
        setShowForm(false);
        onReportsChange();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to save report");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteReport(id);
        onReportsChange();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  const autoReports = reports.filter(r => r.isAutomatic);
  const manualReports = reports.filter(r => !r.isAutomatic);

  return (
    <div className="mt-2 space-y-2">
      {/* Auto reports (badges) */}
      {autoReports.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {autoReports.map(r => (
            <span key={r.id} className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.reportType === "ABSENT" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
              {r.reportType}
            </span>
          ))}
        </div>
      )}

      {/* Manual reports */}
      {manualReports.map(r => (
        <div key={r.id} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm flex items-start justify-between gap-2">
          <div>
            <span className="font-medium text-gray-700 text-xs uppercase tracking-wide">{r.reportType}</span>
            <p className="text-gray-600 mt-0.5">{r.content}</p>
            <p className="text-gray-400 text-xs mt-0.5">by {r.manager.name} · {new Date(r.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          {!finalized && (
            <button onClick={() => handleDelete(r.id)} disabled={isPending}
              className="text-xs text-red-400 hover:text-red-600 shrink-0 mt-0.5">
              Remove
            </button>
          )}
        </div>
      ))}

      {/* Add report form */}
      {!finalized && (
        <>
          {showForm ? (
            <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
              {error && <p className="text-red-600 text-xs">{error}</p>}
              <input
                type="text"
                placeholder="Report type (e.g. Behavioural, Academic, Complaint…)"
                value={reportType}
                onChange={e => setReportType(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <textarea
                placeholder="Write report details…"
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleSubmit} disabled={isPending || !reportType.trim() || !content.trim()}
                  className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-md">
                  {isPending ? "Saving…" : "Submit Report"}
                </button>
                <button onClick={() => { setShowForm(false); setError(""); }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowForm(true)}
              className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Report
            </button>
          )}
        </>
      )}
    </div>
  );
}
