"use client";

import { useState } from "react";
import Link from "next/link";
import { Banknote, Eye, Filter, Pencil, Plus, Trash2, X } from "lucide-react";
import { createCustomer, createCustomerPayment, deleteCustomer, updateCustomer } from "@/lib/actions";
import { formatCurrency } from "@/lib/currency";
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
  previousDue: number | null;
  previousDueNote: string | null;
  customerPayments: {
    id: string;
    amount: number;
    paymentDate: Date | string;
    notes: string;
  }[];
  serviceEntries: {
    id: string;
    serviceDate: Date | string;
    amount: number;
    commissionAmount: number;
    salonProfit: number;
    notes: string | null;
    employee: { id: string; name: string };
    service: { id: string; name: string };
  }[];
};

type CustomerListProps = {
  customers: CustomerListItem[];
  currentPage: number;
  totalItems: number;
  pageSize: number;
  currencyCode: string;
  filters: {
    name: string;
    mobile: string;
    perPage: string;
  };
};

export function CustomerList({ customers, currentPage, totalItems, pageSize, currencyCode, filters }: CustomerListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<CustomerListItem | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null);
  const [payingCustomer, setPayingCustomer] = useState<CustomerListItem | null>(null);
  const preserveParams = {
    ...(filters.name ? { name: filters.name } : {}),
    ...(filters.mobile ? { mobile: filters.mobile } : {}),
    ...(filters.perPage !== "25" ? { perPage: filters.perPage } : {})
  };
  const paidAmount = (customer: CustomerListItem) => customer.customerPayments.reduce((total, payment) => total + Number(payment.amount), 0);
  const serviceAmount = (customer: CustomerListItem) => customer.serviceEntries.reduce((total, entry) => total + Number(entry.amount), 0);
  const dueBalance = (customer: CustomerListItem) => Math.max(0, Number(customer.previousDue || 0) - paidAmount(customer));
  const formatDate = (value: Date | string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
  };
  const today = () => new Date().toISOString().slice(0, 10);

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
          <table className="w-full min-w-[1120px] text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Name</th><th>Mobile</th><th>Address</th><th>Previous Due</th><th>Paid</th><th>Balance</th><th>Due Note</th><th className="sticky right-0 z-10 w-44 border-l bg-card text-center">Action</th></tr></thead>
            <tbody>
              {customers.length ? customers.map((customer) => (
                <tr key={customer.id} className="border-b">
                  <td className="py-3 font-medium">{customer.name}</td>
                  <td>{customer.mobile}</td>
                  <td>{customer.address}</td>
                  <td>{formatCurrency(Number(customer.previousDue || 0), currencyCode)}</td>
                  <td>{formatCurrency(paidAmount(customer), currencyCode)}</td>
                  <td className="font-medium">{formatCurrency(dueBalance(customer), currencyCode)}</td>
                  <td className="min-w-52 text-muted-foreground">{customer.previousDueNote || "-"}</td>
                  <td className="sticky right-0 z-10 border-l bg-card">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" type="button" disabled={dueBalance(customer) <= 0} onClick={() => setPayingCustomer(customer)}><Banknote className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" type="button" onClick={() => setViewingCustomer(customer)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" type="button" onClick={() => setEditingCustomer(customer)}><Pencil className="h-4 w-4" /></Button>
                      <form action={deleteCustomer}><input type="hidden" name="id" value={customer.id} /><Button variant="ghost" size="icon" type="submit"><Trash2 className="h-4 w-4" /></Button></form>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No customers found.</td></tr>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Previous Due</Label><Input name="previousDue" type="number" step="0.01" min="0" defaultValue="0" /></div>
                <div className="space-y-2"><Label>Due Note</Label><Input name="previousDueNote" placeholder="Required if due is added" /></div>
              </div>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Previous Due</Label><Input name="previousDue" type="number" step="0.01" min="0" defaultValue={editingCustomer.previousDue || 0} /></div>
                <div className="space-y-2"><Label>Due Note</Label><Input name="previousDueNote" defaultValue={editingCustomer.previousDueNote || ""} placeholder="Required if due is added" /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingCustomer(null)}>Cancel</Button>
                <Button type="submit">Update Customer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[94vh] w-full max-w-7xl overflow-y-auto rounded-md border bg-card p-6 shadow-lg">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">{viewingCustomer.name}</h2>
                <p className="text-sm text-muted-foreground">{viewingCustomer.mobile}{viewingCustomer.address ? ` · ${viewingCustomer.address}` : ""}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setViewingCustomer(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Previous Due</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(Number(viewingCustomer.previousDue || 0), currencyCode)}</p></div>
              <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Paid</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(paidAmount(viewingCustomer), currencyCode)}</p></div>
              <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Balance</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(dueBalance(viewingCustomer), currencyCode)}</p></div>
              <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Service Total</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(serviceAmount(viewingCustomer), currencyCode)}</p></div>
            </div>
            <div className="mb-5 rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Due Note</p>
              <p className="mt-2 text-sm">{viewingCustomer.previousDueNote || "-"}</p>
            </div>
            <div className="mb-5 flex justify-end">
              {dueBalance(viewingCustomer) > 0 && (
                <Button type="button" onClick={() => { setPayingCustomer(viewingCustomer); setViewingCustomer(null); }}>
                  <Banknote className="h-4 w-4" />
                  Pay Due
                </Button>
              )}
            </div>
            <div className="space-y-5">
              <div className="rounded-md border p-4">
                <h3 className="mb-3 text-base font-semibold">Due Payment Transactions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Date</th><th>Amount</th><th>Note</th></tr></thead>
                    <tbody>{viewingCustomer.customerPayments.length ? viewingCustomer.customerPayments.map((payment) => (
                      <tr key={payment.id} className="border-b">
                        <td className="py-2">{formatDate(payment.paymentDate)}</td>
                        <td>{formatCurrency(Number(payment.amount), currencyCode)}</td>
                        <td className="text-muted-foreground">{payment.notes}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="py-5 text-center text-muted-foreground">No due payments yet.</td></tr>
                    )}</tbody>
                  </table>
                </div>
              </div>
              <div className="rounded-md border p-4">
                <h3 className="mb-3 text-base font-semibold">Service Transactions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Date</th><th>Service</th><th>Employee</th><th>Amount</th><th>Note</th></tr></thead>
                    <tbody>{viewingCustomer.serviceEntries.length ? viewingCustomer.serviceEntries.map((entry) => (
                      <tr key={entry.id} className="border-b">
                        <td className="py-2">{formatDate(entry.serviceDate)}</td>
                        <td>{entry.service.name}</td>
                        <td>{entry.employee.name}</td>
                        <td>{formatCurrency(Number(entry.amount), currencyCode)}</td>
                        <td className="text-muted-foreground">{entry.notes || "-"}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="py-5 text-center text-muted-foreground">No service transactions yet.</td></tr>
                    )}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {payingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Customer Payment</h2>
                <p className="text-sm text-muted-foreground">{payingCustomer.name} balance: {formatCurrency(dueBalance(payingCustomer), currencyCode)}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setPayingCustomer(null)}><X className="h-4 w-4" /></Button>
            </div>
            <form action={createCustomerPayment} className="space-y-4">
              <input type="hidden" name="customerId" value={payingCustomer.id} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Amount</Label><Input name="amount" type="number" step="0.01" min="0.01" max={dueBalance(payingCustomer)} required /></div>
                <div className="space-y-2"><Label>Payment Date</Label><Input name="paymentDate" type="date" defaultValue={today()} required /></div>
              </div>
              <div className="space-y-2"><Label>Payment Note</Label><Input name="notes" required /></div>
              {payingCustomer.customerPayments.length > 0 && (
                <div className="rounded-md border p-3">
                  <h3 className="mb-2 text-sm font-medium">Payment History</h3>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Date</th><th>Amount</th><th>Note</th></tr></thead>
                      <tbody>{payingCustomer.customerPayments.map((payment) => (
                        <tr key={payment.id} className="border-b">
                          <td className="py-2">{formatDate(payment.paymentDate)}</td>
                          <td>{formatCurrency(Number(payment.amount), currencyCode)}</td>
                          <td className="text-muted-foreground">{payment.notes}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPayingCustomer(null)}>Cancel</Button>
                <Button type="submit"><Banknote className="h-4 w-4" />Save Payment</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
