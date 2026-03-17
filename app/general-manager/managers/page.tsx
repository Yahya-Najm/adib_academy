"use client";

import { useEffect, useState } from "react";
import { getManagers } from "../actions/managers";
import { getBranches } from "../actions/branches";
import ManagerForm from "../components/ManagerForm";
import ManagersTable from "../components/ManagersTable";

type Manager = Awaited<ReturnType<typeof getManagers>>[number];
type Branch = Awaited<ReturnType<typeof getBranches>>[number];

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Manager | null>(null);

  async function load() {
    const [m, b] = await Promise.all([getManagers(), getBranches()]);
    setManagers(m); setBranches(b);
  }
  useEffect(() => { load(); }, []);

  function handleEdit(manager: Manager) {
    setEditItem(manager);
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
          <h1 className="text-2xl font-bold text-gray-900">Managers</h1>
          <p className="text-gray-500 text-sm mt-0.5">Branch managers — paid monthly salary</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditItem(null); }}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Manager"}
        </button>
      </div>
      {(showForm || editItem) && (
        <ManagerForm
          branches={branches}
          initial={editItem ?? undefined}
          onSuccess={() => { closeForm(); load(); }}
          onCancel={closeForm}
        />
      )}
      <ManagersTable managers={managers} onEdit={handleEdit} onRefresh={load} />
    </div>
  );
}
