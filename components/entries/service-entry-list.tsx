"use client";

import { useState } from "react";
import Link from "next/link";
import { Filter, Plus, Trash2, X } from "lucide-react";
import { deleteServiceEntry } from "@/lib/actions";
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
    employeeName: string;
    perPage: string;
  };
};

export function ServiceEntryList({ customers, employees, services, entries, currentPage, totalItems, pageSize, filters }: ServiceEntryListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const preserveParams = {
    ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
    ...(filters.employeeName ? { employeeName: filters.employeeName } : {}),
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
            <div className="space-y-2"><Label>Employee Name</Label><Input name="employeeName" defaultValue={filters.employeeName} /></div>
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
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Date</th><th>Customer</th><th>Employee</th><th>Service</th><th>Amount</th><th>Commission</th><th>Profit</th><th></th></tr></thead>
            <tbody>{entries.length ? entries.map((entry) => (
              <tr key={entry.id} className="border-b">
                <td className="py-3">{entry.serviceDate.toLocaleDateString()}</td><td>{entry.customer.name}</td><td>{entry.employee.name}</td><td>{entry.service.name}</td><td>${String(entry.amount)}</td><td>${String(entry.commissionAmount)}</td><td className="font-medium">${String(entry.salonProfit)}</td>
                <td><form action={deleteServiceEntry}><input type="hidden" name="id" value={entry.id} /><Button variant="ghost" size="icon" type="submit"><Trash2 className="h-4 w-4" /></Button></form></td>
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
    </>
  );
}
