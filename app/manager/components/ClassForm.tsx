"use client";

import { useEffect, useState } from "react";
import { createClass, updateClass } from "../actions/classes";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface Template {
  id: string;
  name: string;
  numSections: number;
  durationMonths: number;
  monthlyFee: number;
}

interface Teacher {
  id: string;
  name: string;
  branchId: string | null;
  branch: { name: string } | null;
}

interface SectionState {
  sectionNumber: number;
  sectionName: string;
  teacherId: string;
}

interface InitialClass {
  id: string;
  courseTemplateId: string;
  startDate: Date;
  classTime: string;
  offDays: string[];
  status: string;
  sections: { sectionNumber: number; sectionName: string | null; teacher: { id: string; name: string } }[];
}

interface Props {
  templates: Template[];
  teachers: { own: Teacher[]; others: Teacher[] };
  initial?: InitialClass;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function ClassForm({ templates, teachers, initial, onSuccess, onCancel }: Props) {
  const editing = !!initial;

  const [templateId, setTemplateId] = useState(initial?.courseTemplateId ?? "");
  const [startDate, setStartDate] = useState(
    initial ? new Date(initial.startDate).toISOString().split("T")[0] : ""
  );
  const [classTime, setClassTime] = useState(initial?.classTime ?? "");
  const [offDays, setOffDays] = useState<string[]>(initial?.offDays ?? []);
  const [status, setStatus] = useState(initial?.status ?? "ACTIVE");
  const [sections, setSections] = useState<SectionState[]>(() => {
    if (initial) {
      return initial.sections.map(s => ({
        sectionNumber: s.sectionNumber,
        sectionName: s.sectionName ?? "",
        teacherId: s.teacher.id,
      }));
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedTemplate = templates.find(t => t.id === templateId);

  // When template changes, reset sections array to match numSections
  useEffect(() => {
    if (!selectedTemplate) { setSections([]); return; }
    setSections(
      Array.from({ length: selectedTemplate.numSections }, (_, i) => ({
        sectionNumber: i + 1,
        sectionName: "",
        teacherId: "",
      }))
    );
  }, [templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDay(day: string) {
    setOffDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  function updateSection(index: number, field: keyof SectionState, value: string) {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (editing) {
        await updateClass(initial.id, { startDate, classTime, offDays, status, sections });
      } else {
        await createClass({ courseTemplateId: templateId, startDate, classTime, offDays, sections });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save class");
    }
    setLoading(false);
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-5">
        {editing ? "Edit Class" : "Start New Class"}
      </h2>

      <div className="space-y-5">

        {/* Course Template */}
        {!editing && (
          <div>
            <label className={labelCls}>Course Template *</label>
            <select
              value={templateId} onChange={e => setTemplateId(e.target.value)} required
              className={inputCls}
            >
              <option value="">Select a template…</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.numSections} section{t.numSections > 1 ? "s" : ""}, {t.durationMonths}mo, {t.monthlyFee.toLocaleString()} AFN/mo
                </option>
              ))}
            </select>
          </div>
        )}
        {editing && selectedTemplate && (
          <div className="bg-teal-50 border border-teal-100 rounded-lg px-4 py-2 text-sm text-teal-800">
            Course: <span className="font-semibold">{selectedTemplate.name}</span>
            &nbsp;·&nbsp;{selectedTemplate.numSections} section{selectedTemplate.numSections > 1 ? "s" : ""}
            &nbsp;·&nbsp;{selectedTemplate.durationMonths} months
          </div>
        )}

        {/* Start date + time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Start Date *</label>
            <input
              type="date" required
              value={startDate} onChange={e => setStartDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Class Time *</label>
            <input
              type="time" required
              value={classTime} onChange={e => setClassTime(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Off days */}
        <div>
          <label className={labelCls}>Weekly Off Days</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {DAYS.map(day => (
              <button
                key={day} type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  offDays.includes(day)
                    ? "bg-teal-500 border-teal-500 text-white"
                    : "bg-white border-gray-300 text-gray-600 hover:border-teal-400"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
          {offDays.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">Off: {offDays.join(", ")}</p>
          )}
        </div>

        {/* Status (edit only) */}
        {editing && (
          <div>
            <label className={labelCls}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        )}

        {/* Sections */}
        {sections.length > 0 && (
          <div>
            <label className={labelCls}>
              Sections ({sections.length})
            </label>
            <div className="space-y-3 mt-1">
              {sections.map((section, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Section {section.sectionNumber}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Section Name</label>
                      <input
                        type="text"
                        value={section.sectionName}
                        onChange={e => updateSection(i, "sectionName", e.target.value)}
                        placeholder="e.g. Book, Grammar"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Teacher *</label>
                      <select
                        value={section.teacherId}
                        onChange={e => updateSection(i, "teacherId", e.target.value)}
                        required
                        className={inputCls}
                      >
                        <option value="">Select teacher…</option>
                        {teachers.own.length > 0 && (
                          <optgroup label="Your Branch">
                            {teachers.own.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </optgroup>
                        )}
                        {teachers.others.length > 0 && (
                          <optgroup label="Other Branches">
                            {teachers.others.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.branch?.name ?? "No branch"})
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!editing && !selectedTemplate && (
          <p className="text-xs text-gray-400 italic">Select a course template to configure sections.</p>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit" disabled={loading}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? "Saving..." : editing ? "Save Changes" : "Start Class"}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

      </div>
    </form>
  );
}
