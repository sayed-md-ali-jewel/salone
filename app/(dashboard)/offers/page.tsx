import { OfferComposer } from "@/components/offers/offer-composer";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";

export default async function OffersPage() {
  const customers = hasDatabaseUrl()
    ? await prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, mobile: true } }).catch(() => [])
    : [];

  return (
    <>
      <PageHeader title="Offers" description="Create custom offer messages and send them through WhatsApp, Telegram, or email." />
      <Card>
        <CardHeader><CardTitle>Custom Offer Message</CardTitle></CardHeader>
        <CardContent>
          <OfferComposer customers={customers} />
        </CardContent>
      </Card>
    </>
  );
}
