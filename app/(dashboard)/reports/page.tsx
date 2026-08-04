import Link from "next/link";
import { addDays, addMonths, startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { Filter, X } from "lucide-react";
import { ExportButtons } from "@/components/reports/export-buttons";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/currency";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { getCurrencyCode } from "@/lib/settings";

function sum<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((total, item) => total + getValue(item), 0);
}

type ReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const selectedEmployeeId = searchValue(params, "employeeId") || "";
  const selectedDate = searchValue(params, "date") || "";
  const selectedMonth = searchValue(params, "month") || "";
  const selectedRange = dateRange(selectedDate, selectedMonth);

  const [entries, expenses, employees, currencyCode] = hasDatabaseUrl() ? await Promise.all([
    prisma.serviceEntry.findMany({ include: { customer: true, employee: true, service: true }, orderBy: { serviceDate: "desc" } }).catch(() => []),
    prisma.expense.findMany({ orderBy: { expenseDate: "desc" } }).catch(() => []),
    prisma.employee.findMany({ include: { serviceEntries: true }, orderBy: { name: "asc" } }).catch(() => []),
    getCurrencyCode()
  ]) : [[], [], [], "USD"];

  const filteredEntries = entries.filter((entry) => {
    const matchesEmployee = !selectedEmployeeId || entry.employeeId === selectedEmployeeId;
    return matchesEmployee && isInRange(entry.serviceDate, selectedRange);
  });
  const filteredExpenses = expenses.filter((expense) => isInRange(expense.expenseDate, selectedRange));

  const periodBase = selectedRange?.from || new Date();
  const ranges = [
    ["Daily", startOfDay(periodBase)],
    ["Weekly", startOfWeek(periodBase)],
    ["Monthly", startOfMonth(periodBase)],
    ["Yearly", startOfYear(periodBase)]
  ] as const;

  const reportRows = ranges.map(([label, from]) => {
    const rangeEntries = filteredEntries.filter((entry) => entry.serviceDate >= from);
    const rangeExpenses = filteredExpenses.filter((expense) => expense.expenseDate >= from);
    const income = sum(rangeEntries, (entry) => Number(entry.amount));
    const commission = sum(rangeEntries, (entry) => Number(entry.commissionAmount));
    const expense = sum(rangeExpenses, (item) => Number(item.amount));
    return { period: label, income, expense, commission, profit: income - expense - commission };
  });

  const totalIncome = sum(filteredEntries, (entry) => Number(entry.amount));
  const totalCommission = sum(filteredEntries, (entry) => Number(entry.commissionAmount));
  const totalProfit = sum(filteredEntries, (entry) => Number(entry.salonProfit));

  return (
    <>
      <PageHeader title="Reports" description="Review daily, weekly, monthly, yearly and employee performance reports." action={<ExportButtons rows={reportRows} />} />
      <Card className="mb-4">
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto_auto] md:items-end">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <select name="employeeId" defaultValue={selectedEmployeeId} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">All staff</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Specific Date</Label>
              <input name="date" type="date" defaultValue={selectedDate} className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <input name="month" type="month" defaultValue={selectedMonth} className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
            </div>
            <Button type="submit"><Filter className="h-4 w-4" />Apply</Button>
            <Button asChild variant="outline"><Link href="/reports"><X className="h-4 w-4" />Reset</Link></Button>
          </form>
        </CardContent>
      </Card>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Filtered Income</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatCurrency(totalIncome, currencyCode)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Commission</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatCurrency(totalCommission, currencyCode)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Salon Profit</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatCurrency(totalProfit, currencyCode)}</div></CardContent>
        </Card>
      </div>
      <div className="grid gap-4">
        <Card>
          <CardHeader><CardTitle>Income / Expense / Profit</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Period</th><th>Income</th><th>Expense</th><th>Commission</th><th>Profit</th></tr></thead>
              <tbody>{reportRows.map((row) => (
                <tr key={row.period} className="border-b"><td className="py-3 font-medium">{row.period}</td><td>{formatCurrency(row.income, currencyCode)}</td><td>{formatCurrency(row.expense, currencyCode)}</td><td>{formatCurrency(row.commission, currencyCode)}</td><td className="font-semibold">{formatCurrency(row.profit, currencyCode)}</td></tr>
              ))}</tbody>
            </table>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle>Filtered Income and Staff Payment Details</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Date</th><th>Staff</th><th>Customer</th><th>Service</th><th>Income</th><th>Staff Payment</th><th>Profit</th></tr></thead>
            <tbody>{filteredEntries.length ? filteredEntries.map((entry) => (
              <tr key={entry.id} className="border-b">
                <td className="py-3">{entry.serviceDate.toLocaleDateString()}</td><td className="font-medium">{entry.employee.name}</td><td>{entry.customer.name}</td><td>{entry.service.name}</td><td>{formatCurrency(Number(entry.amount), currencyCode)}</td><td>{formatCurrency(Number(entry.commissionAmount), currencyCode)}</td><td className="font-medium">{formatCurrency(Number(entry.salonProfit), currencyCode)}</td>
              </tr>
            )) : (
              <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No income or staff payments match these filters.</td></tr>
            )}</tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
