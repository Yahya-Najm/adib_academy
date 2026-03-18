"use client";

import { useEffect, useState } from "react";
import { getExams, createExam, updateExam, deleteExam } from "../actions/exams";
import { getTeachersForBranch } from "../actions/teachers";

type Exam = Awaited<ReturnType<typeof getExams>>[number];
type Teacher = Awaited<ReturnType<typeof getTeachersForBranch>>[number];

interface Props {
  courseClassId: string;
  className: string;
  onClose: () => void;
}

export default function ExamsPanel({ courseClassId, className, onClose }: Props) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [editId, setEditId] = useState<string | null>(null);

  // New exam form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [examType, setExamType] = useState<"REGULAR" | "FINAL">("REGULAR");
  const [proctorId, setProctorId] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function load() {
    setExams(await getExams(courseClassId));
  }

  useEffect(() => {
    load();
    getTeachersForBranch().then(setTeachers).catch(() => {});
  }, [courseClassId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setFormError("");
    try {
      await createExam({ courseClassId, title, date, description, examType, proctorId: proctorId || undefined });
      setTitle(""); setDate(""); setDescription(""); setExamType("REGULAR"); setProctorId("");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add exam");
    }
    setSaving(false);
  }

  function startEdit(exam: Exam) {
    setEditId(exam.id);
    setEditTitle(exam.title);
    setEditDate(new Date(exam.date).toISOString().split("T")[0]);
    setEditDescription(exam.description ?? "");
    setEditError("");
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setEditSaving(true); setEditError("");
    try {
      await updateExam(editId, { title: editTitle, date: editDate, description: editDescription });
      setEditId(null);
      await load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update exam");
    }
    setEditSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this exam?")) return;
    await deleteExam(id);
    await load();
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500";

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Exams</h2>
            <p className="text-xs text-gray-400 mt-0.5">{className}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg font-medium">✕</button>
        </div>

        {/* Exam list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {exams.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No exams yet.</p>
          )}
          {exams.map(exam => (
            <div key={exam.id} className="border border-gray-200 rounded-lg p-3">
              {editId === exam.id ? (
                <form onSubmit={handleUpdate} className="space-y-2">
                  <input
                    value={editTitle} onChange={e => setEditTitle(e.target.value)} required
                    className={inputCls} placeholder="Exam title"
                  />
                  <input
                    type="date" value={editDate} onChange={e => setEditDate(e.target.value)} required
                    className={inputCls}
                  />
                  <input
                    value={editDescription} onChange={e => setEditDescription(e.target.value)}
                    className={inputCls} placeholder="Description (optional)"
                  />
                  {editError && <p className="text-xs text-red-500">{editError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={editSaving}
                      className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-1.5 text-xs font-medium disabled:opacity-60 transition-colors"
                    >
                      {editSaving ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={() => setEditId(null)}
                      className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{exam.title}</p>
                    <p className="text-xs text-teal-600 font-medium mt-0.5">
                      {new Date(exam.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {exam.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{exam.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => startEdit(exam)}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-teal-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDelete(exam.id)}
                      className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add exam form */}
        <div className="border-t border-gray-100 px-6 py-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Add Exam</p>
          <form onSubmit={handleAdd} className="space-y-2">
            <input
              value={title} onChange={e => setTitle(e.target.value)} required
              className={inputCls} placeholder="Exam title e.g. Mid-term, Final"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date" value={date} onChange={e => setDate(e.target.value)} required
                className={inputCls}
              />
              <select value={examType} onChange={e => setExamType(e.target.value as "REGULAR" | "FINAL")} className={inputCls}>
                <option value="REGULAR">Regular Exam</option>
                <option value="FINAL">Final Exam</option>
              </select>
            </div>
            <input
              value={description} onChange={e => setDescription(e.target.value)}
              className={inputCls} placeholder="Description (optional)"
            />
            {teachers.length > 0 && (
              <select value={proctorId} onChange={e => setProctorId(e.target.value)} className={inputCls}>
                <option value="">Proctor (optional)</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
            {formError && <p className="text-xs text-red-500">{formError}</p>}
            <button type="submit" disabled={saving}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving ? "Adding…" : "+ Add Exam"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
