"use client";

import { useEffect, useState } from "react";
import { getStaff } from "../actions/staff";
import { getBranches } from "../actions/branches";
import StaffForm from "../components/StaffForm";
import StaffTable from "../components/StaffTable";

type StaffMember = Awaited<ReturnType<typeof getStaff>>[number];
type Branch = Awaited<ReturnType<typeof getBranches>>[number];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<StaffMember | null>(null);

  async function load() {
    const [s, b] = await Promise.all([getStaff(), getBranches()]);
    setStaff(s); setBranches(b);
  }
  useEffect(() => { load(); }, []);

  function handleEdit(member: StaffMember) {
    setEditItem(member);
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
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500 text-sm mt-0.5">Non-teaching staff — paid monthly salary, no dashboard access</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditItem(null); }}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Staff"}
        </button>
      </div>
      {(showForm || editItem) && (
        <StaffForm
          branches={branches}
          initial={editItem ?? undefined}
          onSuccess={() => { closeForm(); load(); }}
          onCancel={closeForm}
        />
      )}
      <StaffTable staff={staff} onEdit={handleEdit} onRefresh={load} />
    </div>
  );
}
