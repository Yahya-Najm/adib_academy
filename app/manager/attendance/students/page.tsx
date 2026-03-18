"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { getStudentAttendanceContext, upsertStudentAttendance, addClassHoliday, deleteClassHoliday, finalizeDay, removeClassHolidayByClassDate } from "../../actions/attendance";
import ReportPanel from "../components/ReportPanel";

type Context = Awaited<ReturnType<typeof getStudentAttendanceContext>>;
type Report = Context["reports"][number];

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function StudentAttendancePage() {
  const today = toDateStr(new Date());
  const [dateStr, setDateStr] = useState(today);
  const [ctx, setCtx] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  // Per-class holiday form state
  const [holidayForms, setHolidayForms] = useState<Record<string, { show: boolean; reason: string; error: string }>>({});

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    getStudentAttendanceContext(dateStr)
      .then(setCtx)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [dateStr]);

  useEffect(() => { load(); }, [load]);

  function getRecord(courseClassId: string, studentId: string) {
    return ctx?.records.find(r => r.courseClassId === courseClassId && r.studentId === studentId);
  }

  function getReports(subjectType: "STUDENT" | "CLASS", subjectId: string): Report[] {
    return ctx?.reports.filter(r => r.subjectType === subjectType && r.subjectId === subjectId) ?? [];
  }

  function handleToggle(courseClassId: string, studentId: string, present: boolean) {
    const record = getRecord(courseClassId, studentId);
    startTransition(async () => {
      try {
        await upsertStudentAttendance({ courseClassId, studentId, date: dateStr, present, isLate: record?.isLate ?? false });
        load();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  function handleLate(courseClassId: string, studentId: string, isLate: boolean) {
    const record = getRecord(courseClassId, studentId);
    if (!record) return;
    startTransition(async () => {
      try {
        await upsertStudentAttendance({ courseClassId, studentId, date: dateStr, present: record.present, isLate });
        load();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  function handleAddClassHoliday(courseClassId: string) {
    const form = holidayForms[courseClassId];
    if (!form?.reason.trim()) return;
    startTransition(async () => {
      try {
        await addClassHoliday({ courseClassId, date: dateStr, reason: form.reason });
        setHolidayForms(f => ({ ...f, [courseClassId]: { show: false, reason: "", error: "" } }));
        load();
      } catch (e: unknown) {
        setHolidayForms(f => ({ ...f, [courseClassId]: { ...f[courseClassId], error: e instanceof Error ? e.message : "Failed" } }));
      }
    });
  }

  function handleRemoveClassHoliday(id: string) {
    startTransition(async () => {
      try {
        await deleteClassHoliday(id);
        load();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to remove holiday");
      }
    });
  }

  function handleFinalize() {
    startTransition(async () => {
      try {
        await finalizeDay(dateStr);
        load();
        setConfirmFinalize(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to finalize");
      }
    });
  }

  const finalized = !!ctx?.finalization;
  const isHoliday = !!ctx?.holidayLabel;

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <a href="/manager/attendance" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </a>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Student Attendance</h1>
        </div>
        <input type="date" value={dateStr} max={today} onChange={e => setDateStr(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {finalized && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Finalized by {ctx?.finalization?.manager.name}
          </span>
        )}
        {isHoliday && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg">
            {ctx?.holidayLabel}
          </span>
        )}
        {!finalized && !isHoliday && !loading && ctx && (
          confirmFinalize ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Finalize and lock this day?</span>
              <button onClick={handleFinalize} disabled={isPending}
                className="text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-3 py-1.5 rounded-lg">
                {isPending ? "Finalizing…" : "Confirm"}
              </button>
              <button onClick={() => setConfirmFinalize(false)} className="text-sm text-gray-500">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmFinalize(true)}
              className="text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-4 py-1.5 rounded-lg">
              Finalize Day
            </button>
          )
        )}
      </div>

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : !ctx || ctx.classes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
          No active classes for your branch on this day.
        </div>
      ) : (
        <div className="space-y-6">
          {ctx.classes.map(cls => {
            const classHolidayReason = ctx.classHolidayMap[cls.id];
            const holidayForm = holidayForms[cls.id] ?? { show: false, reason: "", error: "" };
            const classReports = getReports("CLASS", cls.id);

            return (
              <div key={cls.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Class header */}
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-semibold text-gray-900">{cls.courseTemplate.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{cls.classTime} · {cls.courseEnrollments.length} students</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {classHolidayReason ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                          Class Holiday — {classHolidayReason}
                        </span>
                        {!finalized && (
                          <button
                            onClick={() => handleRemoveClassHolidayByClassDate(cls.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Remove Holiday
                          </button>
                        )}
                      </div>
                    ) : !finalized && !isHoliday && (
                      holidayForm.show ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Holiday reason…"
                            value={holidayForm.reason}
                            onChange={e => setHolidayForms(f => ({ ...f, [cls.id]: { ...f[cls.id], reason: e.target.value, error: "" } }))}
                            className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 w-44"
                          />
                          {holidayForm.error && <span className="text-xs text-red-600">{holidayForm.error}</span>}
                          <button onClick={() => handleAddClassHoliday(cls.id)} disabled={isPending || !holidayForm.reason.trim()}
                            className="text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 px-2 py-1 rounded-md">
                            Add
                          </button>
                          <button onClick={() => setHolidayForms(f => ({ ...f, [cls.id]: { show: false, reason: "", error: "" } }))}
                            className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setHolidayForms(f => ({ ...f, [cls.id]: { show: true, reason: "", error: "" } }))}
                          className="text-xs text-orange-600 hover:text-orange-800 font-medium border border-orange-200 px-2 py-0.5 rounded-md hover:bg-orange-50">
                          + Class Holiday
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* If class holiday or branch holiday — show all students as holiday */}
                {(isHoliday || classHolidayReason) ? (
                  <div className="px-5 py-4">
                    <p className="text-sm text-orange-700">
                      All students marked as <strong>Holiday</strong> — {classHolidayReason ?? ctx.holidayLabel}
                    </p>
                    <div className="mt-2 space-y-1">
                      {cls.courseEnrollments.map(e => (
                        <div key={e.student.id} className="text-sm text-gray-500 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-300 inline-block" />
                          {e.student.firstName} {e.student.lastName}
                          <span className="text-xs text-gray-400">({e.student.studentId})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">Student</th>
                          <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">ID</th>
                          <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">Status</th>
                          <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">Late</th>
                          <th className="px-5 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {cls.courseEnrollments.map(enrollment => {
                          const student = enrollment.student;
                          const record = getRecord(cls.id, student.id);
                          const reports = getReports("STUDENT", student.id);

                          return (
                            <tr key={student.id} className="hover:bg-gray-50 align-top">
                              <td className="px-5 py-3 font-medium text-gray-900">{student.firstName} {student.lastName}</td>
                              <td className="px-5 py-3 text-gray-400 text-xs font-mono">{student.studentId}</td>
                              <td className="px-5 py-3">
                                {finalized ? (
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${record?.present ? "bg-green-100 text-green-700" : record ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                                    {record?.present ? "Present" : record ? "Absent" : "Not recorded"}
                                  </span>
                                ) : (
                                  <div className="flex gap-1.5">
                                    <button onClick={() => handleToggle(cls.id, student.id, true)} disabled={isPending}
                                      className={`text-xs font-medium px-3 py-0.5 rounded-full border transition-colors ${record?.present === true ? "bg-green-100 border-green-300 text-green-700" : "border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-700"}`}>
                                      Present
                                    </button>
                                    <button onClick={() => handleToggle(cls.id, student.id, false)} disabled={isPending}
                                      className={`text-xs font-medium px-3 py-0.5 rounded-full border transition-colors ${record?.present === false ? "bg-red-100 border-red-300 text-red-700" : "border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-700"}`}>
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
                                    onChange={e => handleLate(cls.id, student.id, e.target.checked)}
                                    disabled={isPending || !record}
                                    className="w-4 h-4 accent-teal-600 cursor-pointer disabled:opacity-40" />
                                )}
                              </td>
                              <td className="px-5 py-3 min-w-[200px]">
                                <ReportPanel
                                  date={dateStr}
                                  subjectType="STUDENT"
                                  subjectId={student.id}
                                  reports={reports as Parameters<typeof ReportPanel>[0]["reports"]}
                                  finalized={finalized}
                                  onReportsChange={load}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Class-level reports */}
                    <div className="px-5 py-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Class Reports</p>
                      <ReportPanel
                        date={dateStr}
                        subjectType="CLASS"
                        subjectId={cls.id}
                        reports={classReports as Parameters<typeof ReportPanel>[0]["reports"]}
                        finalized={finalized}
                        onReportsChange={load}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  function handleRemoveClassHolidayByClassDate(courseClassId: string) {
    startTransition(async () => {
      try {
        await removeClassHolidayByClassDate(courseClassId, dateStr);
        load();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to remove holiday");
      }
    });
  }
}
