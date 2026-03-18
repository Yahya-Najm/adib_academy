"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { getTeacherAttendanceContext, upsertTeacherAttendance, finalizeTeacherAttendance } from "../../actions/attendance";
import ReportPanel from "../components/ReportPanel";

type Context = Awaited<ReturnType<typeof getTeacherAttendanceContext>>;
type Report = Context["reports"][number];

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function TeacherAttendancePage() {
  const today = toDateStr(new Date());
  const [dateStr, setDateStr] = useState(today);
  const [ctx, setCtx] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    getTeacherAttendanceContext(dateStr)
      .then(setCtx)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [dateStr]);

  useEffect(() => { load(); }, [load]);

  function getRecord(classSectionId: string, teacherId: string) {
    return ctx?.records.find(r => r.classSectionId === classSectionId && r.teacherId === teacherId);
  }

  function getTeacherReports(teacherId: string): Report[] {
    return ctx?.reports.filter(r => r.subjectId === teacherId) ?? [];
  }

  function isTeacherFinalized(teacherId: string) {
    return ctx?.finalizedTeacherIds.includes(teacherId) ?? false;
  }

  function handleToggle(classSectionId: string, teacherId: string, present: boolean) {
    const record = getRecord(classSectionId, teacherId);
    const isLate = record?.isLate ?? false;
    startTransition(async () => {
      try {
        await upsertTeacherAttendance({ classSectionId, teacherId, date: dateStr, present, isLate });
        load();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  function handleLate(classSectionId: string, teacherId: string, isLate: boolean) {
    const record = getRecord(classSectionId, teacherId);
    if (!record) return;
    startTransition(async () => {
      try {
        await upsertTeacherAttendance({ classSectionId, teacherId, date: dateStr, present: record.present, isLate });
        load();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  const isHoliday = !!ctx?.holidayLabel;

  // Group sections by teacher
  const teacherMap = new Map<string, {
    teacher: { id: string; name: string; userId?: string | null };
    sections: Array<{ classSectionId: string; classId: string; className: string; sectionNumber: number; sectionName: string | null }>;
  }>();
  ctx?.classes.forEach(cls => {
    cls.sections.forEach(sec => {
      const key = sec.teacher.id;
      if (!teacherMap.has(key)) teacherMap.set(key, { teacher: sec.teacher, sections: [] });
      teacherMap.get(key)!.sections.push({
        classSectionId: sec.id,
        classId: cls.id,
        className: cls.courseTemplate.name,
        sectionNumber: sec.sectionNumber,
        sectionName: sec.sectionName,
      });
    });
  });

  const allTeacherIds = [...teacherMap.keys()];
  const allFinalized = allTeacherIds.length > 0 && allTeacherIds.every(id => isTeacherFinalized(id));

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <a href="/manager/attendance" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </a>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Teacher Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Finalize each teacher individually to lock their record</p>
        </div>
        <input type="date" value={dateStr} max={today} onChange={e => setDateStr(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
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
          All teacher attendance finalized for this day
        </div>
      )}

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : teacherMap.size === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
          No active classes or teachers for your branch on this day.
        </div>
      ) : (
        <div className="space-y-4">
          {[...teacherMap.values()].map(({ teacher, sections }) => {
            const teacherReports = getTeacherReports(teacher.id);
            const finalized = isTeacherFinalized(teacher.id);
            return (
              <div key={teacher.id} className={`bg-white border rounded-xl overflow-hidden ${finalized ? "border-green-200" : "border-gray-200"}`}>
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-900">{teacher.name}</span>
                    {teacher.userId && <span className="ml-2 text-xs font-mono text-gray-400">{teacher.userId}</span>}
                    <span className="ml-2 text-xs text-gray-500">{sections.length} section{sections.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {finalized ? (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        Finalized
                      </span>
                    ) : !isHoliday && (
                      <FinalizeTeacherButton teacherId={teacher.id} dateStr={dateStr} onFinalized={load} />
                    )}
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">Class</th>
                      <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">Section</th>
                      <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">Status</th>
                      <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">Late</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sections.map(sec => {
                      const record = getRecord(sec.classSectionId, teacher.id);
                      const classHolidayReason = ctx?.classHolidayMap[sec.classId];

                      if (isHoliday || classHolidayReason) {
                        const label = classHolidayReason ? `Class Holiday — ${classHolidayReason}` : ctx?.holidayLabel;
                        return (
                          <tr key={sec.classSectionId} className="bg-orange-50/30">
                            <td className="px-5 py-2 text-gray-600">{sec.className}</td>
                            <td className="px-5 py-2 text-gray-500">
                              Section {sec.sectionNumber}{sec.sectionName ? ` — ${sec.sectionName}` : ""}
                            </td>
                            <td className="px-5 py-2" colSpan={2}>
                              <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">{label}</span>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={sec.classSectionId} className="hover:bg-gray-50">
                          <td className="px-5 py-2 text-gray-600">{sec.className}</td>
                          <td className="px-5 py-2 text-gray-500">
                            Section {sec.sectionNumber}{sec.sectionName ? ` — ${sec.sectionName}` : ""}
                          </td>
                          <td className="px-5 py-2">
                            {finalized ? (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${record?.present ? "bg-green-100 text-green-700" : record ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                                {record?.present ? "Present" : record ? "Absent" : "Not recorded"}
                              </span>
                            ) : (
                              <div className="flex gap-1.5">
                                <button onClick={() => handleToggle(sec.classSectionId, teacher.id, true)} disabled={isPending}
                                  className={`text-xs font-medium px-3 py-0.5 rounded-full border transition-colors ${record?.present === true ? "bg-green-100 border-green-300 text-green-700" : "border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-700"}`}>
                                  Present
                                </button>
                                <button onClick={() => handleToggle(sec.classSectionId, teacher.id, false)} disabled={isPending}
                                  className={`text-xs font-medium px-3 py-0.5 rounded-full border transition-colors ${record?.present === false ? "bg-red-100 border-red-300 text-red-700" : "border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-700"}`}>
                                  Absent
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-2">
                            {finalized ? (
                              record?.isLate ? <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">Late</span> : null
                            ) : (
                              <input type="checkbox" checked={record?.isLate ?? false}
                                onChange={e => handleLate(sec.classSectionId, teacher.id, e.target.checked)}
                                disabled={isPending || !record}
                                className="w-4 h-4 accent-teal-600 cursor-pointer disabled:opacity-40" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="px-5 py-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Teacher Reports</p>
                  <ReportPanel date={dateStr} subjectType="TEACHER" subjectId={teacher.id}
                    reports={teacherReports as Parameters<typeof ReportPanel>[0]["reports"]}
                    finalized={finalized} onReportsChange={load} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FinalizeTeacherButton({ teacherId, dateStr, onFinalized }: { teacherId: string; dateStr: string; onFinalized: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function handleFinalize() {
    startTransition(async () => {
      try {
        await finalizeTeacherAttendance(teacherId, dateStr);
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
