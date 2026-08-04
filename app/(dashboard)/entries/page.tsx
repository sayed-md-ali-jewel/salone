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

export default async function EntriesPage({ searchParams }: EntriesPageProps) {
  const params = await searchParams;
  const page = pageNumber(searchValue(params, "page"));
  const perPage = pageSize(searchValue(params, "perPage"));
  const selectedServiceId = searchValue(params, "serviceId") || "";
  const employeeName = (searchValue(params, "employeeName") || "").trim();
  const where = {
    ...(selectedServiceId ? { serviceId: selectedServiceId } : {}),
    ...(employeeName ? { employee: { name: { contains: employeeName } } } : {})
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
      <ServiceEntryList
        customers={customers.map((customer) => ({ id: customer.id, name: customer.name }))}
        employees={employees.map((employee) => ({ id: employee.id, name: employee.name }))}
        services={services.map((service) => ({ id: service.id, name: service.name, price: Number(service.price) }))}
        entries={entries}
        currentPage={page}
        totalItems={totalEntries}
        pageSize={perPage}
        filters={{ serviceId: selectedServiceId, employeeName, perPage: String(perPage) }}
      />
    </>
  );
}
