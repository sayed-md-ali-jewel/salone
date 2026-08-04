"use client";

import { useState } from "react";
import { createServiceEntry } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NEW_CUSTOMER_VALUE = "__new_customer__";

type SelectItem = {
  id: string;
  name: string;
};

type ServiceItem = SelectItem & {
  price: number;
};

type ServiceEntryFormProps = {
  customers: SelectItem[];
  employees: SelectItem[];
  services: ServiceItem[];
};

export function ServiceEntryForm({ customers, employees, services }: ServiceEntryFormProps) {
  const [customerId, setCustomerId] = useState(customers[0]?.id || NEW_CUSTOMER_VALUE);
  const isNewCustomer = customerId === NEW_CUSTOMER_VALUE;

  return (
    <form action={createServiceEntry} className="space-y-4">
      <div className="space-y-2">
        <Label>Customer</Label>
        <select name="customerId" value={customerId} onChange={(event) => setCustomerId(event.target.value)} required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
          {customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          <option value={NEW_CUSTOMER_VALUE}>New customer</option>
        </select>
      </div>
      {isNewCustomer && (
        <div className="space-y-3 rounded-md border bg-muted/30 p-3">
          <div className="space-y-2"><Label>Customer Name</Label><Input name="newCustomerName" required={isNewCustomer} /></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Mobile</Label><Input name="newCustomerMobile" required={isNewCustomer} /></div>
            <div className="space-y-2"><Label>Address</Label><Input name="newCustomerAddress" /></div>
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label>Employee</Label>
        <select name="employeeId" required className="h-10 w-full rounded-md border bg-background px-3 text-sm">{employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </div>
      <div className="space-y-2">
        <Label>Service</Label>
        <select name="serviceId" required className="h-10 w-full rounded-md border bg-background px-3 text-sm">{services.map((item) => <option key={item.id} value={item.id}>{item.name} - ${String(item.price)}</option>)}</select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Amount</Label><Input name="amount" type="number" step="0.01" required /></div>
        <div className="space-y-2"><Label>Date</Label><Input name="serviceDate" type="date" /></div>
      </div>
      <div className="space-y-2"><Label>Notes</Label><Input name="notes" /></div>
      <Button type="submit" className="w-full" disabled={!employees.length || !services.length}>Save Entry</Button>
    </form>
  );
}
