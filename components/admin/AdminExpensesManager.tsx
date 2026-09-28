"use client";

import { useState } from "react";
import { deleteExpenses } from "@/actions/expense-actions";

export interface AdminExpense {
  id: string;
  shift_id: string | null;
  amount: number | string | null;
  description: string | null;
  created_at: string;
  shift?: Array<{
    worker?: Array<{ name?: string | null }> | { name?: string | null } | null;
  }> | {
    worker?: Array<{ name?: string | null }> | { name?: string | null } | null;
  } | null;
}

type ExpenseTab = "pump" | "worker" | "owner";
type ExpenseGroup = "Pump Expense" | "Worker Expense" | "Owner Expense";

const expenseCategories = [
  "Machine Maintenance",
  "Guest/Hospitality",
  "Utility Bills",
  "Miscellaneous",
  "Worker Expense",
  "Owner Expense",
];

const tabs: Array<{ id: ExpenseTab; label: string; group: ExpenseGroup }> = [
  { id: "pump", label: "Pump Expenses", group: "Pump Expense" },
  { id: "worker", label: "Worker Expenses", group: "Worker Expense" },
  { id: "owner", label: "Owner Expenses", group: "Owner Expense" },
];

function getExpenseDetails(description: string | null) {
  const matchingCategory = expenseCategories.find((category) =>
    description === category || description?.startsWith(`${category} - `)
  );

  if (!matchingCategory) {
    return { group: "Pump Expense" as ExpenseGroup, category: "Pump Expense", description: description || "Station expense" };
  }

  const detail = description === matchingCategory
    ? "Station expense"
    : description?.slice(matchingCategory.length + 3) || "Station expense";
  const group = matchingCategory === "Worker Expense" || matchingCategory === "Owner Expense"
    ? matchingCategory
    : "Pump Expense";

  return { group, category: matchingCategory, description: detail };
}

function getWorkerName(expense: AdminExpense) {
  const shift = Array.isArray(expense.shift) ? expense.shift[0] : expense.shift;
  const worker = Array.isArray(shift?.worker) ? shift.worker[0] : shift?.worker;
  return worker?.name || "Unknown Worker";
}

function formatAmount(amount: number | string | null) {
  return Number(amount || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
}

export default function AdminExpensesManager({ expenses: initialExpenses }: { expenses: AdminExpense[] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [activeTab, setActiveTab] = useState<ExpenseTab>("pump");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeGroup = tabs.find((tab) => tab.id === activeTab)!.group;
  const visibleExpenses = expenses.filter(
    (expense) => getExpenseDetails(expense.description).group === activeGroup
  );
  const allVisibleSelected = visibleExpenses.length > 0 &&
    visibleExpenses.every((expense) => selectedIds.includes(expense.id));
  const grandTotal = expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
  const tabTotal = visibleExpenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);

  function toggleVisibleSelection() {
    const visibleIds = visibleExpenses.map((expense) => expense.id);
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((current) => [...new Set([...current, ...visibleIds])]);
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0 || isDeleting) return;
    const idsToDelete = selectedIds;
    if (!window.confirm(`Are you sure you want to delete these ${idsToDelete.length} expenses? This action cannot be undone.`)) return;

    setIsDeleting(true);
    setNotice(null);
    try {
      const result = await deleteExpenses(idsToDelete);
      if (!result.success) {
        setNotice({ type: "error", text: result.error });
        return;
      }

      const deletedIds = new Set(result.deletedIds);
      setExpenses((current) => current.filter((expense) => !deletedIds.has(expense.id)));
      setSelectedIds([]);
      setNotice({
        type: "success",
        text: `Deleted ${result.deletedIds.length} expense${result.deletedIds.length === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      console.error("Error deleting expenses:", error);
      setNotice({ type: "error", text: "Failed to delete expenses." });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={`rounded-lg border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}
        >
          {notice.text}
        </div>
      )}

      <section className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4" aria-label="Grand expense total">
        <p className="text-xs font-medium uppercase tracking-wider text-amber-300">Grand Total</p>
        <p className="mt-2 text-2xl font-bold text-white">Rs. {formatAmount(grandTotal)}</p>
        <p className="mt-1 text-xs text-zinc-500">{expenses.length} expense record(s)</p>
      </section>

      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
        <div className="border-b border-zinc-800 px-4 pt-3">
          <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Expense categories">
            {tabs.map((tab, index) => {
              const selected = activeTab === tab.id;
              const count = expenses.filter((expense) => getExpenseDetails(expense.description).group === tab.group).length;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`expense-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`expense-panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 rounded-t-lg border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${selected ? "border-amber-400 bg-amber-500/10 text-amber-300" : "border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}
                >
                  {tab.label}<span className="ml-2 text-xs text-zinc-500">{count}</span>
                  <span className="sr-only">Tab {index + 1}</span>
                </button>
              );
            })}
          </div>
        </div>

        <section
          id={`expense-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`expense-tab-${activeTab}`}
          className="space-y-3 p-4"
        >
          <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Tab Total</p>
              <p className="mt-1 text-xl font-bold text-emerald-300">Rs. {formatAmount(tabTotal)}</p>
              <p className="mt-1 text-xs text-zinc-500">{visibleExpenses.length} record(s) in {tabs.find((tab) => tab.id === activeTab)?.label}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleVisibleSelection}
                disabled={visibleExpenses.length === 0 || isDeleting}
                className="rounded-md border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {allVisibleSelected ? "Deselect All" : "Select All"}
              </button>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="rounded-md border border-rose-500/50 bg-rose-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-500 disabled:cursor-wait disabled:opacity-60"
                >
                  {isDeleting ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
                </button>
              )}
            </div>
          </div>

          {visibleExpenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-zinc-950/60 text-[11px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="w-10 px-4 py-3 font-semibold"><span className="sr-only">Select</span></th>
                    <th className="px-4 py-3 font-semibold">Category / Description</th>
                    <th className="px-4 py-3 font-semibold">Worker</th>
                    <th className="px-4 py-3 font-semibold">Uploaded</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {visibleExpenses.map((expense) => {
                    const details = getExpenseDetails(expense.description);
                    const isSelected = selectedIds.includes(expense.id);
                    return (
                      <tr key={expense.id} className={`text-zinc-300 hover:bg-zinc-800/30 ${isSelected ? "bg-rose-500/5" : ""}`}>
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => setSelectedIds((current) => current.includes(expense.id) ? current.filter((id) => id !== expense.id) : [...current, expense.id])}
                            disabled={isDeleting}
                            aria-label={`Select expense: ${details.category}, Rs. ${formatAmount(expense.amount)}`}
                            className="h-4 w-4 cursor-pointer accent-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="block text-xs font-medium text-amber-300">{details.category}</span>
                          <span className="mt-1 block font-medium text-zinc-100">{details.description}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-zinc-200">{getWorkerName(expense)}</span>
                          {expense.shift_id && <span className="mt-1 block font-mono text-xs text-zinc-500">Duty {expense.shift_id.slice(0, 8)}</span>}
                        </td>
                        <td className="px-4 py-3.5 text-zinc-400">
                          {new Date(expense.created_at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold text-emerald-300">Rs. {formatAmount(expense.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-zinc-500">No {tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase()} found.</p>
          )}
        </section>
      </section>
    </div>
  );
}