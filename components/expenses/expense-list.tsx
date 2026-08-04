"use client";

import { useState } from "react";
import Link from "next/link";
import { Filter, Plus, Trash2, X } from "lucide-react";
import { createExpense, deleteExpense } from "@/lib/actions";
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
  const preserveParams = {
    ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
    ...(filters.toDate ? { toDate: filters.toDate } : {}),
    ...(filters.category ? { category: filters.category } : {})
  };

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
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Date</th><th>Title</th><th>Category</th><th>Amount</th><th></th></tr></thead>
            <tbody>{expenses.length ? expenses.map((expense) => (
              <tr key={expense.id} className="border-b">
                <td className="py-3">{expense.expenseDate.toLocaleDateString()}</td><td className="font-medium">{expense.title}</td><td><Badge>{expense.category}</Badge></td><td>${String(expense.amount)}</td>
                <td><form action={deleteExpense}><input type="hidden" name="id" value={expense.id} /><Button variant="ghost" size="icon" type="submit"><Trash2 className="h-4 w-4" /></Button></form></td>
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
              <div className="space-y-2"><Label>Category</Label><select name="category" className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option>RENT</option><option>SALARY</option><option>PRODUCT</option><option>UTILITY</option><option>OTHER</option></select></div>
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
    </>
  );
}
