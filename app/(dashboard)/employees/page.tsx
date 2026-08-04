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

function statusMessage(status: string, wasUpdated: boolean) {
  const messages: Record<string, { tone: string; text: string }> = {
    "employee-created": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Employee added successfully." },
    "employee-updated": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Employee updated successfully." },
    "employee-deleted": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Employee deleted successfully." },
    "employee-invalid": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "Please enter valid employee salary details, including a due note when due salary is added." },
    "employee-db-missing": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "Database connection is required to save employees." }
  };
  return messages[status] || (wasUpdated ? messages["employee-updated"] : undefined);
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const params = await searchParams;
  const editId = searchValue(params, "edit") || "";
  const wasUpdated = searchValue(params, "updated") === "1";
  const status = statusMessage(searchValue(params, "status") || "", wasUpdated);
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
      {status && <div className={`mb-4 rounded-md border px-4 py-3 text-sm font-medium ${status.tone}`}>{status.text}</div>}
      <EmployeeList employees={employees} editingEmployee={editingEmployee} currentPage={page} totalItems={totalEmployees} pageSize={PAGE_SIZE} currencyCode={currencyCode} filters={{ name }} />
    </>
  );
}
