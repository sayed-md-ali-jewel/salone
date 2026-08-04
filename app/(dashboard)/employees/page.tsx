import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { getCurrencyCode } from "@/lib/settings";
import { EmployeeList } from "@/components/employees/employee-list";
import { PageHeader } from "@/components/layout/page-header";

const PAGE_SIZE = 25;

type EmployeesPageProps = {
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

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const params = await searchParams;
  const editId = searchValue(params, "edit") || "";
  const wasUpdated = searchValue(params, "updated") === "1";
  const page = pageNumber(searchValue(params, "page"));
  const name = (searchValue(params, "name") || "").trim();
  const where = {
    ...(name ? { name: { contains: name } } : {})
  };
  const [employees, totalEmployees, editingEmployee, currencyCode] = hasDatabaseUrl() ? await Promise.all([
    prisma.employee.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }).catch(() => []),
    prisma.employee.count({ where }).catch(() => 0),
    editId ? prisma.employee.findUnique({ where: { id: editId } }).catch(() => null) : null,
    getCurrencyCode()
  ]) : [[], 0, null, "USD"];

  return (
    <>
      <PageHeader title="Employees" description="Manage monthly and percentage-based staff salary rules." />
      {wasUpdated && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Employee updated successfully.
        </div>
      )}
      <EmployeeList employees={employees} editingEmployee={editingEmployee} currentPage={page} totalItems={totalEmployees} pageSize={PAGE_SIZE} currencyCode={currencyCode} filters={{ name }} />
    </>
  );
}
