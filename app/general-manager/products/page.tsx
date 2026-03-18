"use client";

import { useEffect, useState, useTransition } from "react";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../actions/products";
import { getBranches } from "../actions/branches";

type Product = Awaited<ReturnType<typeof getProducts>>[number];
type Branch = Awaited<ReturnType<typeof getBranches>>[number];

const emptyForm = { name: "", price: "", stock: "0", branchId: "" };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function load() {
    const [p, b] = await Promise.all([getProducts(), getBranches()]);
    setProducts(p);
    setBranches(b);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditItem(null);
    setForm({ ...emptyForm, branchId: branches[0]?.id ?? "" });
    setError("");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditItem(p);
    setForm({ name: p.name, price: String(p.price), stock: String(p.stock), branchId: p.branchId });
    setError("");
    setShowForm(false);
  }

  function handleSubmit() {
    setError("");
    const price = parseFloat(form.price);
    const stock = parseInt(form.stock, 10);
    if (isNaN(price) || price < 0) { setError("Price must be a valid non-negative number"); return; }
    if (isNaN(stock) || stock < 0) { setError("Stock must be a valid non-negative number"); return; }

    startTransition(async () => {
      try {
        if (editItem) {
          await updateProduct(editItem.id, { name: form.name, price, stock, branchId: form.branchId });
          setEditItem(null);
        } else {
          await createProduct({ name: form.name, price, stock, branchId: form.branchId });
          setShowForm(false);
        }
        setForm({ ...emptyForm });
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to save product");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteProduct(id);
        setConfirmId(null);
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  const isEditing = !!editItem;
  const showInlineForm = showForm || isEditing;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage branch product inventory</p>
        </div>
        <button
          onClick={() => { if (isEditing) setEditItem(null); else showForm ? setShowForm(false) : openCreate(); }}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm || isEditing ? "Cancel" : "+ Add Product"}
        </button>
      </div>

      {showInlineForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">
            {isEditing ? "Edit Product" : "New Product"}
          </h2>
          {error && <p className="text-red-600 text-sm mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Product Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Branch *</label>
              <select value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">Select branch...</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Price *</label>
              <input type="number" min="0" step="0.01" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Stock</label>
              <input type="number" min="0" value={form.stock}
                onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} disabled={isPending}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {isPending ? "Saving..." : isEditing ? "Save Changes" : "Add Product"}
            </button>
            <button onClick={() => { setShowForm(false); setEditItem(null); setError(""); }}
              className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirmId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Delete Product</h3>
            <p className="text-sm text-gray-500 mb-4">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(confirmId)} disabled={isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium">
                {isPending ? "Deleting..." : "Delete"}
              </button>
              <button onClick={() => setConfirmId(null)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
          No products yet.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Name", "Branch", "Price", "Stock", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-5 py-3 text-gray-500">{p.branch.name}</td>
                  <td className="px-5 py-3 text-gray-800">${p.price.toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.stock === 0 ? "bg-red-100 text-red-700" : p.stock < 5 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                    }`}>
                      {p.stock} in stock
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(p)}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium px-2 py-1 rounded hover:bg-orange-50">
                        Edit
                      </button>
                      <button onClick={() => setConfirmId(p.id)}
                        className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
