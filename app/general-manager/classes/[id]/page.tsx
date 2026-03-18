"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getClassDetailGM } from "../../actions/classes";
import { reopenClass, unlockClassMonth, unlockExamScoring } from "../../actions/classes";

type ClassDetail = Awaited<ReturnType<typeof getClassDetailGM>>;

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default function GMClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  async function load() {
    setCls(await getClassDetailGM(id));
  }

  useEffect(() => { load(); }, [id]);

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  function handleReopenClass() {
    setError("");
    startTransition(async () => {
      try {
        await reopenClass(id);
        await load();
        flash("Class reopened successfully.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reopen class");
      }
    });
  }

  function handleUnlockMonth(monthNumber: number) {
    setError("");
    startTransition(async () => {
      try {
        await unlockClassMonth(id, monthNumber);
        await load();
        flash(`Month ${monthNumber} unlocked.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to unlock month");
      }
    });
  }

  function handleUnlockExam(examId: string, examTitle: string) {
    setError("");
    startTransition(async () => {
      try {
        await unlockExamScoring(examId);
        await load();
        flash(`Exam scoring unlocked for "${examTitle}".`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to unlock exam scoring");
      }
    });
  }

  if (!cls) return <div className="p-8 text-gray-400">Loading…</div>;

  const durationMonths = cls.courseTemplate.durationMonths;
  const months = Array.from({ length: durationMonths }, (_, i) => i + 1);
  const finalizedMonthNums = new Set(cls.monthFinalizations.map(f => f.monthNumber));

  const allFinalExam = cls.exams.find(e => e.examType === "FINAL");

  // Exams for selected month by date range
  const monthStart = new Date(cls.startDate);
  monthStart.setMonth(monthStart.getMonth() + (selectedMonth - 1));
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0); monthEnd.setHours(23, 59, 59, 999);

  const monthExams = cls.exams.filter(e => {
    const d = new Date(e.date);
    return d >= monthStart && d <= monthEnd;
  });

  const isMonthFinalized = finalizedMonthNums.has(selectedMonth);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/general-manager/classes" className="text-gray-400 hover:text-gray-600 text-sm">← Classes</Link>
      </div>

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {successMsg && <p className="text-green-700 text-sm mb-4 bg-green-50 px-3 py-2 rounded-lg">{successMsg}</p>}

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
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[cls.status]}`}>
              {cls.status.charAt(0) + cls.status.slice(1).toLowerCase()}
            </span>
            {cls.status === "COMPLETED" && (
              <ConfirmButton
                label="Reopen Class"
                confirmLabel="Confirm Reopen"
                confirmMessage="Reopen this completed class?"
                onConfirm={handleReopenClass}
                isPending={isPending}
                className="text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 px-3 py-1.5 rounded-lg"
              />
            )}
          </div>
        </div>

        {/* Sections */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sections &amp; Teachers</p>
          <div className="flex flex-wrap gap-3">
            {cls.sections.map(s => (
              <span key={s.id} className="text-xs bg-orange-50 text-orange-700 px-3 py-1 rounded-full">
                S{s.sectionNumber}{s.sectionName ? ` (${s.sectionName})` : ""}: {s.teacher.name}
                {s.teacher.userId && <span className="ml-1 font-mono opacity-60">({s.teacher.userId})</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Final exam banner */}
        {allFinalExam && (
          <div className="mt-4 border-t border-gray-100 pt-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Final Exam</span>
              <span className="text-sm font-medium text-gray-900">{allFinalExam.title}</span>
              <span className="text-xs text-gray-500">
                {new Date(allFinalExam.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {allFinalExam.proctor && ` · Proctor: ${allFinalExam.proctor.name}`}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${allFinalExam.scoringFinalized ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {allFinalExam.scoringFinalized ? "Scoring Finalized" : "Scoring Pending"}
              </span>
            </div>
            {allFinalExam.scoringFinalized && (
              <ConfirmButton
                label="Unlock Scoring"
                confirmLabel="Unlock"
                confirmMessage="Unlock final exam scoring?"
                onConfirm={() => handleUnlockExam(allFinalExam.id, allFinalExam.title)}
                isPending={isPending}
                className="text-xs font-medium text-orange-600 border border-orange-200 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg shrink-0"
              />
            )}
          </div>
        )}
      </div>

      {/* Enrolled Students */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          Enrolled Students
          <span className="ml-2 text-xs font-normal text-gray-400">({cls.courseEnrollments.length})</span>
        </h2>
        {cls.courseEnrollments.length === 0 ? (
          <p className="text-sm text-gray-400">No enrolled students.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cls.courseEnrollments.map(e => (
              <Link
                key={e.id}
                href={`/general-manager/students/${e.student.id}`}
                className="inline-flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 text-gray-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 px-3 py-1.5 rounded-full transition-colors"
              >
                {e.student.firstName} {e.student.lastName}
                {e.student.studentId && <span className="font-mono opacity-60">{e.student.studentId}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Month selector */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {months.map(m => {
          const fin = finalizedMonthNums.has(m);
          return (
            <button key={m} onClick={() => setSelectedMonth(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                selectedMonth === m ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-orange-50"
              }`}>
              Month {m}
              {fin && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" title="Finalized" />
              )}
            </button>
          );
        })}
      </div>

      {/* Month panel */}
      <div className="space-y-4">
        {/* Month finalization status */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Month {selectedMonth}</span>
            {isMonthFinalized ? (
              <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Finalized</span>
            ) : (
              <span className="text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full font-medium">Not finalized</span>
            )}
          </div>
          {isMonthFinalized && (
            <ConfirmButton
              label="Unlock Month"
              confirmLabel="Unlock"
              confirmMessage={`Unlock Month ${selectedMonth}? This allows changes.`}
              onConfirm={() => handleUnlockMonth(selectedMonth)}
              isPending={isPending}
              className="text-xs font-medium text-orange-600 border border-orange-200 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg"
            />
          )}
        </div>

        {/* Exams in this month */}
        {monthExams.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            No exams in Month {selectedMonth}.
          </div>
        ) : (
          monthExams.map(exam => (
            <div key={exam.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden ${exam.examType === "FINAL" ? "border-purple-200" : "border-gray-200"}`}>
              <div className={`px-5 py-4 border-b flex items-center justify-between ${exam.examType === "FINAL" ? "border-purple-100 bg-purple-50" : "border-gray-100"}`}>
                <div className="flex items-center gap-3">
                  {exam.examType === "FINAL" && (
                    <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Final</span>
                  )}
                  <div>
                    <h3 className={`text-sm font-semibold ${exam.examType === "FINAL" ? "text-purple-900" : "text-gray-800"}`}>{exam.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(exam.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {exam.proctor && ` · Proctor: ${exam.proctor.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${exam.scoringFinalized ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {exam.scoringFinalized ? "Scoring Finalized" : "Scoring Pending"}
                  </span>
                  {exam.scoringFinalized && (
                    <ConfirmButton
                      label="Unlock"
                      confirmLabel="Unlock"
                      confirmMessage={`Unlock scoring for "${exam.title}"?`}
                      onConfirm={() => handleUnlockExam(exam.id, exam.title)}
                      isPending={isPending}
                      className="text-xs font-medium text-orange-600 border border-orange-200 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg"
                    />
                  )}
                </div>
              </div>

              {/* Scores table */}
              {exam.examScores.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Student</th>
                      <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {exam.examScores.map(sc => (
                      <tr key={sc.id}>
                        <td className="px-5 py-2 text-gray-800">
                          {sc.student.firstName} {sc.student.lastName}
                          {sc.student.studentId && <span className="ml-1.5 text-xs font-mono text-gray-400">{sc.student.studentId}</span>}
                        </td>
                        <td className="px-5 py-2 font-medium text-gray-900">{sc.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ConfirmButton({ label, confirmLabel, confirmMessage, onConfirm, isPending, className }: {
  label: string;
  confirmLabel: string;
  confirmMessage: string;
  onConfirm: () => void;
  isPending: boolean;
  className: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-600">{confirmMessage}</span>
        <button
          onClick={() => { onConfirm(); setConfirming(false); }}
          disabled={isPending}
          className="text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 px-2.5 py-1.5 rounded-lg"
        >
          {isPending ? "…" : confirmLabel}
        </button>
        <button onClick={() => setConfirming(false)} className="text-xs text-gray-500">✕</button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className={className}>
      {label}
    </button>
  );
}
