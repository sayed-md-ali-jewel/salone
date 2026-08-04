import { ArrowDownCircle, ArrowUpCircle, Banknote, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default async function DashboardPage() {
  const [entries, expenses] = hasDatabaseUrl() ? await Promise.all([
    prisma.serviceEntry.findMany({ orderBy: { serviceDate: "desc" }, take: 5, include: { customer: true, service: true } }).catch(() => []),
    prisma.expense.findMany({ orderBy: { expenseDate: "desc" }, take: 5 }).catch(() => [])
  ]) : [[], []];

  const income = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const commission = entries.reduce((sum, entry) => sum + Number(entry.commissionAmount), 0);
  const expense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const profit = income - commission - expense;

  const cards = [
    { label: "Income", value: currency(income), icon: ArrowUpCircle, tone: "text-emerald-600" },
    { label: "Expense", value: currency(expense), icon: ArrowDownCircle, tone: "text-rose-600" },
    { label: "Commission", value: currency(commission), icon: Banknote, tone: "text-amber-600" },
    { label: "Profit", value: currency(profit), icon: TrendingUp, tone: "text-primary" }
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Track salon income, expenses, commissions and profit." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.tone}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                ["Income", income, "bg-emerald-500"],
                ["Expense", expense, "bg-rose-500"],
                ["Profit", Math.max(profit, 0), "bg-primary"]
              ].map(([label, value, color]) => {
                const amount = Number(value);
                const width = income ? Math.min(100, (amount / income) * 100) : 0;
                return (
                  <div key={String(label)}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>{label}</span>
                      <span className="font-medium">{currency(amount)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted">
                      <div className={`h-3 rounded-full ${color}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.length ? entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{entry.customer.name}</p>
                  <p className="text-xs text-muted-foreground">{entry.service.name}</p>
                </div>
                <span className="text-sm font-semibold">{currency(Number(entry.amount))}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">No transactions yet.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
