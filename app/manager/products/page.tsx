"use client";

import { useEffect, useState, useTransition } from "react";
import { getProductsForBranch, getSalesHistory, recordSale } from "../actions/products";

type Product = Awaited<ReturnType<typeof getProductsForBranch>>[number];
type Sale = Awaited<ReturnType<typeof getSalesHistory>>[number];

export default function ManagerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleProductId, setSaleProductId] = useState("");
  const [saleQty, setSaleQty] = useState("1");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  async function load() {
    const [p, s] = await Promise.all([getProductsForBranch(), getSalesHistory()]);
    setProducts(p);
    setSales(s);
  }

  useEffect(() => { load(); }, []);

  function handleSale() {
    setError(""); setSuccess("");
    const qty = parseInt(saleQty, 10);
    if (!saleProductId) { setError("Select a product"); return; }
    if (isNaN(qty) || qty < 1) { setError("Quantity must be at least 1"); return; }

    startTransition(async () => {
      try {
        await recordSale(saleProductId, qty);
        setSaleProductId("");
        setSaleQty("1");
        setSuccess("Sale recorded successfully");
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to record sale");
      }
    });
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Products</h1>
      <p className="text-gray-500 text-sm mb-8">Branch inventory and sales</p>

      {/* Record Sale */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Record Sale</h2>
        {error && <p className="text-red-600 text-sm mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-3 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Product</label>
            <select value={saleProductId} onChange={e => setSaleProductId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id} disabled={p.stock === 0}>
                  {p.name} — ${p.price.toFixed(2)} ({p.stock} in stock)
                </option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-xs text-gray-500 mb-1">Quantity</label>
            <input type="number" min="1" value={saleQty} onChange={e => setSaleQty(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <button onClick={handleSale} disabled={isPending}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {isPending ? "Saving..." : "Record Sale"}
          </button>
        </div>
      </div>

      {/* Inventory */}
      <h2 className="text-base font-semibold text-gray-800 mb-3">Inventory</h2>
      {products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm mb-8">
          No products in this branch yet.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Name", "Price", "Stock"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-5 py-3 text-gray-800">${p.price.toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.stock === 0 ? "bg-red-100 text-red-700" : p.stock < 5 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                    }`}>
                      {p.stock} in stock
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sales History */}
      <h2 className="text-base font-semibold text-gray-800 mb-3">Sales History</h2>
      {sales.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
          No sales recorded yet.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Product", "Quantity", "Total", "Sold By", "Date"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{s.product.name}</td>
                  <td className="px-5 py-3 text-gray-700">{s.quantity}</td>
                  <td className="px-5 py-3 text-gray-800">${s.totalPrice.toFixed(2)}</td>
                  <td className="px-5 py-3 text-gray-500">{s.soldBy.name}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
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
