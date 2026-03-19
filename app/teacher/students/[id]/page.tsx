"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getStudentProfileForTeacher } from "../../actions/students";
import { getReportsForStudentByTeacher, createTeacherReport, markTeacherReportDone } from "../../actions/reports";
import ReportsSection from "@/components/reports/ReportsSection";

type Student = Awaited<ReturnType<typeof getStudentProfileForTeacher>>;
type Reports = Awaited<ReturnType<typeof getReportsForStudentByTeacher>>;

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function TeacherStudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [reports, setReports] = useState<Reports>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    show: false,
    reportKind: "SIMPLE" as "SIMPLE" | "ACTIONABLE",
    reportType: "",
    content: "",
    actionDescription: "",
  });
  const [formError, setFormError] = useState("");

  async function loadReports() {
    const r = await getReportsForStudentByTeacher(id);
    setReports(r);
  }

  useEffect(() => {
    Promise.all([
      getStudentProfileForTeacher(id),
      getReportsForStudentByTeacher(id),
    ]).then(([s, r]) => {
      setStudent(s);
      setReports(r);
      setLoading(false);
    }).catch(e => {
      setError(e instanceof Error ? e.message : "Failed to load");
      setLoading(false);
    });
  }, [id]);

  function handleMarkDone(reportId: string, done: boolean) {
    startTransition(async () => {
      try {
        await markTeacherReportDone(reportId, done);
        await loadReports();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    startTransition(async () => {
      try {
        await createTeacherReport({
          date: toDateStr(new Date()),
          subjectType: "STUDENT",
          subjectId: id,
          reportKind: form.reportKind,
          reportType: form.reportType,
          content: form.content,
          actionDescription: form.reportKind === "ACTIONABLE" ? form.actionDescription : undefined,
        });
        setForm({ show: false, reportKind: "SIMPLE", reportType: "", content: "", actionDescription: "" });
        await loadReports();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;
  if (error) return <div className="p-8 text-red-600 text-sm">{error}</div>;
  if (!student) return null;

  const EDUCATION_LABELS: Record<string, string> = {
    BELOW_GRADE_6: "Below Grade 6", GRADE_6_AND_ABOVE: "Grade 6 & Above",
    SCHOOL_GRADUATE: "School Graduate", BACHELOR: "Bachelor",
    MASTERS: "Masters", OTHER: "Other",
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/teacher/classes" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{student.firstName} {student.lastName}</h1>
          <p className="text-sm text-gray-400 font-mono mt-0.5">{student.studentId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Student Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Age</span>
                <span className="text-gray-900 font-medium">{student.age}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Education</span>
                <span className="text-gray-900 font-medium">{EDUCATION_LABELS[student.education] ?? student.education}</span>
              </div>
              {student.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span className="text-gray-900 font-medium">{student.phone}</span>
                </div>
              )}
              {student.email && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-900 font-medium">{student.email}</span>
                </div>
              )}
              {student.parentPhone1 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Parent 1</span>
                  <span className="text-gray-900 font-medium">{student.parentPhone1}</span>
                </div>
              )}
              {student.parentPhone2 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Parent 2</span>
                  <span className="text-gray-900 font-medium">{student.parentPhone2}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Enrollments</h2>
            {student.enrollments.length === 0 ? (
              <p className="text-sm text-gray-400">No enrollments.</p>
            ) : (
              <div className="space-y-2">
                {student.enrollments.map(e => (
                  <div key={e.id} className="text-sm">
                    <p className="font-medium text-gray-800">{e.courseClass.courseTemplate.name}</p>
                    <p className="text-xs text-gray-400">
                      Enrolled {new Date(e.enrolledAt).toLocaleDateString("en-GB")}
                      {" · "}
                      <span className={e.status === "ACTIVE" ? "text-green-600" : e.status === "COMPLETED" ? "text-blue-600" : "text-gray-400"}>
                        {e.status}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — Reports */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Reports</h2>
              <button onClick={() => setForm(f => ({ ...f, show: !f.show }))}
                className="text-xs font-medium text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                {form.show ? "Cancel" : "+ Add Report"}
              </button>
            </div>

            {form.show && (
              <form onSubmit={handleSubmitReport} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-2">
                <div className="flex gap-2">
                  <select value={form.reportKind} onChange={e => setForm(f => ({ ...f, reportKind: e.target.value as "SIMPLE" | "ACTIONABLE" }))}
                    className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400">
                    <option value="SIMPLE">Simple Note</option>
                    <option value="ACTIONABLE">Actionable</option>
                  </select>
                  <input type="text" list="report-types-profile" placeholder="Type (e.g. Behaviour)" value={form.reportType}
                    onChange={e => setForm(f => ({ ...f, reportType: e.target.value }))} required
                    className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400" />
                  <datalist id="report-types-profile">
                    {["Behaviour", "Academic", "Attendance", "Health", "Participation", "Other"].map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>
                {form.reportKind === "ACTIONABLE" && (
                  <input type="text" placeholder="Action required…" value={form.actionDescription}
                    onChange={e => setForm(f => ({ ...f, actionDescription: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                )}
                <textarea placeholder="Describe the observation or incident…" value={form.content} rows={3}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none" />
                {formError && <p className="text-xs text-red-500">{formError}</p>}
                <button type="submit" disabled={isPending}
                  className="bg-gray-800 hover:bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md disabled:opacity-50">
                  {isPending ? "Saving…" : "Save Report"}
                </button>
              </form>
            )}

            <ReportsSection reports={reports} onMarkDone={handleMarkDone} isPending={isPending} />
          </div>
        </div>
      </div>
    </div>
  );
}
