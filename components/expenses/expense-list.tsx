"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Filter, Pencil, Plus, Trash2, X } from "lucide-react";
import { createExpense, deleteExpense, updateExpense } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";

type ExpenseListItem = {
  id: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: Date;
  notes: string | null;
};

type ExpenseListProps = {
  expenses: ExpenseListItem[];
  currentPage: number;
  totalItems: number;
  pageSize: number;
  filters: {
    fromDate: string;
    toDate: string;
    category: string;
  };
};

export function ExpenseList({ expenses, currentPage, totalItems, pageSize, filters }: ExpenseListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<ExpenseListItem | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseListItem | null>(null);
  const preserveParams = {
    ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
    ...(filters.toDate ? { toDate: filters.toDate } : {}),
    ...(filters.category ? { category: filters.category } : {})
  };
  const categoryOptions = ["RENT", "SALARY", "PRODUCT", "UTILITY", "OTHER"];

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Expense List</CardTitle>
          <Button type="button" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </CardHeader>
        <CardContent>
          <form className="mb-4 grid gap-3 md:grid-cols-[180px_180px_1fr_auto_auto] md:items-end">
            <div className="space-y-2"><Label>From Date</Label><Input name="fromDate" type="date" defaultValue={filters.fromDate} /></div>
            <div className="space-y-2"><Label>To Date</Label><Input name="toDate" type="date" defaultValue={filters.toDate} /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select name="category" defaultValue={filters.category} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">All categories</option>
                <option value="RENT">Rent</option>
                <option value="SALARY">Salary</option>
                <option value="PRODUCT">Product</option>
                <option value="UTILITY">Utility</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <Button type="submit"><Filter className="h-4 w-4" />Apply</Button>
            <Button asChild variant="outline"><Link href="/expenses"><X className="h-4 w-4" />Reset</Link></Button>
          </form>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Date</th><th>Title</th><th>Category</th><th>Amount</th><th className="sticky right-0 z-10 w-36 border-l bg-card text-center">Action</th></tr></thead>
            <tbody>{expenses.length ? expenses.map((expense) => (
              <tr key={expense.id} className="border-b">
                <td className="py-3">{expense.expenseDate.toLocaleDateString()}</td><td className="font-medium">{expense.title}</td><td><Badge>{expense.category}</Badge></td><td>${String(expense.amount)}</td>
                <td className="sticky right-0 z-10 border-l bg-card">
                  <div className="flex justify-center gap-1">
                    <Button variant="ghost" size="icon" type="button" onClick={() => setViewingExpense(expense)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" type="button" onClick={() => setEditingExpense(expense)}><Pencil className="h-4 w-4" /></Button>
                    <form action={deleteExpense}><input type="hidden" name="id" value={expense.id} /><Button variant="ghost" size="icon" type="submit"><Trash2 className="h-4 w-4" /></Button></form>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No expenses found.</td></tr>
            )}</tbody>
          </table>
          </div>
          <PaginationControls basePath="/expenses" currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} preserveParams={preserveParams} />
        </CardContent>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-md border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">Add Expense</h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <form action={createExpense} className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input name="title" required /></div>
              <div className="space-y-2"><Label>Category</Label><select name="category" className="h-10 w-full rounded-md border bg-background px-3 text-sm">{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Amount</Label><Input name="amount" type="number" step="0.01" required /></div><div className="space-y-2"><Label>Date</Label><Input name="expenseDate" type="date" /></div></div>
              <div className="space-y-2"><Label>Notes</Label><Input name="notes" /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit"><Plus className="h-4 w-4" />Save Expense</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-md border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">Expense Details</h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setViewingExpense(null)}><X className="h-4 w-4" /></Button>
            </div>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-muted-foreground">Date</dt><dd className="font-medium">{viewingExpense.expenseDate.toLocaleDateString()}</dd></div>
              <div><dt className="text-muted-foreground">Title</dt><dd className="font-medium">{viewingExpense.title}</dd></div>
              <div><dt className="text-muted-foreground">Category</dt><dd><Badge>{viewingExpense.category}</Badge></dd></div>
              <div><dt className="text-muted-foreground">Amount</dt><dd className="font-medium">${String(viewingExpense.amount)}</dd></div>
              <div><dt className="text-muted-foreground">Notes</dt><dd className="text-muted-foreground">{viewingExpense.notes || "-"}</dd></div>
            </dl>
          </div>
        </div>
      )}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-md border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">Edit Expense</h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setEditingExpense(null)}><X className="h-4 w-4" /></Button>
            </div>
            <form action={updateExpense} className="space-y-4">
              <input type="hidden" name="id" value={editingExpense.id} />
              <div className="space-y-2"><Label>Title</Label><Input name="title" defaultValue={editingExpense.title} required /></div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select name="category" defaultValue={editingExpense.category} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {categoryOptions.map((category) => <option key={category}>{category}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Amount</Label><Input name="amount" type="number" step="0.01" defaultValue={editingExpense.amount} required /></div>
                <div className="space-y-2"><Label>Date</Label><Input name="expenseDate" type="date" defaultValue={editingExpense.expenseDate.toISOString().slice(0, 10)} required /></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Input name="notes" defaultValue={editingExpense.notes || ""} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingExpense(null)}>Cancel</Button>
                <Button type="submit">Update Expense</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
