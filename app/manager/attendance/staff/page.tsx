"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import {
  getStaffAttendanceContext,
  upsertStaffAttendance,
  finalizeStaffAttendance,
} from "../../actions/attendance";
import ReportPanel from "../components/ReportPanel";

type Context = Awaited<ReturnType<typeof getStaffAttendanceContext>>;
type Report = Context["reports"][number];

function toDateStr(date: Date) { return date.toISOString().slice(0, 10); }

export default function StaffAttendancePage() {
  const today = toDateStr(new Date());
  const [dateStr, setDateStr] = useState(today);
  const [ctx, setCtx] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    getStaffAttendanceContext(dateStr)
      .then(setCtx)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [dateStr]);

  useEffect(() => { load(); }, [load]);

  function getRecord(userId: string) {
    return ctx?.records.find(r => r.userId === userId);
  }

  function getReports(userId: string): Report[] {
    return ctx?.reports.filter(r => r.subjectId === userId) ?? [];
  }

  function isFinalized(userId: string) {
    return ctx?.finalizedStaffIds.includes(userId) ?? false;
  }

  function handleToggle(userId: string, present: boolean) {
    const record = getRecord(userId);
    const isLate = record?.isLate ?? false;
    startTransition(async () => {
      try {
        await upsertStaffAttendance({ userId, date: dateStr, present, isLate });
        load();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  function handleLate(userId: string, isLate: boolean) {
    const record = getRecord(userId);
    if (record === undefined) return;
    startTransition(async () => {
      try {
        await upsertStaffAttendance({ userId, date: dateStr, present: record.present, isLate });
        load();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  const isHoliday = !!ctx?.holidayLabel;
  const allFinalized = ctx && ctx.staff.length > 0 && ctx.staff.every(s => isFinalized(s.id));

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <a href="/manager/attendance" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </a>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Staff Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Finalize each staff member individually to lock their record</p>
        </div>
        <input
          type="date"
          value={dateStr}
          max={today}
          onChange={e => setDateStr(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {isHoliday && (
        <div className="flex items-center gap-1.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 px-4 py-2 rounded-lg mb-6 w-fit">
          {ctx?.holidayLabel}
        </div>
      )}

      {allFinalized && (
        <div className="flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-lg mb-6 w-fit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          All staff attendance finalized for this day
        </div>
      )}

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : !ctx || ctx.staff.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
          No active staff found for your branch.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Late</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Reports</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ctx.staff.map(member => {
                const record = getRecord(member.id);
                const reports = getReports(member.id);
                const finalized = isFinalized(member.id);

                if (isHoliday) {
                  return (
                    <tr key={member.id} className="bg-orange-50/40">
                      <td className="px-5 py-3 font-medium text-gray-700">
                        <div>{member.name}</div>
                        {member.userId && <div className="text-xs font-mono text-gray-400">{member.userId}</div>}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{member.staffType ?? "—"}</td>
                      <td className="px-5 py-3" colSpan={4}>
                        <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">{ctx.holidayLabel}</span>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={member.id} className={`hover:bg-gray-50 align-top ${finalized ? "bg-green-50/30" : ""}`}>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <div>{member.name}</div>
                      {member.userId && <div className="text-xs font-mono text-gray-400">{member.userId}</div>}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{member.staffType ?? "—"}</td>
                    <td className="px-5 py-3">
                      {finalized ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${record?.present ? "bg-green-100 text-green-700" : record ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                          {record?.present ? "Present" : record ? "Absent" : "Not recorded"}
                        </span>
                      ) : (
                        <div className="flex gap-1.5">
                          <button onClick={() => handleToggle(member.id, true)} disabled={isPending}
                            className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${record?.present === true ? "bg-green-100 border-green-300 text-green-700" : "border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-700"}`}>
                            Present
                          </button>
                          <button onClick={() => handleToggle(member.id, false)} disabled={isPending}
                            className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${record?.present === false ? "bg-red-100 border-red-300 text-red-700" : "border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-700"}`}>
                            Absent
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {finalized ? (
                        record?.isLate ? <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">Late</span> : null
                      ) : (
                        <input type="checkbox" checked={record?.isLate ?? false}
                          onChange={e => handleLate(member.id, e.target.checked)}
                          disabled={isPending || record === undefined}
                          title={record === undefined ? "Mark present or absent first" : ""}
                          className="w-4 h-4 accent-teal-600 cursor-pointer disabled:opacity-40" />
                      )}
                    </td>
                    <td className="px-5 py-3 min-w-[200px]">
                      <ReportPanel date={dateStr} subjectType="STAFF" subjectId={member.id}
                        reports={reports as Parameters<typeof ReportPanel>[0]["reports"]}
                        finalized={finalized} onReportsChange={load} />
                    </td>
                    <td className="px-5 py-3">
                      {!finalized && (
                        <FinalizeStaffButton staffId={member.id} dateStr={dateStr} onFinalized={load} />
                      )}
                      {finalized && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                          Finalized
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FinalizeStaffButton({ staffId, dateStr, onFinalized }: { staffId: string; dateStr: string; onFinalized: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function handleFinalize() {
    startTransition(async () => {
      try {
        await finalizeStaffAttendance(staffId, dateStr);
        onFinalized();
        setConfirm(false);
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Failed to finalize");
      }
    });
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={handleFinalize} disabled={isPending}
          className="text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-2.5 py-1.5 rounded-lg">
          {isPending ? "…" : "Confirm"}
        </button>
        <button onClick={() => setConfirm(false)} className="text-xs text-gray-500 hover:text-gray-700">✕</button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
      Finalize
    </button>
  );
}
