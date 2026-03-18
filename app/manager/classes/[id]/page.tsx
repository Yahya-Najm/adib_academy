"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getClassDetail, getClassMonthView, upsertExamScore } from "../../actions/classMonthly";

type ClassDetail = Awaited<ReturnType<typeof getClassDetail>>;
type MonthView = Awaited<ReturnType<typeof getClassMonthView>>;

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [monthView, setMonthView] = useState<MonthView | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Score editing state: { [examId-studentId]: string }
  const [scores, setScores] = useState<Record<string, string>>({});
  const [savingScore, setSavingScore] = useState<string | null>(null);

  async function loadClass() {
    const data = await getClassDetail(id);
    setCls(data);
  }

  async function loadMonth(month: number) {
    const data = await getClassMonthView(id, month);
    setMonthView(data);
    // Pre-fill scores from DB
    const s: Record<string, string> = {};
    for (const exam of data.exams) {
      for (const sc of exam.examScores) {
        s[`${exam.id}-${sc.studentId}`] = String(sc.score);
      }
    }
    setScores(s);
  }

  useEffect(() => { loadClass(); }, [id]);
  useEffect(() => { if (cls) loadMonth(selectedMonth); }, [cls, selectedMonth]);

  function scoreKey(examId: string, studentId: string) {
    return `${examId}-${studentId}`;
  }

  function handleScoreBlur(examId: string, studentId: string) {
    const key = scoreKey(examId, studentId);
    const val = scores[key];
    if (val === undefined || val === "") return;
    const num = parseFloat(val);
    if (isNaN(num)) return;

    setSavingScore(key);
    startTransition(async () => {
      try {
        await upsertExamScore(examId, studentId, num);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save score");
      } finally {
        setSavingScore(null);
      }
    });
  }

  if (!cls) return <div className="p-8 text-gray-400">Loading...</div>;

  const durationMonths = cls.courseTemplate.durationMonths;
  const months = Array.from({ length: durationMonths }, (_, i) => i + 1);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/manager/classes" className="text-gray-400 hover:text-gray-600 text-sm">← Classes</Link>
      </div>

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{cls.courseTemplate.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {cls.branch.name} · Started {new Date(cls.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              · {cls.classTime} · {durationMonths} months
            </p>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[cls.status]}`}>
            {cls.status.charAt(0) + cls.status.slice(1).toLowerCase()}
          </span>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sections &amp; Teachers</p>
          <div className="flex flex-wrap gap-3">
            {cls.sections.map(s => (
              <span key={s.id} className="text-xs bg-teal-50 text-teal-700 px-3 py-1 rounded-full">
                S{s.sectionNumber}{s.sectionName ? ` (${s.sectionName})` : ""}: {s.teacher.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {months.map(m => (
          <button
            key={m}
            onClick={() => setSelectedMonth(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedMonth === m
                ? "bg-teal-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-teal-50"
            }`}
          >
            Month {m}
          </button>
        ))}
      </div>

      {/* Month view */}
      {monthView && (
        <div className="space-y-6">
          {/* Exams + Scores */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Exam Scores — Month {selectedMonth}</h2>
            </div>

            {monthView.exams.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No exams scheduled in Month {selectedMonth}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                        Student
                      </th>
                      {monthView.exams.map(exam => (
                        <th key={exam.id} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          <div>{exam.title}</div>
                          <div className="font-normal text-gray-400 normal-case">
                            {new Date(exam.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthView.enrollments.map(enr => (
                      <tr key={enr.id} className="hover:bg-gray-50">
                        <td className="px-5 py-2 sticky left-0 bg-white">
                          <p className="font-medium text-gray-900">{enr.student.firstName} {enr.student.lastName}</p>
                          {enr.student.studentId && (
                            <p className="text-xs font-mono text-gray-400">{enr.student.studentId}</p>
                          )}
                        </td>
                        {monthView.exams.map(exam => {
                          const key = scoreKey(exam.id, enr.student.id);
                          const isSaving = savingScore === key;
                          return (
                            <td key={exam.id} className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={scores[key] ?? ""}
                                onChange={e => setScores(s => ({ ...s, [key]: e.target.value }))}
                                onBlur={() => handleScoreBlur(exam.id, enr.student.id)}
                                disabled={isSaving || isPending}
                                placeholder="—"
                                className={`w-20 border rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                  isSaving ? "bg-teal-50 border-teal-300" : "border-gray-200"
                                }`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Student Attendance placeholder */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-2">Student Attendance — Month {selectedMonth}</h2>
            <p className="text-sm text-gray-400">Coming soon — attendance grid will appear here.</p>
            {monthView.holidays.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs text-gray-500 font-medium">Official holidays this month (will block attendance):</p>
                {monthView.holidays.map(h => (
                  <span key={h.id} className="inline-flex items-center text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full px-3 py-0.5 mr-2">
                    {new Date(h.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — {h.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Teacher Attendance placeholder */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-2">Teacher Attendance — Month {selectedMonth}</h2>
            <p className="text-sm text-gray-400">Coming soon — teacher attendance grid will appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
