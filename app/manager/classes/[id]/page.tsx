"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getClassDetail,
  getClassMonthView,
  upsertExamScore,
  finalizeClassMonth,
  markClassCompleted,
} from "../../actions/classMonthly";
import { finalizeExamScoring, createExam } from "../../actions/exams";
import { getTeachersForBranch } from "../../actions/teachers";
import ReportsSection from "@/components/reports/ReportsSection";
import { getReportsForSubject, markReportDone } from "../../actions/reports";

type ClassDetail = Awaited<ReturnType<typeof getClassDetail>>;
type MonthView = Awaited<ReturnType<typeof getClassMonthView>>;
type Reports = Awaited<ReturnType<typeof getReportsForSubject>>;
type Teacher = Awaited<ReturnType<typeof getTeachersForBranch>>[number];

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
  const [reports, setReports] = useState<Reports>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const [scores, setScores] = useState<Record<string, string>>({});
  const [savingScore, setSavingScore] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"exams" | "reports">("exams");

  // Add exam form state
  const [showAddExam, setShowAddExam] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newExamType, setNewExamType] = useState<"REGULAR" | "FINAL">("REGULAR");
  const [newExamDesc, setNewExamDesc] = useState("");
  const [newExamProctor, setNewExamProctor] = useState("");
  const [addingExam, setAddingExam] = useState(false);
  const [addExamError, setAddExamError] = useState("");

  async function loadClass() {
    const data = await getClassDetail(id);
    setCls(data);
  }

  async function loadMonth(month: number) {
    const data = await getClassMonthView(id, month);
    setMonthView(data);
    const s: Record<string, string> = {};
    for (const exam of data.exams) {
      for (const sc of exam.examScores) {
        s[`${exam.id}-${sc.studentId}`] = String(sc.score);
      }
    }
    setScores(s);
  }

  async function loadReports() {
    const data = await getReportsForSubject("CLASS", id);
    setReports(data);
  }

  useEffect(() => {
    loadClass();
    loadReports();
    getTeachersForBranch().then(setTeachers).catch(() => {});
  }, [id]);
  useEffect(() => { if (cls) loadMonth(selectedMonth); }, [cls, selectedMonth]);

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  function scoreKey(examId: string, studentId: string) { return `${examId}-${studentId}`; }

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

  function handleFinalizeExam(examId: string) {
    startTransition(async () => {
      try {
        await finalizeExamScoring(examId);
        await loadClass();
        await loadMonth(selectedMonth);
        flash("Exam scoring finalized.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to finalize exam");
      }
    });
  }

  function handleFinalizeMonth() {
    startTransition(async () => {
      try {
        await finalizeClassMonth(id, selectedMonth);
        await loadClass();
        flash(`Month ${selectedMonth} finalized.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to finalize month");
      }
    });
  }

  function handleMarkComplete() {
    startTransition(async () => {
      try {
        await markClassCompleted(id);
        await loadClass();
        flash("Class marked as completed.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to mark complete");
      }
    });
  }

  function handleMarkReportDone(reportId: string, done: boolean) {
    startTransition(async () => {
      try {
        await markReportDone(reportId, done);
        await loadReports();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update report");
      }
    });
  }

  async function handleAddExam(e: React.FormEvent) {
    e.preventDefault();
    if (!cls) return;
    setAddingExam(true);
    setAddExamError("");
    try {
      await createExam({
        courseClassId: id,
        title: newExamTitle,
        date: newExamDate,
        description: newExamDesc || undefined,
        examType: newExamType,
        proctorId: newExamProctor || undefined,
      });
      setNewExamTitle("");
      setNewExamDate("");
      setNewExamType("REGULAR");
      setNewExamDesc("");
      setNewExamProctor("");
      setShowAddExam(false);
      await loadClass();
      await loadMonth(selectedMonth);
      flash("Exam added.");
    } catch (err) {
      setAddExamError(err instanceof Error ? err.message : "Failed to add exam");
    }
    setAddingExam(false);
  }

  if (!cls) return <div className="p-8 text-gray-400">Loading...</div>;

  const durationMonths = cls.courseTemplate.durationMonths;
  const months = Array.from({ length: durationMonths }, (_, i) => i + 1);
  const finalizedMonthNums = new Set(cls.monthFinalizations.map(f => f.monthNumber));

  // Separate regular and final exams for selected month
  const regularExams = monthView?.exams.filter(e => e.examType === "REGULAR") ?? [];
  const finalExams = monthView?.exams.filter(e => e.examType === "FINAL") ?? [];

  // Also check all-class final exam
  const allFinalExam = cls.exams.find(e => e.examType === "FINAL");
  const isMonthFinalized = finalizedMonthNums.has(selectedMonth);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/manager/classes" className="text-gray-400 hover:text-gray-600 text-sm">← Classes</Link>
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
            {cls.status === "ACTIVE" && (
              <CompleteClassButton onConfirm={handleMarkComplete} isPending={isPending} />
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sections &amp; Teachers</p>
          <div className="flex flex-wrap gap-3">
            {cls.sections.map(s => (
              <span key={s.id} className="text-xs bg-teal-50 text-teal-700 px-3 py-1 rounded-full">
                S{s.sectionNumber}{s.sectionName ? ` (${s.sectionName})` : ""}: {s.teacher.name}
                {s.teacher.userId && <span className="ml-1 font-mono opacity-60">({s.teacher.userId})</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Final exam status banner */}
        {allFinalExam && (
          <div className={`mt-4 border-t border-gray-100 pt-4 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Final Exam</span>
              <span className="text-sm font-medium text-gray-900">{allFinalExam.title}</span>
              <span className="text-xs text-gray-500">
                {new Date(allFinalExam.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {allFinalExam.proctor && ` · Proctor: ${allFinalExam.proctor.name}`}
              </span>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${allFinalExam.scoringFinalized ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              {allFinalExam.scoringFinalized ? "Scoring Finalized" : "Scoring Pending"}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        {[{ key: "exams", label: "Months & Exams" }, { key: "reports", label: `Reports (${reports.length})` }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "reports" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Class Reports</h2>
          <ReportsSection reports={reports} onMarkDone={handleMarkReportDone} isPending={isPending} />
        </div>
      )}

      {activeTab === "exams" && (
        <>
          {/* Month selector */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {months.map(m => {
              const fin = finalizedMonthNums.has(m);
              return (
                <button key={m} onClick={() => setSelectedMonth(m)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                    selectedMonth === m ? "bg-teal-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-teal-50"
                  }`}>
                  Month {m}
                  {fin && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" title="Finalized" />
                  )}
                </button>
              );
            })}
          </div>

          {monthView && (
            <div className="space-y-6">
              {/* Month finalization status */}
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Month {selectedMonth}</span>
                  {isMonthFinalized ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      Finalized
                    </span>
                  ) : (
                    <span className="text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full font-medium">Not finalized</span>
                  )}
                </div>
                {!isMonthFinalized && cls.status === "ACTIVE" && (
                  <FinalizeMonthButton onConfirm={handleFinalizeMonth} isPending={isPending} month={selectedMonth} />
                )}
              </div>

              {/* Final Exam Section (if in this month) */}
              {finalExams.length > 0 && finalExams.map(exam => (
                <ExamScoreTable
                  key={exam.id}
                  exam={exam}
                  enrollments={monthView.enrollments}
                  scores={scores}
                  setScores={setScores}
                  scoreKey={scoreKey}
                  savingScore={savingScore}
                  isPending={isPending}
                  handleScoreBlur={handleScoreBlur}
                  handleFinalizeExam={handleFinalizeExam}
                  isFinal={true}
                  isClassCompleted={cls.status === "COMPLETED"}
                />
              ))}

              {/* Regular Exams */}
              {regularExams.length > 0 && regularExams.map(exam => (
                <ExamScoreTable
                  key={exam.id}
                  exam={exam}
                  enrollments={monthView.enrollments}
                  scores={scores}
                  setScores={setScores}
                  scoreKey={scoreKey}
                  savingScore={savingScore}
                  isPending={isPending}
                  handleScoreBlur={handleScoreBlur}
                  handleFinalizeExam={handleFinalizeExam}
                  isFinal={false}
                  isClassCompleted={cls.status === "COMPLETED"}
                />
              ))}

              {regularExams.length === 0 && finalExams.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
                  No exams scheduled in Month {selectedMonth}.
                </div>
              )}

              {/* Add Exam */}
              {cls.status === "ACTIVE" && !isMonthFinalized && (
                <div className="bg-white border border-dashed border-gray-300 rounded-xl p-5">
                  {!showAddExam ? (
                    <button onClick={() => setShowAddExam(true)}
                      className="w-full text-sm text-teal-700 font-medium hover:text-teal-800 flex items-center justify-center gap-1.5 py-1">
                      <span className="text-lg leading-none">+</span> Add Exam to Month {selectedMonth}
                    </button>
                  ) : (
                    <form onSubmit={handleAddExam} className="space-y-3">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">New Exam — Month {selectedMonth}</p>
                      <input
                        value={newExamTitle} onChange={e => setNewExamTitle(e.target.value)} required
                        placeholder="Exam title"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date" value={newExamDate} onChange={e => setNewExamDate(e.target.value)} required
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <select value={newExamType} onChange={e => setNewExamType(e.target.value as "REGULAR" | "FINAL")}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                          <option value="REGULAR">Regular</option>
                          <option value="FINAL">Final</option>
                        </select>
                      </div>
                      <input
                        value={newExamDesc} onChange={e => setNewExamDesc(e.target.value)}
                        placeholder="Description (optional)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      {teachers.length > 0 && (
                        <select value={newExamProctor} onChange={e => setNewExamProctor(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                          <option value="">Proctor (optional)</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      )}
                      {addExamError && <p className="text-xs text-red-500">{addExamError}</p>}
                      <div className="flex gap-2">
                        <button type="submit" disabled={addingExam || isPending}
                          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-60 transition-colors">
                          {addingExam ? "Adding…" : "Add Exam"}
                        </button>
                        <button type="button" onClick={() => { setShowAddExam(false); setAddExamError(""); }}
                          className="px-4 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Official holidays */}
              {monthView.holidays.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Official Holidays This Month</p>
                  <div className="flex flex-wrap gap-2">
                    {monthView.holidays.map(h => (
                      <span key={h.id} className="inline-flex items-center text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full px-3 py-0.5">
                        {new Date(h.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — {h.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

type ExamWithScores = ClassDetail["exams"][number];

function ExamScoreTable({
  exam,
  enrollments,
  scores,
  setScores,
  scoreKey,
  savingScore,
  isPending,
  handleScoreBlur,
  handleFinalizeExam,
  isFinal,
  isClassCompleted,
}: {
  exam: ExamWithScores;
  enrollments: MonthView["enrollments"];
  scores: Record<string, string>;
  setScores: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  scoreKey: (examId: string, studentId: string) => string;
  savingScore: string | null;
  isPending: boolean;
  handleScoreBlur: (examId: string, studentId: string) => void;
  handleFinalizeExam: (examId: string) => void;
  isFinal: boolean;
  isClassCompleted: boolean;
}) {
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  return (
    <div className={`bg-white border rounded-xl shadow-sm overflow-hidden ${isFinal ? "border-purple-200" : "border-gray-200"}`}>
      <div className={`px-5 py-4 border-b flex items-center justify-between ${isFinal ? "border-purple-100 bg-purple-50" : "border-gray-100"}`}>
        <div className="flex items-center gap-3">
          {isFinal && (
            <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Final</span>
          )}
          <div>
            <h2 className={`text-base font-semibold ${isFinal ? "text-purple-900" : "text-gray-800"}`}>{exam.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(exam.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              {exam.proctor && ` · Proctor: ${exam.proctor.name}`}
              {exam.description && ` · ${exam.description}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {exam.scoringFinalized ? (
            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Finalized
            </span>
          ) : !isClassCompleted && (
            confirmFinalize ? (
              <div className="flex items-center gap-1.5">
                <button onClick={() => { handleFinalizeExam(exam.id); setConfirmFinalize(false); }} disabled={isPending}
                  className="text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-2.5 py-1.5 rounded-lg">
                  {isPending ? "…" : "Confirm"}
                </button>
                <button onClick={() => setConfirmFinalize(false)} className="text-xs text-gray-500">✕</button>
              </div>
            ) : (
              <button onClick={() => setConfirmFinalize(true)}
                className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                Finalize Scores
              </button>
            )
          )}
        </div>
      </div>

      {enrollments.length === 0 ? (
        <div className="p-6 text-center text-gray-400 text-sm">No enrolled students.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {enrollments.map(enr => {
                const key = scoreKey(exam.id, enr.student.id);
                const isSaving = savingScore === key;
                const score = scores[key];
                return (
                  <tr key={enr.id} className="hover:bg-gray-50">
                    <td className="px-5 py-2 sticky left-0 bg-white">
                      <p className="font-medium text-gray-900">{enr.student.firstName} {enr.student.lastName}</p>
                      {enr.student.studentId && (
                        <p className="text-xs font-mono text-gray-400">{enr.student.studentId}</p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {exam.scoringFinalized || isClassCompleted ? (
                        <span className={`text-sm font-medium ${score ? "text-gray-900" : "text-gray-400"}`}>
                          {score ?? "—"}
                        </span>
                      ) : (
                        <input
                          type="number" min="0" step="0.5"
                          value={score ?? ""}
                          onChange={e => setScores(s => ({ ...s, [key]: e.target.value }))}
                          onBlur={() => handleScoreBlur(exam.id, enr.student.id)}
                          disabled={isSaving || isPending}
                          placeholder="—"
                          className={`w-24 border rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                            isSaving ? "bg-teal-50 border-teal-300" : "border-gray-200"
                          }`}
                        />
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

function FinalizeMonthButton({ onConfirm, isPending, month }: { onConfirm: () => void; isPending: boolean; month: number }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-600">Lock Month {month}?</span>
        <button onClick={() => { onConfirm(); setConfirm(false); }} disabled={isPending}
          className="text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-2.5 py-1.5 rounded-lg">
          {isPending ? "…" : "Confirm"}
        </button>
        <button onClick={() => setConfirm(false)} className="text-xs text-gray-500">✕</button>
      </div>
    );
  }
  return (
    <button onClick={() => setConfirm(true)}
      className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors">
      Finalize Month
    </button>
  );
}

function CompleteClassButton({ onConfirm, isPending }: { onConfirm: () => void; isPending: boolean }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-600">Mark class complete?</span>
        <button onClick={() => { onConfirm(); setConfirm(false); }} disabled={isPending}
          className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-2.5 py-1.5 rounded-lg">
          {isPending ? "…" : "Complete"}
        </button>
        <button onClick={() => setConfirm(false)} className="text-xs text-gray-500">✕</button>
      </div>
    );
  }
  return (
    <button onClick={() => setConfirm(true)}
      className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
      Mark Complete
    </button>
  );
}
