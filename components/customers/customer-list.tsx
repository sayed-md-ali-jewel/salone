"use client";

import { useState } from "react";
import Link from "next/link";
import { Filter, Pencil, Plus, Trash2, X } from "lucide-react";
import { createCustomer, deleteCustomer, updateCustomer } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";

type CustomerListItem = {
  id: string;
  name: string;
  mobile: string;
  address: string | null;
};

type CustomerListProps = {
  customers: CustomerListItem[];
  currentPage: number;
  totalItems: number;
  pageSize: number;
  filters: {
    name: string;
    mobile: string;
    perPage: string;
  };
};

export function CustomerList({ customers, currentPage, totalItems, pageSize, filters }: CustomerListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null);
  const preserveParams = {
    ...(filters.name ? { name: filters.name } : {}),
    ...(filters.mobile ? { mobile: filters.mobile } : {}),
    ...(filters.perPage !== "25" ? { perPage: filters.perPage } : {})
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Customer List</CardTitle>
          <Button type="button" onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" />Add Customer</Button>
        </CardHeader>
        <CardContent>
          <form className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_140px_auto_auto] md:items-end">
            <div className="space-y-2"><Label>Name</Label><Input name="name" defaultValue={filters.name} /></div>
            <div className="space-y-2"><Label>Mobile</Label><Input name="mobile" defaultValue={filters.mobile} /></div>
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
            <Button asChild variant="outline"><Link href="/customers"><X className="h-4 w-4" />Reset</Link></Button>
          </form>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Name</th><th>Mobile</th><th>Address</th><th className="sticky right-0 z-10 w-28 border-l bg-card text-center">Action</th></tr></thead>
            <tbody>
              {customers.length ? customers.map((customer) => (
                <tr key={customer.id} className="border-b">
                  <td className="py-3 font-medium">{customer.name}</td>
                  <td>{customer.mobile}</td>
                  <td>{customer.address}</td>
                  <td className="sticky right-0 z-10 border-l bg-card">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" type="button" onClick={() => setEditingCustomer(customer)}><Pencil className="h-4 w-4" /></Button>
                      <form action={deleteCustomer}><input type="hidden" name="id" value={customer.id} /><Button variant="ghost" size="icon" type="submit"><Trash2 className="h-4 w-4" /></Button></form>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No customers found.</td></tr>
              )}
            </tbody>
          </table>
          </div>
          <PaginationControls basePath="/customers" currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} preserveParams={preserveParams} />
        </CardContent>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-md border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">Add Customer</h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <form action={createCustomer} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
              <div className="space-y-2"><Label>Mobile</Label><Input name="mobile" required /></div>
              <div className="space-y-2"><Label>Address</Label><Input name="address" /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit"><Plus className="h-4 w-4" />Save Customer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-md border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">Edit Customer</h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setEditingCustomer(null)}><X className="h-4 w-4" /></Button>
            </div>
            <form action={updateCustomer} className="space-y-4">
              <input type="hidden" name="id" value={editingCustomer.id} />
              <div className="space-y-2"><Label>Name</Label><Input name="name" defaultValue={editingCustomer.name} required /></div>
              <div className="space-y-2"><Label>Mobile</Label><Input name="mobile" defaultValue={editingCustomer.mobile} required /></div>
              <div className="space-y-2"><Label>Address</Label><Input name="address" defaultValue={editingCustomer.address || ""} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingCustomer(null)}>Cancel</Button>
                <Button type="submit">Update Customer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
