"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getTeacherClassDetail, upsertTeacherExamScore, finalizeTeacherExamScoring } from "../../actions/classes";
import { getReportsForStudentByTeacher, createTeacherReport, markTeacherReportDone } from "../../actions/reports";
import ReportsSection from "@/components/reports/ReportsSection";

type ClassDetail = Awaited<ReturnType<typeof getTeacherClassDetail>>;
type Exam = ClassDetail["cls"]["exams"][number];
type Enrollment = ClassDetail["cls"]["courseEnrollments"][number];
type StudentReports = Awaited<ReturnType<typeof getReportsForStudentByTeacher>>;

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function TeacherClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"students" | "exams" | "reports">("students");
  const [isPending, startTransition] = useTransition();

  // Exam scoring state
  const [scoringExamId, setScoringExamId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [scoreError, setScoreError] = useState("");

  // Reports state
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentReports, setStudentReports] = useState<StudentReports | null>(null);
  const [reportForm, setReportForm] = useState({ show: false, subjectType: "STUDENT" as "STUDENT" | "CLASS", subjectId: "", reportKind: "SIMPLE" as "SIMPLE" | "ACTIONABLE", reportType: "", content: "", actionDescription: "" });
  const [reportError, setReportError] = useState("");

  async function load() {
    try {
      const data = await getTeacherClassDetail(id);
      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadStudentReports(studentDbId: string) {
    try {
      const r = await getReportsForStudentByTeacher(studentDbId);
      setStudentReports(r);
      setSelectedStudentId(studentDbId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    }
  }

  function startScoring(exam: Exam) {
    setScoringExamId(exam.id);
    const initial: Record<string, string> = {};
    exam.examScores.forEach(s => { initial[s.student.id] = s.score.toString(); });
    setScores(initial);
    setScoreError("");
  }

  function handleSaveScore(examId: string, studentId: string) {
    const val = parseFloat(scores[studentId] ?? "");
    if (isNaN(val) || val < 0) { setScoreError("Enter a valid score"); return; }
    startTransition(async () => {
      try {
        await upsertTeacherExamScore(examId, studentId, val);
        await load();
      } catch (e) {
        setScoreError(e instanceof Error ? e.message : "Failed to save score");
      }
    });
  }

  function handleFinalizeExam(examId: string) {
    startTransition(async () => {
      try {
        await finalizeTeacherExamScoring(examId);
        await load();
        setScoringExamId(null);
      } catch (e) {
        setScoreError(e instanceof Error ? e.message : "Failed to finalize");
      }
    });
  }

  function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    setReportError("");
    startTransition(async () => {
      try {
        await createTeacherReport({
          date: toDateStr(new Date()),
          subjectType: reportForm.subjectType,
          subjectId: reportForm.subjectId,
          reportKind: reportForm.reportKind,
          reportType: reportForm.reportType,
          content: reportForm.content,
          actionDescription: reportForm.reportKind === "ACTIONABLE" ? reportForm.actionDescription : undefined,
        });
        setReportForm(f => ({ ...f, show: false, reportType: "", content: "", actionDescription: "" }));
        if (selectedStudentId) await loadStudentReports(selectedStudentId);
      } catch (e) {
        setReportError(e instanceof Error ? e.message : "Failed to save report");
      }
    });
  }

  function handleMarkDone(reportId: string, done: boolean) {
    startTransition(async () => {
      try {
        await markTeacherReportDone(reportId, done);
        if (selectedStudentId) await loadStudentReports(selectedStudentId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;
  if (error) return <div className="p-8 text-red-600 text-sm">{error}</div>;
  if (!detail) return null;

  const { cls, teacherId } = detail;
  const mySection = cls.sections.find(s => s.teacher.id === teacherId);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/teacher/classes" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{cls.courseTemplate.name}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls.status === "ACTIVE" ? "bg-green-50 text-green-700" : cls.status === "COMPLETED" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
              {cls.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {cls.branch.name} · {cls.classTime} · Started {new Date(cls.startDate).toLocaleDateString("en-GB")}
            {mySection && ` · Section ${mySection.sectionNumber}${mySection.sectionName ? ` — ${mySection.sectionName}` : ""}`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {(["students", "exams", "reports"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${activeTab === tab ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {tab}
            {tab === "students" && <span className="ml-1.5 text-xs text-gray-400">({cls.courseEnrollments.length})</span>}
            {tab === "exams" && <span className="ml-1.5 text-xs text-gray-400">({cls.exams.length})</span>}
          </button>
        ))}
      </div>

      {/* Students Tab */}
      {activeTab === "students" && (
        <div>
          {cls.courseEnrollments.length === 0 ? (
            <p className="text-sm text-gray-400">No students enrolled.</p>
          ) : (
            <div className="space-y-2">
              {cls.courseEnrollments.map((enrollment: Enrollment) => {
                const s = enrollment.student;
                const isSelected = selectedStudentId === s.id;
                return (
                  <div key={s.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 flex items-center justify-between gap-3">
                      <div>
                        <Link href={`/teacher/students/${s.id}`} className="font-medium text-gray-900 hover:text-gray-600 hover:underline text-sm">
                          {s.firstName} {s.lastName}
                        </Link>
                        <span className="text-xs text-gray-400 ml-2 font-mono">{s.studentId}</span>
                        {s.phone && <span className="text-xs text-gray-400 ml-2">{s.phone}</span>}
                      </div>
                      <button onClick={() => isSelected ? setSelectedStudentId(null) : loadStudentReports(s.id)}
                        className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                        {isSelected ? "Hide Reports" : "View Reports"}
                      </button>
                    </div>
                    {isSelected && studentReports !== null && (
                      <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reports</p>
                          <button onClick={() => setReportForm({ show: true, subjectType: "STUDENT", subjectId: s.id, reportKind: "SIMPLE", reportType: "", content: "", actionDescription: "" })}
                            className="text-xs text-gray-600 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-white transition-colors">
                            + Add Report
                          </button>
                        </div>
                        {reportForm.show && reportForm.subjectId === s.id && (
                          <form onSubmit={handleSubmitReport} className="bg-white border border-gray-200 rounded-lg p-4 mb-3 space-y-2">
                            <div className="flex gap-2">
                              <select value={reportForm.reportKind} onChange={e => setReportForm(f => ({ ...f, reportKind: e.target.value as "SIMPLE" | "ACTIONABLE" }))}
                                className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400">
                                <option value="SIMPLE">Simple Note</option>
                                <option value="ACTIONABLE">Actionable</option>
                              </select>
                              <input type="text" placeholder="Type (e.g. Behaviour, Academic)" value={reportForm.reportType}
                                onChange={e => setReportForm(f => ({ ...f, reportType: e.target.value }))} required
                                className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400" />
                            </div>
                            {reportForm.reportKind === "ACTIONABLE" && (
                              <input type="text" placeholder="Action required…" value={reportForm.actionDescription}
                                onChange={e => setReportForm(f => ({ ...f, actionDescription: e.target.value }))}
                                className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                            )}
                            <textarea placeholder="Report content…" value={reportForm.content} rows={2}
                              onChange={e => setReportForm(f => ({ ...f, content: e.target.value }))} required
                              className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none" />
                            {reportError && <p className="text-xs text-red-500">{reportError}</p>}
                            <div className="flex gap-2">
                              <button type="submit" disabled={isPending} className="bg-gray-800 hover:bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md disabled:opacity-50">Save</button>
                              <button type="button" onClick={() => setReportForm(f => ({ ...f, show: false }))} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                            </div>
                          </form>
                        )}
                        <ReportsSection reports={studentReports} onMarkDone={handleMarkDone} isPending={isPending} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Exams Tab */}
      {activeTab === "exams" && (
        <div className="space-y-4">
          {cls.exams.length === 0 ? (
            <p className="text-sm text-gray-400">No exams for this class yet.</p>
          ) : (
            cls.exams.map((exam: Exam) => {
              const isScoring = scoringExamId === exam.id;
              const today = toDateStr(new Date());
              const examDate = toDateStr(new Date(exam.date));
              const isPast = examDate <= today;
              return (
                <div key={exam.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-semibold text-gray-900">{exam.title}</span>
                      <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${exam.examType === "FINAL" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                        {exam.examType === "FINAL" ? "Final" : "Regular"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{new Date(exam.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                      {exam.scoringFinalized ? (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                          Scoring Finalized
                        </span>
                      ) : isPast && (
                        <button onClick={() => isScoring ? setScoringExamId(null) : startScoring(exam)}
                          className="text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-2.5 py-1.5 rounded-lg transition-colors">
                          {isScoring ? "Close" : "Enter Scores"}
                        </button>
                      )}
                    </div>
                  </div>

                  {exam.description && <p className="px-5 py-2 text-xs text-gray-500">{exam.description}</p>}
                  {exam.proctor && <p className="px-5 py-1 text-xs text-gray-400">Proctor: {exam.proctor.name}</p>}

                  {/* Scores */}
                  {(isScoring || exam.scoringFinalized) && (
                    <div className="px-5 py-4">
                      {scoreError && <p className="text-xs text-red-500 mb-2">{scoreError}</p>}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-1.5 text-xs font-medium text-gray-400">Student</th>
                            <th className="text-left py-1.5 text-xs font-medium text-gray-400">Score</th>
                            {isScoring && !exam.scoringFinalized && <th className="py-1.5" />}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {cls.courseEnrollments.map((enrollment: Enrollment) => {
                            const s = enrollment.student;
                            const existing = exam.examScores.find(sc => sc.student.id === s.id);
                            return (
                              <tr key={s.id}>
                                <td className="py-2 text-gray-700">{s.firstName} {s.lastName}</td>
                                <td className="py-2">
                                  {isScoring && !exam.scoringFinalized ? (
                                    <input type="number" min="0" step="0.5"
                                      value={scores[s.id] ?? existing?.score?.toString() ?? ""}
                                      onChange={e => setScores(sc => ({ ...sc, [s.id]: e.target.value }))}
                                      className="w-24 border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400" />
                                  ) : (
                                    <span className={existing ? "text-gray-700 font-medium" : "text-gray-400 italic"}>
                                      {existing ? existing.score : "—"}
                                    </span>
                                  )}
                                </td>
                                {isScoring && !exam.scoringFinalized && (
                                  <td className="py-2 pl-2">
                                    <button onClick={() => handleSaveScore(exam.id, s.id)} disabled={isPending}
                                      className="text-xs text-gray-600 border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-50 disabled:opacity-50">
                                      Save
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {isScoring && !exam.scoringFinalized && (
                        <div className="mt-3">
                          <button onClick={() => handleFinalizeExam(exam.id)} disabled={isPending}
                            className="text-xs font-medium text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors">
                            {isPending ? "…" : "Finalize Scoring"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Reports about this class</p>
            <button onClick={() => setReportForm({ show: true, subjectType: "CLASS", subjectId: id, reportKind: "SIMPLE", reportType: "", content: "", actionDescription: "" })}
              className="text-xs font-medium text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              + Add Report
            </button>
          </div>
          {reportForm.show && reportForm.subjectType === "CLASS" && (
            <form onSubmit={handleSubmitReport} className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex gap-2">
                <select value={reportForm.reportKind} onChange={e => setReportForm(f => ({ ...f, reportKind: e.target.value as "SIMPLE" | "ACTIONABLE" }))}
                  className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400">
                  <option value="SIMPLE">Simple Note</option>
                  <option value="ACTIONABLE">Actionable</option>
                </select>
                <input type="text" placeholder="Type (e.g. Behaviour, Academic)" value={reportForm.reportType}
                  onChange={e => setReportForm(f => ({ ...f, reportType: e.target.value }))} required
                  className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400" />
              </div>
              {reportForm.reportKind === "ACTIONABLE" && (
                <input type="text" placeholder="Action required…" value={reportForm.actionDescription}
                  onChange={e => setReportForm(f => ({ ...f, actionDescription: e.target.value }))}
                  className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
              )}
              <textarea placeholder="Report content…" value={reportForm.content} rows={3}
                onChange={e => setReportForm(f => ({ ...f, content: e.target.value }))} required
                className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none" />
              {reportError && <p className="text-xs text-red-500">{reportError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={isPending} className="bg-gray-800 hover:bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setReportForm(f => ({ ...f, show: false }))} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            </form>
          )}
          <p className="text-sm text-gray-400">Class-level reports coming soon. Use student profiles or the Reports page to view per-student reports.</p>
        </div>
      )}
    </div>
  );
}
