"use client";

import { useEffect, useState } from "react";
import { getBranches } from "../actions/branches";
import BranchForm from "../components/BranchForm";
import BranchesTable from "../components/BranchesTable";

type Branch = Awaited<ReturnType<typeof getBranches>>[number];

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Branch | null>(null);

  async function load() { setBranches(await getBranches()); }
  useEffect(() => { load(); }, []);

  function handleEdit(branch: Branch) {
    setEditItem(branch);
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
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage academy branches</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditItem(null); }}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Branch"}
        </button>
      </div>
      {(showForm || editItem) && (
        <BranchForm
          initial={editItem ?? undefined}
          onSuccess={() => { closeForm(); load(); }}
          onCancel={closeForm}
        />
      )}
      <BranchesTable branches={branches} onEdit={handleEdit} onRefresh={load} />
    </div>
  );
}
