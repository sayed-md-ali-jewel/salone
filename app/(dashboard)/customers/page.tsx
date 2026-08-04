import { hasDatabaseUrl, prisma } from "@/lib/prisma";
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

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const page = pageNumber(searchValue(params, "page"));
  const perPage = pageSize(searchValue(params, "perPage"));
  const name = (searchValue(params, "name") || "").trim();
  const mobile = (searchValue(params, "mobile") || "").trim();
  const where = {
    ...(name ? { name: { contains: name } } : {}),
    ...(mobile ? { mobile: { contains: mobile } } : {})
  };
  const [customers, totalCustomers] = hasDatabaseUrl() ? await Promise.all([
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * perPage, take: perPage }).catch(() => []),
    prisma.customer.count({ where }).catch(() => 0)
  ]) : [[], 0];

  return (
    <>
      <PageHeader title="Customers" description="Add, edit and remove salon customers." />
      <CustomerList customers={customers} currentPage={page} totalItems={totalCustomers} pageSize={perPage} filters={{ name, mobile, perPage: String(perPage) }} />
    </>
  );
}
