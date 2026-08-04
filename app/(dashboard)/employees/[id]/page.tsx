import Link from "next/link";
import { notFound } from "next/navigation";
import { addDays, addMonths, startOfDay, startOfMonth } from "date-fns";
import { ArrowLeft, Filter, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PaymentTable } from "@/components/staff-payments/payment-table";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { getCurrencyCode } from "@/lib/settings";

type EmployeePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function sum<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((total, item) => total + getValue(item), 0);
}

function searchValue(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function dateRange(date: string | undefined, month: string | undefined) {
  if (date) {
    const from = startOfDay(new Date(`${date}T00:00:00`));
    return { from, to: addDays(from, 1) };
  }

  if (month) {
    const from = startOfMonth(new Date(`${month}-01T00:00:00`));
    return { from, to: addMonths(from, 1) };
  }

  return null;
}

function isInRange(value: Date, range: { from: Date; to: Date } | null) {
  return !range || (value >= range.from && value < range.to);
}

function paymentPeriodLabel(date: string, month: string) {
  if (date) return date;
  if (month) return month;
  return "all time";
}

function isEmployeePayment(expense: { title: string; notes: string | null }, employee: { id: string; name: string }) {
  const notes = String(expense.notes || "");
  return expense.title.includes(employee.name) || notes.includes(employee.name) || notes.includes(`Employee ID: ${employee.id}`);
}

function paidForEmployeePeriod(expenses: { title: string; notes: string | null; amount: number }[], employee: { id: string; name: string }, periodLabel: string) {
  return sum(expenses.filter((expense) => {
    if (!isEmployeePayment(expense, employee)) return false;
    return periodLabel === "all time" || String(expense.notes || "").includes(`for ${periodLabel}.`);
  }), (expense) => Number(expense.amount));
}

export default async function EmployeePage({ params, searchParams }: EmployeePageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const selectedDate = searchValue(query, "date") || "";
  const selectedMonth = searchValue(query, "month") || "";
  const selectedRange = dateRange(selectedDate, selectedMonth);

  const [employee, salaryExpenses, currencyCode] = hasDatabaseUrl() ? await Promise.all([
    prisma.employee.findUnique({
      where: { id },
      include: { serviceEntries: { include: { customer: true, service: true }, orderBy: { serviceDate: "desc" } } }
    }).catch(() => null),
    prisma.expense.findMany({ where: { category: "SALARY" }, orderBy: { expenseDate: "desc" } }).catch(() => []),
    getCurrencyCode()
  ]) : [null, [], "USD"];

  if (!employee) notFound();

  const serviceEntries = employee.serviceEntries.filter((entry) => isInRange(entry.serviceDate, selectedRange));
  const commissionPayment = employee.salaryType === "PERCENTAGE" ? sum(serviceEntries, (entry) => Number(entry.commissionAmount)) : 0;
  const monthlyPayment = employee.salaryType === "MONTHLY" ? Number(employee.monthlySalary || 0) : 0;
  const paymentHistory = salaryExpenses.filter((expense) => isEmployeePayment(expense, employee));
  const totalPaid = sum(paymentHistory, (expense) => Number(expense.amount));
  const paidAmount = paidForEmployeePeriod(salaryExpenses, employee, paymentPeriodLabel(selectedDate, selectedMonth));
  const grossPayment = commissionPayment + monthlyPayment;
  const paymentRow = {
    id: employee.id,
    name: employee.name,
    salaryType: employee.salaryType,
    services: serviceEntries.length,
    income: sum(serviceEntries, (entry) => Number(entry.amount)),
    commissionPayment,
    monthlyPayment,
    paidAmount,
    totalPayment: Math.max(0, grossPayment - paidAmount)
  };

  return (
    <>
      <PageHeader title={employee.name} description="Review employee activity, payment amount, and payment history." action={<Button asChild variant="outline"><Link href="/employees"><ArrowLeft className="h-4 w-4" />Employees</Link></Button>} />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Salary Type</CardTitle></CardHeader><CardContent><Badge>{employee.salaryType}</Badge></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Filtered Income</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{formatCurrency(paymentRow.income, currencyCode)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Payment Due</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{formatCurrency(paymentRow.totalPayment, currencyCode)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Due Salary</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{formatCurrency(Number(employee.dueSalary || 0), currencyCode)}</div><p className="mt-1 text-xs text-muted-foreground">{employee.dueSalaryNote || "-"}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Payment History</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{formatCurrency(totalPaid, currencyCode)}</div></CardContent></Card>
      </div>
      <Card className="mb-4">
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[180px_180px_auto_auto] md:items-end">
            <div className="space-y-2"><Label>Specific Date</Label><input name="date" type="date" defaultValue={selectedDate} className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></div>
            <div className="space-y-2"><Label>Month</Label><input name="month" type="month" defaultValue={selectedMonth} className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></div>
            <Button type="submit"><Filter className="h-4 w-4" />Apply</Button>
            <Button asChild variant="outline"><Link href={`/employees/${employee.id}`}><X className="h-4 w-4" />Reset</Link></Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle>Employee Payment</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <PaymentTable rows={[paymentRow]} selectedDate={selectedDate} selectedMonth={selectedMonth} currencyCode={currencyCode} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Paid Date</th><th>Amount</th><th>Notes</th></tr></thead>
              <tbody>{paymentHistory.length ? paymentHistory.map((expense) => (
                <tr key={expense.id} className="border-b"><td className="py-3">{expense.expenseDate.toLocaleDateString()}</td><td className="font-medium">{formatCurrency(Number(expense.amount), currencyCode)}</td><td className="min-w-56 text-muted-foreground">{expense.notes || "-"}</td></tr>
              )) : (
                <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No payment history for this employee.</td></tr>
              )}</tbody>
            </table>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle>Service History</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Date</th><th>Customer</th><th>Service</th><th>Income</th><th>Commission</th><th>Profit</th></tr></thead>
            <tbody>{serviceEntries.length ? serviceEntries.map((entry) => (
              <tr key={entry.id} className="border-b"><td className="py-3">{entry.serviceDate.toLocaleDateString()}</td><td>{entry.customer.name}</td><td>{entry.service.name}</td><td>{formatCurrency(Number(entry.amount), currencyCode)}</td><td>{formatCurrency(Number(entry.commissionAmount), currencyCode)}</td><td className="font-medium">{formatCurrency(Number(entry.salonProfit), currencyCode)}</td></tr>
            )) : (
              <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No service history matches these filters.</td></tr>
            )}</tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
