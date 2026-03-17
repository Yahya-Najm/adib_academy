"use client";

import { useEffect, useState } from "react";
import { getTeachers } from "../actions/teachers";
import { getBranches } from "../actions/branches";
import TeacherForm from "../components/TeacherForm";
import TeachersTable from "../components/TeachersTable";

type Teacher = Awaited<ReturnType<typeof getTeachers>>[number];
type Branch = Awaited<ReturnType<typeof getBranches>>[number];

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Teacher | null>(null);

  async function load() {
    const [t, b] = await Promise.all([getTeachers(), getBranches()]);
    setTeachers(t); setBranches(b);
  }
  useEffect(() => { load(); }, []);

  function handleEdit(teacher: Teacher) {
    setEditItem(teacher);
    setShowForm(false);
  }

  function closeForm() {
    setShowForm(false);
    setEditItem(null);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-500 text-sm mt-0.5">Teaching staff — paid per class or % of student fees</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditItem(null); }}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Teacher"}
        </button>
      </div>
      {(showForm || editItem) && (
        <TeacherForm
          branches={branches}
          initial={editItem ?? undefined}
          onSuccess={() => { closeForm(); load(); }}
          onCancel={closeForm}
        />
      )}
      <TeachersTable teachers={teachers} onEdit={handleEdit} onRefresh={load} />
    </div>
  );
}
