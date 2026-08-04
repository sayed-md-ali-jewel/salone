"use client";

import { useState } from "react";
import { Banknote, X } from "lucide-react";
import { payEmployee } from "@/lib/actions";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PaymentRow = {
  id: string;
  name: string;
  salaryType: string;
  services: number;
  income: number;
  commissionPayment: number;
  monthlyPayment: number;
  paidAmount: number;
  totalPayment: number;
};

type PaymentTableProps = {
  rows: PaymentRow[];
  selectedDate: string;
  selectedMonth: string;
  currencyCode: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function PaymentTable({ rows, selectedDate, selectedMonth, currencyCode }: PaymentTableProps) {
  const [activeRow, setActiveRow] = useState<PaymentRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const numericPaymentAmount = Number(paymentAmount || 0);
  const exceedsPayableAmount = Boolean(activeRow && numericPaymentAmount > activeRow.totalPayment);
  const isInvalidPaymentAmount = numericPaymentAmount <= 0 || exceedsPayableAmount;

  function openPaymentModal(row: PaymentRow) {
    setPaymentAmount(row.totalPayment.toFixed(2));
    setActiveRow(row);
  }

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">Percentage staff are paid commission. Monthly staff are paid salary only when a month is selected.</p>
      <table className="w-full min-w-[1120px] text-sm">
        <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Staff</th><th>Type</th><th>Services</th><th>Income</th><th>Commission</th><th>Salary</th><th>Paid</th><th>Due</th><th className="sticky right-0 z-10 border-l bg-card text-center">Action</th></tr></thead>
        <tbody>{rows.map((row) => (
          <tr key={row.id} className="border-b">
            <td className="py-3 font-medium">{row.name}</td><td>{row.salaryType}</td><td>{row.services}</td><td>{formatCurrency(row.income, currencyCode)}</td><td>{formatCurrency(row.commissionPayment, currencyCode)}</td><td>{formatCurrency(row.monthlyPayment, currencyCode)}</td><td>{formatCurrency(row.paidAmount, currencyCode)}</td><td className="font-semibold">{formatCurrency(row.totalPayment, currencyCode)}</td>
            <td className="sticky right-0 z-10 border-l bg-card text-right">
              <Button type="button" size="sm" disabled={row.totalPayment <= 0} onClick={() => openPaymentModal(row)}><Banknote className="h-4 w-4" />Pay</Button>
            </td>
          </tr>
        ))}</tbody>
      </table>

      {activeRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-md border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Pay {activeRow.name}</h2>
                <p className="text-sm text-muted-foreground">Suggested amount: {formatCurrency(activeRow.totalPayment, currencyCode)}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setActiveRow(null)}><X className="h-4 w-4" /></Button>
            </div>
            <form action={payEmployee} className="space-y-4">
              <input type="hidden" name="employeeId" value={activeRow.id} />
              <input type="hidden" name="date" value={selectedDate} />
              <input type="hidden" name="month" value={selectedMonth} />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input name="amount" type="number" step="0.01" min="0.01" max={activeRow.totalPayment} value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} required />
                  {exceedsPayableAmount && <p className="text-xs text-destructive">Amount cannot exceed {formatCurrency(activeRow.totalPayment, currencyCode)} for this {activeRow.salaryType === "MONTHLY" ? "monthly" : "commission"} payment.</p>}
                </div>
                <div className="space-y-2">
                  <Label>Paid Date</Label>
                  <Input name="paidDate" type="date" defaultValue={today()} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <textarea name="notes" rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Optional payment notes" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setActiveRow(null)}>Cancel</Button>
                <Button type="submit" disabled={isInvalidPaymentAmount}><Banknote className="h-4 w-4" />Save Payment</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
