import { Trash2 } from "lucide-react";
import { createService, deleteService } from "@/lib/actions";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";

const PAGE_SIZE = 50;

type ServicesPageProps = {
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

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const params = await searchParams;
  const page = pageNumber(searchValue(params, "page"));
  const [services, totalServices] = hasDatabaseUrl() ? await Promise.all([
    prisma.service.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }).catch(() => []),
    prisma.service.count().catch(() => 0)
  ]) : [[], 0];

  return (
    <>
      <PageHeader title="Services" description="Create and manage salon service pricing." />
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader><CardTitle>Add Service</CardTitle></CardHeader>
          <CardContent>
            <form action={createService} className="space-y-4">
              <div className="space-y-2"><Label>Service Name</Label><Input name="name" required /></div>
              <div className="space-y-2"><Label>Price</Label><Input name="price" type="number" step="0.01" required /></div>
              <div className="space-y-2"><Label>Default Commission %</Label><Input name="defaultRate" type="number" step="0.01" defaultValue="0" /></div>
              <Button type="submit" className="w-full">Save Service</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Service List</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Service</th><th>Price</th><th>Default Commission</th><th></th></tr></thead>
              <tbody>{services.map((service) => (
                <tr key={service.id} className="border-b">
                  <td className="py-3 font-medium">{service.name}</td><td>${String(service.price)}</td><td>{String(service.defaultRate)}%</td>
                  <td><form action={deleteService}><input type="hidden" name="id" value={service.id} /><Button variant="ghost" size="icon" type="submit"><Trash2 className="h-4 w-4" /></Button></form></td>
                </tr>
              ))}</tbody>
            </table>
            <PaginationControls basePath="/services" currentPage={page} totalItems={totalServices} pageSize={PAGE_SIZE} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
