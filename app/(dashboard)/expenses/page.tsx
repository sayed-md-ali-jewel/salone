import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { ExpenseList } from "@/components/expenses/expense-list";
import { PageHeader } from "@/components/layout/page-header";

const PAGE_SIZE = 25;

type ExpensesPageProps = {
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

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const params = await searchParams;
  const page = pageNumber(searchValue(params, "page"));
  const fromDate = searchValue(params, "fromDate") || "";
  const toDate = searchValue(params, "toDate") || "";
  const category = searchValue(params, "category") || "";
  const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
  const to = toDate ? new Date(`${toDate}T00:00:00`) : null;
  if (to) to.setDate(to.getDate() + 1);
  const where = {
    ...(category ? { category: category as "RENT" | "SALARY" | "PRODUCT" | "UTILITY" | "OTHER" } : {}),
    ...(from || to ? { expenseDate: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {})
  };
  const [expenses, totalExpenses] = hasDatabaseUrl() ? await Promise.all([
    prisma.expense.findMany({ where, orderBy: { expenseDate: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }).catch(() => []),
    prisma.expense.count({ where }).catch(() => 0)
  ]) : [[], 0];

  return (
    <>
      <PageHeader title="Expenses" description="Track rent, salary, product, utility and other salon costs." />
      <ExpenseList expenses={expenses} currentPage={page} totalItems={totalExpenses} pageSize={PAGE_SIZE} filters={{ fromDate, toDate, category }} />
    </>
  );
}
