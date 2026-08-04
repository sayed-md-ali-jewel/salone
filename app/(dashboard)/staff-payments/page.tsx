import Link from "next/link";
import { addDays, addMonths, startOfDay, startOfMonth } from "date-fns";
import { Filter, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PaymentTable } from "@/components/staff-payments/payment-table";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { getCurrencyCode } from "@/lib/settings";

const HISTORY_PAGE_SIZE = 20;

function sum<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((total, item) => total + getValue(item), 0);
}

type StaffPaymentsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function searchValue(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function pageNumber(value: string | undefined) {
  const page = Number(value || 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
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

export default async function StaffPaymentsPage({ searchParams }: StaffPaymentsPageProps) {
  const params = await searchParams;
  const selectedEmployeeId = searchValue(params, "employeeId") || "";
  const selectedDate = searchValue(params, "date") || "";
  const selectedMonth = searchValue(params, "month") || "";
  const historyPage = pageNumber(searchValue(params, "historyPage"));
  const selectedRange = dateRange(selectedDate, selectedMonth);

  const [employees, salaryExpenses, currencyCode] = hasDatabaseUrl() ? await Promise.all([
    prisma.employee.findMany({ include: { serviceEntries: true }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.expense.findMany({ where: { category: "SALARY" }, orderBy: { expenseDate: "desc" } }).catch(() => []),
    getCurrencyCode()
  ]) : [[], [], "USD"];

  const periodLabel = paymentPeriodLabel(selectedDate, selectedMonth);
  const paymentRows = employees
    .filter((employee) => !selectedEmployeeId || employee.id === selectedEmployeeId)
    .map((employee) => {
      const serviceEntries = employee.serviceEntries.filter((entry) => isInRange(entry.serviceDate, selectedRange));
      const commissionPayment = employee.salaryType === "PERCENTAGE" ? sum(serviceEntries, (entry) => Number(entry.commissionAmount)) : 0;
      const monthlyPayment = employee.salaryType === "MONTHLY" ? Number(employee.monthlySalary || 0) : 0;
      const grossPayment = commissionPayment + monthlyPayment;
      const paidAmount = paidForEmployeePeriod(salaryExpenses, employee, periodLabel);
      return {
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
    });

  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId);
  const paymentHistory = salaryExpenses.filter((expense) => {
    if (!selectedEmployee) return true;
    return isEmployeePayment(expense, selectedEmployee);
  });
  const paginatedPaymentHistory = paymentHistory.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);

  const totalDue = sum(paymentRows, (row) => row.totalPayment);
  const totalPaid = sum(paymentHistory, (expense) => Number(expense.amount));
  const historyParams = {
    ...(selectedEmployeeId ? { employeeId: selectedEmployeeId } : {}),
    ...(selectedDate ? { date: selectedDate } : {}),
    ...(selectedMonth ? { month: selectedMonth } : {})
  };

  return (
    <>
      <PageHeader title="Staff Payments" description="Review staff payment amounts, pay employees, and track payment history." />
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
            <Button asChild variant="outline"><Link href="/staff-payments"><X className="h-4 w-4" />Reset</Link></Button>
          </form>
        </CardContent>
      </Card>
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Payment Due</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatCurrency(totalDue, currencyCode)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Payment History Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatCurrency(totalPaid, currencyCode)}</div></CardContent>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Current Staff Payments</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <PaymentTable rows={paymentRows} selectedDate={selectedDate} selectedMonth={selectedMonth} currencyCode={currencyCode} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Paid Date</th><th>Title</th><th>Amount</th><th>Notes</th></tr></thead>
              <tbody>{paginatedPaymentHistory.length ? paginatedPaymentHistory.map((expense) => (
                <tr key={expense.id} className="border-b">
                  <td className="py-3">{expense.expenseDate.toLocaleDateString()}</td><td className="font-medium">{expense.title}</td><td>{formatCurrency(Number(expense.amount), currencyCode)}</td><td className="min-w-56 text-muted-foreground">{expense.notes || "-"}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No staff payment history yet.</td></tr>
              )}</tbody>
            </table>
            <PaginationControls basePath="/staff-payments" pageParam="historyPage" currentPage={historyPage} totalItems={paymentHistory.length} pageSize={HISTORY_PAGE_SIZE} preserveParams={historyParams} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
