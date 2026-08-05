"use client";

import { useState } from "react";
import { createServiceEntry } from "@/lib/actions";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NEW_CUSTOMER_VALUE = "__new_customer__";
const DEFAULT_DISCOUNT_TYPE = "AMOUNT";
const DEFAULT_DISCOUNT_VALUE = "0";

function todayInputValue() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

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
  currencyCode: string;
};

export function ServiceEntryForm({ customers, employees, services, currencyCode }: ServiceEntryFormProps) {
  const [customerId, setCustomerId] = useState(customers[0]?.id || NEW_CUSTOMER_VALUE);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(services[0]?.id ? [services[0].id] : []);
  const [extraTaskAmount, setExtraTaskAmount] = useState("0");
  const [discountType, setDiscountType] = useState(DEFAULT_DISCOUNT_TYPE);
  const [discountValue, setDiscountValue] = useState(DEFAULT_DISCOUNT_VALUE);
  const isNewCustomer = customerId === NEW_CUSTOMER_VALUE;
  const servicesAmount = services
    .filter((service) => selectedServiceIds.includes(service.id))
    .reduce((total, service) => total + service.price, 0);
  const parsedExtraTaskAmount = Number(extraTaskAmount || 0);
  const subtotalAmount = servicesAmount + (Number.isFinite(parsedExtraTaskAmount) ? parsedExtraTaskAmount : 0);
  const parsedDiscountValue = Number(discountValue || 0);
  const rawDiscountAmount = discountType === "PERCENTAGE"
    ? (subtotalAmount * (Number.isFinite(parsedDiscountValue) ? parsedDiscountValue : 0)) / 100
    : (Number.isFinite(parsedDiscountValue) ? parsedDiscountValue : 0);
  const discountAmount = Math.min(Math.max(rawDiscountAmount, 0), subtotalAmount);
  const totalAmount = subtotalAmount - discountAmount;

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((current) => (
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    ));
  };

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
        <Label>Services</Label>
        <div className="grid max-h-44 gap-2 overflow-y-auto rounded-md border bg-background p-3">
          {services.map((item) => (
            <label key={item.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
              <span className="flex min-w-0 items-center gap-2">
                <input
                  type="checkbox"
                  name="serviceIds"
                  value={item.id}
                  checked={selectedServiceIds.includes(item.id)}
                  onChange={() => toggleService(item.id)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="truncate">{item.name}</span>
              </span>
              <span className="shrink-0 text-muted-foreground">{formatCurrency(item.price, currencyCode)}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Extra Service Fee</Label><Input name="extraTaskAmount" type="number" step="0.01" min="0" value={extraTaskAmount} onChange={(event) => setExtraTaskAmount(event.target.value)} /></div>
        <div className="space-y-2"><Label>Date</Label><Input name="serviceDate" type="date" defaultValue={todayInputValue()} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Discount Type</Label>
          <select name="discountType" value={discountType} onChange={(event) => setDiscountType(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="AMOUNT">Amount</option>
            <option value="PERCENTAGE">Percentage</option>
          </select>
        </div>
        <div className="space-y-2"><Label>{discountType === "PERCENTAGE" ? "Discount Percentage" : "Discount Amount"}</Label><Input name="discountValue" type="number" step="0.01" min="0" max={discountType === "PERCENTAGE" ? 100 : undefined} value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} /></div>
      </div>
      <div className="space-y-2"><Label>Discount Applied</Label><Input type="text" value={formatCurrency(discountAmount, currencyCode)} readOnly /></div>
      <div className="space-y-2"><Label>Amount</Label><Input name="amount" type="number" step="0.01" value={Number.isFinite(totalAmount) ? totalAmount : 0} readOnly required /></div>
      <div className="space-y-2"><Label>Notes</Label><Input name="notes" /></div>
      <Button type="submit" className="w-full" disabled={!employees.length || !services.length || !selectedServiceIds.length}>Save Entry</Button>
    </form>
  );
}
