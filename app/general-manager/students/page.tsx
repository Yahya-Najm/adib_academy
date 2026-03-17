"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllStudents } from "../actions/students";
import { EducationLevel } from "@prisma/client";

type Student = Awaited<ReturnType<typeof getAllStudents>>[number];

const EDU_LABELS: Record<EducationLevel, string> = {
  BELOW_GRADE_6: "Below Grade 6",
  GRADE_6_AND_ABOVE: "Grade 6 and Above",
  SCHOOL_GRADUATE: "School Graduate",
  BACHELOR: "Bachelor's Degree",
  MASTERS: "Master's Degree",
  OTHER: "Other",
};

export default function GMStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");

  async function load(q?: string) {
    setStudents(await getAllStudents(q));
  }

  useEffect(() => { load(); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search || undefined);
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Students</h1>
        <p className="text-gray-500 text-sm mt-0.5">Students across all branches</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Name", "Age", "Education", "Branch", "Phone", "Active Classes", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No students found</td></tr>
            ) : students.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{s.firstName} {s.lastName}</td>
                <td className="px-4 py-3 text-gray-600">{s.age}</td>
                <td className="px-4 py-3 text-gray-600">{EDU_LABELS[s.education]}</td>
                <td className="px-4 py-3 text-gray-600">{s.branch?.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{s.phone || "—"}</td>
                <td className="px-4 py-3 text-gray-600">
                  {s.enrollments.length > 0
                    ? s.enrollments.map(e => e.courseClass.courseTemplate.name).join(", ")
                    : <span className="text-gray-400">None</span>}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/general-manager/students/${s.id}`} className="text-orange-500 hover:text-orange-700 font-medium text-xs">
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
