"use client";

import { useState } from "react";
import Link from "next/link";
import { Filter, Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteServiceEntry, updateServiceEntry } from "@/lib/actions";
import { ServiceEntryForm } from "@/components/entries/service-entry-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";

type SelectItem = {
  id: string;
  name: string;
};

type ServiceItem = SelectItem & {
  price: number;
};

type ServiceEntryListItem = {
  id: string;
  serviceDate: Date;
  amount: number;
  commissionAmount: number;
  salonProfit: number;
  notes: string | null;
  customer: SelectItem;
  employee: SelectItem;
  service: SelectItem;
};

type ServiceEntryListProps = {
  customers: SelectItem[];
  employees: SelectItem[];
  services: ServiceItem[];
  entries: ServiceEntryListItem[];
  currentPage: number;
  totalItems: number;
  pageSize: number;
  filters: {
    serviceId: string;
    employeeId: string;
    perPage: string;
  };
};

export function ServiceEntryList({ customers, employees, services, entries, currentPage, totalItems, pageSize, filters }: ServiceEntryListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ServiceEntryListItem | null>(null);
  const preserveParams = {
    ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
    ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
    ...(filters.perPage !== "25" ? { perPage: filters.perPage } : {})
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Service Entries</CardTitle>
          <Button type="button" onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" />Add Entry</Button>
        </CardHeader>
        <CardContent>
          <form className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_140px_auto_auto] md:items-end">
            <div className="space-y-2">
              <Label>Service</Label>
              <select name="serviceId" defaultValue={filters.serviceId} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">All services</option>
                {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Employee</Label>
              <select name="employeeId" defaultValue={filters.employeeId} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">All employees</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Per Page</Label>
              <select name="perPage" defaultValue={filters.perPage} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <Button type="submit"><Filter className="h-4 w-4" />Apply</Button>
            <Button asChild variant="outline"><Link href="/entries"><X className="h-4 w-4" />Reset</Link></Button>
          </form>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Date</th><th>Customer</th><th>Employee</th><th>Service</th><th>Amount</th><th>Commission</th><th>Profit</th><th className="sticky right-0 z-10 w-28 border-l bg-card text-center">Action</th></tr></thead>
            <tbody>{entries.length ? entries.map((entry) => (
              <tr key={entry.id} className="border-b">
                <td className="py-3">{entry.serviceDate.toLocaleDateString()}</td><td>{entry.customer.name}</td><td>{entry.employee.name}</td><td>{entry.service.name}</td><td>${String(entry.amount)}</td><td>${String(entry.commissionAmount)}</td><td className="font-medium">${String(entry.salonProfit)}</td>
                <td className="sticky right-0 z-10 border-l bg-card">
                  <div className="flex justify-center gap-1">
                    <Button variant="ghost" size="icon" type="button" onClick={() => setEditingEntry(entry)}><Pencil className="h-4 w-4" /></Button>
                    <form action={deleteServiceEntry}><input type="hidden" name="id" value={entry.id} /><Button variant="ghost" size="icon" type="submit"><Trash2 className="h-4 w-4" /></Button></form>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No service entries found.</td></tr>
            )}</tbody>
          </table>
          </div>
          <PaginationControls basePath="/entries" currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} preserveParams={preserveParams} />
        </CardContent>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-md border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">Add Service Entry</h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <ServiceEntryForm customers={customers} employees={employees} services={services} />
          </div>
        </div>
      )}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-md border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">Edit Service Entry</h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setEditingEntry(null)}><X className="h-4 w-4" /></Button>
            </div>
            <form action={updateServiceEntry} className="space-y-4">
              <input type="hidden" name="id" value={editingEntry.id} />
              <div className="space-y-2">
                <Label>Customer</Label>
                <select name="customerId" defaultValue={editingEntry.customer.id} required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Employee</Label>
                <select name="employeeId" defaultValue={editingEntry.employee.id} required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <select name="serviceId" defaultValue={editingEntry.service.id} required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {services.map((item) => <option key={item.id} value={item.id}>{item.name} - ${String(item.price)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Amount</Label><Input name="amount" type="number" step="0.01" defaultValue={editingEntry.amount} required /></div>
                <div className="space-y-2"><Label>Date</Label><Input name="serviceDate" type="date" defaultValue={editingEntry.serviceDate.toISOString().slice(0, 10)} required /></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Input name="notes" defaultValue={editingEntry.notes || ""} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
                <Button type="submit">Update Entry</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
