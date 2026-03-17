"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getStudents, createStudent } from "../actions/students";
import { EducationLevel } from "@prisma/client";

type Student = Awaited<ReturnType<typeof getStudents>>[number];

const EDU_LABELS: Record<EducationLevel, string> = {
  BELOW_GRADE_6: "Below Grade 6",
  GRADE_6_AND_ABOVE: "Grade 6 and Above",
  SCHOOL_GRADUATE: "School Graduate",
  BACHELOR: "Bachelor's Degree",
  MASTERS: "Master's Degree",
  OTHER: "Other",
};

const BLANK = {
  firstName: "", lastName: "", age: "", phone: "", email: "",
  education: "BELOW_GRADE_6" as EducationLevel,
  address: "", parentPhone1: "", parentPhone2: "",
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function load(q?: string) {
    setStudents(await getStudents(q));
  }

  useEffect(() => { load(); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search || undefined);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await createStudent({
          firstName: form.firstName,
          lastName: form.lastName,
          age: Number(form.age),
          phone: form.phone || undefined,
          email: form.email || undefined,
          education: form.education,
          address: form.address || undefined,
          parentPhone1: form.parentPhone1 || undefined,
          parentPhone2: form.parentPhone2 || undefined,
        });
        setShowForm(false);
        setForm(BLANK);
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to create student");
      }
    });
  }

  function field(key: keyof typeof BLANK, label: string, type = "text", required = false) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}{required && " *"}</label>
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          required={required}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage and enroll students in your branch</p>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Student"}
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button type="submit" className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          Search
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(""); load(); }} className="text-sm text-gray-400 hover:text-gray-600 px-2">
            Clear
          </button>
        )}
      </form>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">New Student</h2>
          {error && <p className="text-red-600 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            {field("firstName", "First Name", "text", true)}
            {field("lastName", "Last Name", "text", true)}
            {field("age", "Age", "number", true)}
            {field("phone", "Phone Number")}
            {field("email", "Email", "email")}
            {field("address", "Address")}
            {field("parentPhone1", "Parent Phone 1")}
            {field("parentPhone2", "Parent Phone 2")}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Education Level *</label>
              <select
                value={form.education}
                onChange={e => setForm(f => ({ ...f, education: e.target.value as EducationLevel }))}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {Object.entries(EDU_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button type="submit" disabled={isPending} className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              {isPending ? "Saving..." : "Create Student"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(BLANK); setError(""); }} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Name", "Age", "Education", "Phone", "Active Classes", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No students found</td></tr>
            ) : students.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{s.firstName} {s.lastName}</td>
                <td className="px-4 py-3 text-gray-600">{s.age}</td>
                <td className="px-4 py-3 text-gray-600">{EDU_LABELS[s.education]}</td>
                <td className="px-4 py-3 text-gray-600">{s.phone || "—"}</td>
                <td className="px-4 py-3 text-gray-600">
                  {s.enrollments.length > 0
                    ? s.enrollments.map(e => e.courseClass.courseTemplate.name).join(", ")
                    : <span className="text-gray-400">None</span>}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/manager/students/${s.id}`} className="text-teal-600 hover:text-teal-800 font-medium text-xs">
                    View Profile →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
