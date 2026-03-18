"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getStudent, updateStudent, updateStudentId, getClassesForEnrollment,
  enrollStudent, recordPayment, getStudentExamScores,
} from "../../actions/students";
import { getReportsForSubject } from "../../actions/reports";
import { markReportDone } from "../../actions/reports";
import ReportsSection from "@/components/reports/ReportsSection";
import { EducationLevel } from "@prisma/client";

type Student = Awaited<ReturnType<typeof getStudent>>;
type Classes = Awaited<ReturnType<typeof getClassesForEnrollment>>;
type Payment = Student["enrollments"][number]["monthlyPayments"][number];
type StudentReport = Awaited<ReturnType<typeof getReportsForSubject>>[number];
type ExamScore = Awaited<ReturnType<typeof getStudentExamScores>>[number];

const EDU_LABELS: Record<EducationLevel, string> = {
  BELOW_GRADE_6: "Below Grade 6",
  GRADE_6_AND_ABOVE: "Grade 6 and Above",
  SCHOOL_GRADUATE: "School Graduate",
  BACHELOR: "Bachelor's Degree",
  MASTERS: "Master's Degree",
  OTHER: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  OVERDUE: "bg-red-100 text-red-700",
  PARTIAL: "bg-orange-100 text-orange-700",
};

function currentMonth(startDate: Date | string, durationMonths: number) {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
  return Math.min(Math.max(diffMonths + 1, 1), durationMonths);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<Classes>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [enrollClassId, setEnrollClassId] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Student ID inline edit
  const [editingStudentId, setEditingStudentId] = useState(false);
  const [studentIdInput, setStudentIdInput] = useState("");

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<Payment | null>(null);
  const [payForm, setPayForm] = useState({ paidAmount: "", feesRefId: "", discounted: false, paidAt: today() });
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [examScores, setExamScores] = useState<ExamScore[]>([]);

  async function load() {
    const [s, c, reports, scores] = await Promise.all([getStudent(id), getClassesForEnrollment(), getReportsForSubject("STUDENT", id), getStudentExamScores(id)]);
    setStudent(s);
    setClasses(c);
    setStudentReports(reports);
    setExamScores(scores);
    setForm({
      firstName: s.firstName, lastName: s.lastName, age: String(s.age),
      phone: s.phone ?? "", email: s.email ?? "", education: s.education,
      address: s.address ?? "", parentPhone1: s.parentPhone1 ?? "",
      parentPhone2: s.parentPhone2 ?? "", active: String(s.active),
    });
  }

  useEffect(() => { load(); }, [id]);

  function handleMarkDone(reportId: string, done: boolean) {
    startTransition(async () => {
      await markReportDone(reportId, done);
      load();
    });
  }

  function handleSave() {
    setError("");
    startTransition(async () => {
      try {
        await updateStudent(id, {
          firstName: form.firstName, lastName: form.lastName,
          age: Number(form.age), phone: form.phone, email: form.email,
          education: form.education as EducationLevel,
          address: form.address, parentPhone1: form.parentPhone1,
          parentPhone2: form.parentPhone2, active: form.active === "true",
        });
        setEditing(false);
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handleSaveStudentId() {
    setError("");
    startTransition(async () => {
      try {
        await updateStudentId(id, studentIdInput);
        setEditingStudentId(false);
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to update student ID");
      }
    });
  }

  function handleEnroll() {
    if (!enrollClassId) return;
    setError("");
    startTransition(async () => {
      try {
        await enrollStudent(id, enrollClassId);
        setEnrollClassId("");
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to enroll");
      }
    });
  }

  function openPaymentModal(p: Payment) {
    setPaymentModal(p);
    const remaining = p.amount - (p.paidAmount ?? 0);
    setPayForm({ paidAmount: String(remaining), feesRefId: "", discounted: false, paidAt: today() });
  }

  function handleRecordPayment() {
    if (!paymentModal) return;
    const amount = parseFloat(payForm.paidAmount) || 0;
    if (!payForm.discounted && amount <= 0) { setError("Enter a valid amount"); return; }
    if (isNaN(amount) || amount < 0) { setError("Enter a valid amount"); return; }
    if (!payForm.feesRefId.trim()) { setError("Fees reference ID is required"); return; }
    setError("");
    startTransition(async () => {
      try {
        await recordPayment(paymentModal.id, {
          amount,
          feesRefId: payForm.feesRefId,
          discounted: payForm.discounted,
          paidAt: payForm.paidAt || undefined,
        });
        setPaymentModal(null);
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to record payment");
      }
    });
  }

  if (!student) return <div className="p-8 text-gray-400">Loading...</div>;

  const unenrolledClasses = classes.filter(
    c => !student.enrollments.some(e => e.courseClassId === c.id)
  );

  function editField(key: string, label: string, type = "text") {
    return (
      <div>
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
        {editing ? (
          <input
            type={type}
            value={form[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            className="mt-1 w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        ) : (
          <p className="mt-1 text-sm text-gray-800 font-medium">{(student as Record<string, unknown>)[key] as string || "—"}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/manager/students" className="text-gray-400 hover:text-gray-600 text-sm">← Students</Link>
      </div>

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {/* Payment modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Record Payment — Month {paymentModal.monthNumber}</h3>
            <p className="text-xs text-gray-400 mb-4">
              Total: ${paymentModal.amount} · Paid so far: ${paymentModal.paidAmount ?? 0} · Remaining: ${(paymentModal.amount - (paymentModal.paidAmount ?? 0)).toFixed(2)}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount being paid now *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payForm.paidAmount}
                  onChange={e => setPayForm(f => ({ ...f, paidAmount: e.target.value }))}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fees Reference ID *</label>
                <input
                  type="text"
                  value={payForm.feesRefId}
                  onChange={e => setPayForm(f => ({ ...f, feesRefId: e.target.value }))}
                  placeholder="Receipt / reference number"
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={payForm.paidAt}
                  onChange={e => setPayForm(f => ({ ...f, paidAt: e.target.value }))}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={payForm.discounted}
                  onChange={e => setPayForm(f => ({ ...f, discounted: e.target.checked }))}
                  className="rounded"
                />
                Time passed discount applied
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleRecordPayment} disabled={isPending}
                className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
              >
                {isPending ? "Saving..." : "Record Payment"}
              </button>
              <button onClick={() => setPaymentModal(null)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{student.firstName} {student.lastName}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{EDU_LABELS[student.education]}</p>
          </div>
          <div className="flex gap-2 items-center">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${student.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {student.active ? "Active" : "Inactive"}
            </span>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-xs text-teal-600 hover:text-teal-800 font-medium border border-teal-200 px-3 py-1.5 rounded-lg">
                Edit
              </button>
            ) : (
              <>
                <button onClick={handleSave} disabled={isPending} className="text-xs bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-lg">
                  {isPending ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5">
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Student ID row */}
        <div className="mb-4 flex items-center gap-3">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Student ID:</span>
          {editingStudentId ? (
            <>
              <input
                type="text"
                value={studentIdInput}
                onChange={e => setStudentIdInput(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button onClick={handleSaveStudentId} disabled={isPending} className="text-xs bg-teal-600 text-white px-2 py-1 rounded disabled:opacity-50">
                Save
              </button>
              <button onClick={() => setEditingStudentId(false)} className="text-xs text-gray-500 px-2 py-1">
                Cancel
              </button>
            </>
          ) : (
            <>
              <span className="text-sm font-mono font-medium text-gray-800">{student.studentId ?? "—"}</span>
              <button
                onClick={() => { setEditingStudentId(true); setStudentIdInput(student.studentId ?? ""); }}
                className="text-xs text-teal-600 hover:text-teal-800 font-medium"
              >
                Edit
              </button>
            </>
          )}
        </div>

        {editing && (
          <div className="mb-4">
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Status</label>
            <select
              value={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.value }))}
              className="border border-gray-200 rounded px-2 py-1 text-sm"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {editField("firstName", "First Name")}
          {editField("lastName", "Last Name")}
          {editField("age", "Age", "number")}
          {editField("phone", "Phone Number")}
          {editField("email", "Email")}
          {editField("address", "Address")}
          {editField("parentPhone1", "Parent Phone 1")}
          {editField("parentPhone2", "Parent Phone 2")}
          <div className="col-span-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Education Level</span>
            {editing ? (
              <select
                value={form.education}
                onChange={e => setForm(f => ({ ...f, education: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded px-2 py-1 text-sm"
              >
                {Object.entries(EDU_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-sm text-gray-800 font-medium">{EDU_LABELS[student.education]}</p>
            )}
          </div>
        </div>
      </div>

      {/* Enroll in Class */}
      {unenrolledClasses.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Enroll in a Class</h2>
          <div className="flex gap-3">
            <select
              value={enrollClassId}
              onChange={e => setEnrollClassId(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select a class...</option>
              {unenrolledClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.courseTemplate.name} — {c.courseTemplate.durationMonths} months @ ${c.courseTemplate.monthlyFee}/mo
                </option>
              ))}
            </select>
            <button
              onClick={handleEnroll}
              disabled={!enrollClassId || isPending}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Enroll
            </button>
          </div>
        </div>
      )}

      {/* Enrollments */}
      {student.enrollments.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-base font-semibold text-gray-800">Classes &amp; Payments</h2>
          {student.enrollments.map(enrollment => {
            const tmpl = enrollment.courseClass.courseTemplate;
            const month = currentMonth(enrollment.courseClass.startDate, tmpl.durationMonths);
            return (
              <div key={enrollment.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div>
                    <h3 className="font-semibold text-gray-900">{tmpl.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Started {new Date(enrollment.courseClass.startDate).toLocaleDateString()} · Currently in Month {month} of {tmpl.durationMonths}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${enrollment.status === "ACTIVE" ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-500"}`}>
                    {enrollment.status}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Month", "Due Date", "Amount", "Status", ""].map(h => (
                        <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {enrollment.monthlyPayments.map(p => (
                      <tr key={p.id} className={p.monthNumber === month ? "bg-teal-50/30" : ""}>
                        <td className="px-4 py-2 text-gray-700">
                          Month {p.monthNumber}
                          {p.monthNumber === month && <span className="ml-1 text-xs text-teal-600 font-medium">(current)</span>}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{new Date(p.dueDate).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-gray-800 font-medium">
                          ${p.amount}
                          {p.status === "PARTIAL" && p.paidAmount != null && (
                            <span className="ml-1 text-xs text-orange-600 font-normal">(paid ${p.paidAmount})</span>
                          )}
                          {p.discounted && <span className="ml-1 text-xs text-blue-500">discounted</span>}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {p.status !== "PAID" && (
                            <button
                              onClick={() => openPaymentModal(p)}
                              disabled={isPending}
                              className="text-xs text-teal-600 hover:text-teal-800 font-medium disabled:opacity-40"
                            >
                              Record Payment
                            </button>
                          )}
                          {p.status === "PAID" && p.paidAt && (
                            <span className="text-xs text-gray-400">
                              Paid {new Date(p.paidAt).toLocaleDateString()}
                              {p.feesRefId && <span className="ml-1 text-gray-300">#{p.feesRefId}</span>}
                            </span>
                          )}
                          {p.status === "PARTIAL" && p.paidAt && (
                            <button
                              onClick={() => openPaymentModal(p)}
                              disabled={isPending}
                              className="text-xs text-orange-600 hover:text-orange-800 font-medium disabled:opacity-40"
                            >
                              Record Remaining
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {student.enrollments.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-8 bg-white border border-gray-200 rounded-xl">
          Not enrolled in any classes yet
        </div>
      )}

      {/* Exam Scores */}
      {examScores.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mt-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Exam Scores</h2>
          {(() => {
            const finalExams = examScores.filter(s => s.exam.examType === "FINAL");
            const regularExams = examScores.filter(s => s.exam.examType === "REGULAR");
            return (
              <div className="space-y-5">
                {finalExams.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-2">Final Exams</p>
                    <div className="space-y-2">
                      {finalExams.map(s => (
                        <div key={s.id} className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-lg px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{s.exam.title}</p>
                            <p className="text-xs text-gray-400">
                              {s.exam.courseClass.courseTemplate.name} · {new Date(s.exam.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-purple-700">{s.score}</p>
                            {s.exam.scoringFinalized && <p className="text-xs text-gray-400">Finalized</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {regularExams.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Regular Exams</p>
                    <div className="space-y-2">
                      {regularExams.map(s => (
                        <div key={s.id} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{s.exam.title}</p>
                            <p className="text-xs text-gray-400">
                              {s.exam.courseClass.courseTemplate.name} · {new Date(s.exam.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              {s.exam.classMonth != null && ` · Month ${s.exam.classMonth}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-blue-700">{s.score}</p>
                            {s.exam.scoringFinalized && <p className="text-xs text-gray-400">Finalized</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Reports */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mt-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Reports</h2>
        <ReportsSection
          reports={studentReports as Parameters<typeof ReportsSection>[0]["reports"]}
          onMarkDone={handleMarkDone}
          isPending={isPending}
        />
      </div>
    </div>
  );
}
