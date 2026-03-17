"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getStudent, updateStudent, getClassesForEnrollment,
  enrollStudent, markPaymentPaid,
} from "../../actions/students";
import { EducationLevel } from "@prisma/client";

type Student = Awaited<ReturnType<typeof getStudent>>;
type Classes = Awaited<ReturnType<typeof getClassesForEnrollment>>;

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
};

function currentMonth(startDate: Date | string, durationMonths: number) {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
  return Math.min(Math.max(diffMonths + 1, 1), durationMonths);
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

  async function load() {
    const [s, c] = await Promise.all([getStudent(id), getClassesForEnrollment()]);
    setStudent(s);
    setClasses(c);
    setForm({
      firstName: s.firstName, lastName: s.lastName, age: String(s.age),
      phone: s.phone ?? "", email: s.email ?? "", education: s.education,
      address: s.address ?? "", parentPhone1: s.parentPhone1 ?? "",
      parentPhone2: s.parentPhone2 ?? "", active: String(s.active),
    });
  }

  useEffect(() => { load(); }, [id]);

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

  function handleMarkPaid(paymentId: string) {
    startTransition(async () => {
      try {
        await markPaymentPaid(paymentId);
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to mark paid");
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
          <h2 className="text-base font-semibold text-gray-800">Classes & Payments</h2>
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
                        <td className="px-4 py-2 text-gray-800 font-medium">${p.amount}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {p.status !== "PAID" && (
                            <button
                              onClick={() => handleMarkPaid(p.id)}
                              disabled={isPending}
                              className="text-xs text-teal-600 hover:text-teal-800 font-medium disabled:opacity-40"
                            >
                              Mark Paid
                            </button>
                          )}
                          {p.status === "PAID" && p.paidAt && (
                            <span className="text-xs text-gray-400">Paid {new Date(p.paidAt).toLocaleDateString()}</span>
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
    </div>
  );
}
