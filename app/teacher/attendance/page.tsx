"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import {
  getTeacherAttendanceClasses,
  getTeacherStudentAttendanceContext,
  teacherUpsertStudentAttendance,
  teacherFinalizeClassAttendance,
} from "../actions/attendance";

type ClassItem = Awaited<ReturnType<typeof getTeacherAttendanceClasses>>[number];
type Context = Awaited<ReturnType<typeof getTeacherStudentAttendanceContext>>;

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function TeacherAttendancePage() {
  const today = toDateStr(new Date());
  const [dateStr, setDateStr] = useState(today);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [ctx, setCtx] = useState<Context | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  // Load classes on mount
  useEffect(() => {
    getTeacherAttendanceClasses().then(data => {
      setClasses(data);
      if (data.length > 0) {
        setSelectedClassId(data[0].cls.id);
        if (data[0].sections.length === 1) setSelectedSectionId(data[0].sections[0].id);
      }
    }).catch(() => {});
  }, []);

  // When class changes, auto-select section if only one
  function handleClassChange(classId: string) {
    setSelectedClassId(classId);
    setSelectedSectionId("");
    setCtx(null);
    const found = classes.find(c => c.cls.id === classId);
    if (found?.sections.length === 1) setSelectedSectionId(found.sections[0].id);
  }

  const loadContext = useCallback(() => {
    if (!selectedClassId || !selectedSectionId) return;
    setLoading(true);
    setError("");
    getTeacherStudentAttendanceContext(selectedClassId, selectedSectionId, dateStr)
      .then(setCtx)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [selectedClassId, selectedSectionId, dateStr]);

  useEffect(() => { loadContext(); }, [loadContext]);

  function getRecord(studentId: string) {
    return ctx?.records.find(r => r.studentId === studentId);
  }

  function handleToggle(studentId: string, present: boolean) {
    if (!selectedClassId || !selectedSectionId) return;
    const record = getRecord(studentId);
    startTransition(async () => {
      try {
        await teacherUpsertStudentAttendance({ courseClassId: selectedClassId, classSectionId: selectedSectionId, studentId, date: dateStr, present, isLate: record?.isLate ?? false });
        loadContext();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  function handleLate(studentId: string, isLate: boolean) {
    if (!selectedClassId || !selectedSectionId) return;
    const record = getRecord(studentId);
    if (!record) return;
    startTransition(async () => {
      try {
        await teacherUpsertStudentAttendance({ courseClassId: selectedClassId, classSectionId: selectedSectionId, studentId, date: dateStr, present: record.present, isLate });
        loadContext();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  function handleFinalize() {
    if (!selectedSectionId) return;
    startTransition(async () => {
      try {
        await teacherFinalizeClassAttendance(selectedSectionId, dateStr);
        loadContext();
        setConfirmFinalize(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to finalize");
        setConfirmFinalize(false);
      }
    });
  }

  const selectedClass = classes.find(c => c.cls.id === selectedClassId);
  const selectedSection = selectedClass?.sections.find(s => s.id === selectedSectionId);
  const isHoliday = !!ctx?.holidayLabel;
  const sectionsForClass = selectedClass?.sections ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Student Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Take attendance per section, then finalize to lock it</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {classes.length > 1 && (
            <select value={selectedClassId} onChange={e => handleClassChange(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
              {classes.map(c => (
                <option key={c.cls.id} value={c.cls.id}>{c.cls.courseTemplate.name}</option>
              ))}
            </select>
          )}
          {sectionsForClass.length > 1 && (
            <select value={selectedSectionId} onChange={e => setSelectedSectionId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
              <option value="">Select section…</option>
              {sectionsForClass.map(s => (
                <option key={s.id} value={s.id}>
                  Section {s.sectionNumber}{s.sectionName ? ` — ${s.sectionName}` : ""}
                </option>
              ))}
            </select>
          )}
          <input type="date" value={dateStr} max={today} onChange={e => setDateStr(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
        </div>
      </div>

      {selectedClass && (
        <p className="text-sm text-gray-500 mb-4">
          {selectedClass.cls.courseTemplate.name} · {selectedClass.cls.branch.name}
          {selectedSection && (
            <> · Section {selectedSection.sectionNumber}{selectedSection.sectionName ? ` — ${selectedSection.sectionName}` : ""}</>
          )}
        </p>
      )}

      {!selectedSectionId && classes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
          Select a section to take attendance.
        </div>
      )}

      {selectedSectionId && (
        <>
          {isHoliday && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 px-4 py-2 rounded-lg mb-4 w-fit">
              {ctx?.holidayLabel}
            </div>
          )}

          {ctx?.finalized && (
            <div className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg mb-4 w-fit ${ctx.finalizedByTeacher ? "text-purple-700 bg-purple-50 border border-purple-200" : "text-teal-700 bg-teal-50 border border-teal-200"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {ctx.finalizedByTeacher ? "Attendance finalized by you" : "Attendance finalized by manager"}
            </div>
          )}

          {error && <p className="text-red-600 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          {classes.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
              No active classes assigned to you.
            </div>
          ) : loading ? (
            <div className="text-gray-400 text-sm">Loading…</div>
          ) : !ctx ? null : isHoliday ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <p className="text-sm text-orange-700">No attendance on this day — {ctx.holidayLabel}</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  {ctx.section.enrollments.length} students
                </span>
                {!ctx.finalized && !isHoliday && (
                  confirmFinalize ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Finalize attendance for this section?</span>
                      <button onClick={handleFinalize} disabled={isPending}
                        className="text-xs font-medium text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors">
                        {isPending ? "…" : "Confirm"}
                      </button>
                      <button onClick={() => setConfirmFinalize(false)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmFinalize(true)}
                      className="text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
                      Finalize Attendance
                    </button>
                  )
                )}
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">Student</th>
                    <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">ID</th>
                    <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">Status</th>
                    <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">Late</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ctx.section.enrollments.map(enrollment => {
                    const student = enrollment.student;
                    const record = getRecord(student.id);
                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">{student.firstName} {student.lastName}</td>
                        <td className="px-5 py-3 text-gray-400 text-xs font-mono">{student.studentId}</td>
                        <td className="px-5 py-3">
                          {ctx.finalized ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${record?.present ? "bg-green-100 text-green-700" : record ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                              {record?.present ? "Present" : record ? "Absent" : "Not recorded"}
                            </span>
                          ) : (
                            <div className="flex gap-1.5">
                              <button onClick={() => handleToggle(student.id, true)} disabled={isPending}
                                className={`text-xs font-medium px-3 py-0.5 rounded-full border transition-colors ${record?.present === true ? "bg-green-100 border-green-300 text-green-700" : "border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-700"}`}>
                                Present
                              </button>
                              <button onClick={() => handleToggle(student.id, false)} disabled={isPending}
                                className={`text-xs font-medium px-3 py-0.5 rounded-full border transition-colors ${record?.present === false ? "bg-red-100 border-red-300 text-red-700" : "border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-700"}`}>
                                Absent
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {ctx.finalized ? (
                            record?.isLate ? <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">Late</span> : null
                          ) : (
                            <input type="checkbox" checked={record?.isLate ?? false}
                              onChange={e => handleLate(student.id, e.target.checked)}
                              disabled={isPending || !record}
                              className="w-4 h-4 accent-gray-700 cursor-pointer disabled:opacity-40" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
