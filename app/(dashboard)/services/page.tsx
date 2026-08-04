import Link from "next/link";
import type { Route } from "next";
import { Eye, Pencil, Trash2, X } from "lucide-react";
import { createService, deleteService, updateService } from "@/lib/actions";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { StatusAlert } from "@/components/ui/status-alert";

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

function statusMessage(status: string) {
  const messages: Record<string, { tone: string; text: string }> = {
    "service-created": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Service added successfully." },
    "service-updated": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Service updated successfully." },
    "service-deleted": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Service deleted successfully." },
    "service-invalid": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "Please enter a valid service name, price, and commission rate." },
    "service-db-missing": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "Database connection is required to save services." }
  };
  return messages[status];
}

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const params = await searchParams;
  const page = pageNumber(searchValue(params, "page"));
  const viewId = searchValue(params, "view") || "";
  const editId = searchValue(params, "edit") || "";
  const status = statusMessage(searchValue(params, "status") || "");
  const [services, totalServices, selectedService] = hasDatabaseUrl() ? await Promise.all([
    prisma.service.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }).catch(() => []),
    prisma.service.count().catch(() => 0),
    viewId || editId ? prisma.service.findUnique({ where: { id: viewId || editId } }).catch(() => null) : null
  ]) : [[], 0, null];

  return (
    <>
      <PageHeader title="Services" description="Create and manage salon service pricing." />
      {status && <StatusAlert tone={status.tone} text={status.text} />}
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
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Service</th><th>Price</th><th>Default Commission</th><th className="sticky right-0 z-10 w-36 border-l bg-card text-center">Action</th></tr></thead>
              <tbody>{services.map((service) => (
                <tr key={service.id} className="border-b">
                  <td className="py-3 font-medium">{service.name}</td><td>${String(service.price)}</td><td>{String(service.defaultRate)}%</td>
                  <td className="sticky right-0 z-10 border-l bg-card">
                    <div className="flex justify-center gap-1">
                      <Button asChild variant="ghost" size="icon"><Link href={`/services?view=${service.id}` as Route}><Eye className="h-4 w-4" /></Link></Button>
                      <Button asChild variant="ghost" size="icon"><Link href={`/services?edit=${service.id}` as Route}><Pencil className="h-4 w-4" /></Link></Button>
                      <form action={deleteService}><input type="hidden" name="id" value={service.id} /><Button variant="ghost" size="icon" type="submit"><Trash2 className="h-4 w-4" /></Button></form>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            <PaginationControls basePath="/services" currentPage={page} totalItems={totalServices} pageSize={PAGE_SIZE} />
          </CardContent>
        </Card>
      </div>
      {selectedService && viewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-md border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">Service Details</h2>
              <Button asChild variant="ghost" size="icon"><Link href="/services"><X className="h-4 w-4" /></Link></Button>
            </div>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-muted-foreground">Service</dt><dd className="font-medium">{selectedService.name}</dd></div>
              <div><dt className="text-muted-foreground">Price</dt><dd className="font-medium">${String(selectedService.price)}</dd></div>
              <div><dt className="text-muted-foreground">Default Commission</dt><dd className="font-medium">{String(selectedService.defaultRate)}%</dd></div>
            </dl>
          </div>
        </div>
      )}
      {selectedService && editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-md border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">Edit Service</h2>
              <Button asChild variant="ghost" size="icon"><Link href="/services"><X className="h-4 w-4" /></Link></Button>
            </div>
            <form action={updateService} className="space-y-4">
              <input type="hidden" name="id" value={selectedService.id} />
              <div className="space-y-2"><Label>Service Name</Label><Input name="name" defaultValue={selectedService.name} required /></div>
              <div className="space-y-2"><Label>Price</Label><Input name="price" type="number" step="0.01" defaultValue={selectedService.price} required /></div>
              <div className="space-y-2"><Label>Default Commission %</Label><Input name="defaultRate" type="number" step="0.01" defaultValue={selectedService.defaultRate} /></div>
              <div className="flex justify-end gap-2">
                <Button asChild variant="outline"><Link href="/services">Cancel</Link></Button>
                <Button type="submit">Update Service</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
