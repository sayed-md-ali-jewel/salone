"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { Eye, Filter, Pencil, Plus, Trash2, X } from "lucide-react";
import { createEmployee, deleteEmployee, updateEmployee } from "@/lib/actions";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";

type EmployeeListItem = {
  id: string;
  name: string;
  mobile: string | null;
  salaryType: string;
  monthlySalary: number | null;
  commissionRate: number | null;
};

type EmployeeListProps = {
  employees: EmployeeListItem[];
  editingEmployee: EmployeeListItem | null;
  currentPage: number;
  totalItems: number;
  pageSize: number;
  currencyCode: string;
  filters: {
    name: string;
  };
};

function employeeListPath(page: number): Route {
  return page > 1 ? `/employees?page=${page}` : "/employees";
}

function employeeEditPath(page: number, id: string): Route {
  return page > 1 ? `/employees?page=${page}&edit=${id}` : `/employees?edit=${id}`;
}

export function EmployeeList({ employees, editingEmployee, currentPage, totalItems, pageSize, currencyCode, filters }: EmployeeListProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const modalEmployee = editingEmployee;
  const preserveParams = {
    ...(filters.name ? { name: filters.name } : {}),
    ...(editingEmployee ? { edit: editingEmployee.id } : {})
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Employee List</CardTitle>
          <Button type="button" onClick={() => setIsAddModalOpen(true)}><Plus className="h-4 w-4" />Add Employee</Button>
        </CardHeader>
        <CardContent>
          <form className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            <div className="space-y-2"><Label>Name</Label><Input name="name" defaultValue={filters.name} /></div>
            <Button type="submit"><Filter className="h-4 w-4" />Apply</Button>
            <Button asChild variant="outline"><Link href="/employees"><X className="h-4 w-4" />Reset</Link></Button>
          </form>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Name</th><th>Type</th><th>Salary</th><th>Commission</th><th></th></tr></thead>
            <tbody>{employees.length ? employees.map((employee) => (
              <tr key={employee.id} className="border-b">
                <td className="py-3 font-medium">{employee.name}</td><td><Badge>{employee.salaryType}</Badge></td><td>{employee.monthlySalary ? formatCurrency(Number(employee.monthlySalary), currencyCode) : "-"}</td><td>{employee.commissionRate ? `${employee.commissionRate}%` : "-"}</td>
                <td>
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="icon"><Link href={`/employees/${employee.id}` as Route}><Eye className="h-4 w-4" /></Link></Button>
                    <Button asChild variant="ghost" size="icon"><Link href={employeeEditPath(currentPage, employee.id)}><Pencil className="h-4 w-4" /></Link></Button>
                    <form action={deleteEmployee}><input type="hidden" name="id" value={employee.id} /><Button variant="ghost" size="icon" type="submit"><Trash2 className="h-4 w-4" /></Button></form>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No employees found.</td></tr>
            )}</tbody>
          </table>
          </div>
          <PaginationControls basePath="/employees" currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} preserveParams={preserveParams} />
        </CardContent>
      </Card>

      {isAddModalOpen && (
        <EmployeeFormModal title="Add Employee" action={createEmployee} submitLabel="Save Employee" onClose={() => setIsAddModalOpen(false)} />
      )}
      {modalEmployee && (
        <EmployeeFormModal title="Edit Employee" action={updateEmployee} submitLabel="Update Employee" employee={modalEmployee} closeHref={employeeListPath(currentPage)} />
      )}
    </>
  );
}

function EmployeeFormModal({
  title,
  action,
  submitLabel,
  employee,
  closeHref,
  onClose
}: {
  title: string;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  employee?: EmployeeListItem;
  closeHref?: Route;
  onClose?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-md border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          {closeHref ? (
            <Button asChild variant="ghost" size="icon"><Link href={closeHref}><X className="h-4 w-4" /></Link></Button>
          ) : (
            <Button type="button" variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          )}
        </div>
        <form action={action} className="space-y-4">
          {employee && <input type="hidden" name="id" value={employee.id} />}
          <div className="space-y-2"><Label>Name</Label><Input name="name" defaultValue={employee?.name || ""} required /></div>
          <div className="space-y-2"><Label>Mobile</Label><Input name="mobile" defaultValue={employee?.mobile || ""} /></div>
          <div className="space-y-2"><Label>Salary Type</Label><select name="salaryType" defaultValue={employee?.salaryType || "MONTHLY"} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="MONTHLY">Monthly</option><option value="PERCENTAGE">Percentage</option></select></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Monthly Salary</Label><Input name="monthlySalary" type="number" step="0.01" defaultValue={employee?.monthlySalary || ""} /></div>
            <div className="space-y-2"><Label>Commission %</Label><Input name="commissionRate" type="number" step="0.01" defaultValue={employee?.commissionRate || ""} /></div>
          </div>
          <div className="flex justify-end gap-2">
            {closeHref ? (
              <Button asChild variant="outline"><Link href={closeHref}>Cancel</Link></Button>
            ) : (
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            )}
            <Button type="submit"><Plus className="h-4 w-4" />{submitLabel}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
