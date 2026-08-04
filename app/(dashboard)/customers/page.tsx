import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { getCurrencyCode } from "@/lib/settings";
import { CustomerList } from "@/components/customers/customer-list";
import { PageHeader } from "@/components/layout/page-header";

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type CustomersPageProps = {
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
    "customer-created": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Customer added successfully." },
    "customer-updated": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Customer updated successfully." },
    "customer-deleted": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Customer deleted successfully." },
    "customer-exists": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "A customer with this mobile number already exists." },
    "customer-invalid": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "Please enter customer name, mobile number, and a due note when previous due is added." },
    "customer-db-missing": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "Database connection is required to save customers." }
  };
  return messages[status];
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const page = pageNumber(searchValue(params, "page"));
  const perPage = pageSize(searchValue(params, "perPage"));
  const name = (searchValue(params, "name") || "").trim();
  const mobile = (searchValue(params, "mobile") || "").trim();
  const status = statusMessage(searchValue(params, "status") || "");
  const where = {
    ...(name ? { name: { contains: name } } : {}),
    ...(mobile ? { mobile: { contains: mobile } } : {})
  };
  const [customers, totalCustomers, currencyCode] = hasDatabaseUrl() ? await Promise.all([
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * perPage, take: perPage }).catch(() => []),
    prisma.customer.count({ where }).catch(() => 0),
    getCurrencyCode()
  ]) : [[], 0, "USD"];

  return (
    <>
      <PageHeader title="Customers" description="Add, edit and remove salon customers." />
      {status && <div className={`mb-4 rounded-md border px-4 py-3 text-sm font-medium ${status.tone}`}>{status.text}</div>}
      <CustomerList customers={customers} currentPage={page} totalItems={totalCustomers} pageSize={perPage} currencyCode={currencyCode} filters={{ name, mobile, perPage: String(perPage) }} />
    </>
  );
}
