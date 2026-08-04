import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { ServiceEntryList } from "@/components/entries/service-entry-list";
import { PageHeader } from "@/components/layout/page-header";

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type EntriesPageProps = {
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

function pageSize(value: string | undefined) {
  const size = Number(value || DEFAULT_PAGE_SIZE);
  return PAGE_SIZE_OPTIONS.includes(size) ? size : DEFAULT_PAGE_SIZE;
}

function statusMessage(status: string) {
  const messages: Record<string, { tone: string; text: string }> = {
    "entry-created": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Service entry added successfully." },
    "entry-updated": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Service entry updated successfully." },
    "entry-deleted": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Service entry deleted successfully." },
    "entry-invalid": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "Please enter a valid customer, employee, service, amount, and date." },
    "entry-db-missing": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "Database connection is required to save service entries." }
  };
  return messages[status];
}

export default async function EntriesPage({ searchParams }: EntriesPageProps) {
  const params = await searchParams;
  const page = pageNumber(searchValue(params, "page"));
  const perPage = pageSize(searchValue(params, "perPage"));
  const selectedServiceId = searchValue(params, "serviceId") || "";
  const selectedEmployeeId = searchValue(params, "employeeId") || "";
  const status = statusMessage(searchValue(params, "status") || "");
  const where = {
    ...(selectedServiceId ? { serviceId: selectedServiceId } : {}),
    ...(selectedEmployeeId ? { employeeId: selectedEmployeeId } : {})
  };
  const [customers, employees, services, entries, totalEntries] = hasDatabaseUrl() ? await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }).catch(() => []),
    prisma.employee.findMany({ orderBy: { name: "asc" } }).catch(() => []),
    prisma.service.findMany({ orderBy: { name: "asc" } }).catch(() => []),
    prisma.serviceEntry.findMany({
      where,
      orderBy: { serviceDate: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { customer: true, employee: true, service: true }
    }).catch(() => []),
    prisma.serviceEntry.count({ where }).catch(() => 0)
  ]) : [[], [], [], [], 0];

  return (
    <>
      <PageHeader title="Daily Service Entry" description="Record customer services and calculate commission plus salon profit." />
      {status && <div className={`mb-4 rounded-md border px-4 py-3 text-sm font-medium ${status.tone}`}>{status.text}</div>}
      <ServiceEntryList
        customers={customers.map((customer) => ({ id: customer.id, name: customer.name }))}
        employees={employees.map((employee) => ({ id: employee.id, name: employee.name }))}
        services={services.map((service) => ({ id: service.id, name: service.name, price: Number(service.price) }))}
        entries={entries}
        currentPage={page}
        totalItems={totalEntries}
        pageSize={perPage}
        filters={{ serviceId: selectedServiceId, employeeId: selectedEmployeeId, perPage: String(perPage) }}
      />
    </>
  );
}
