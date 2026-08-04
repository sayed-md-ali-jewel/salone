import { hasDatabaseUrl, prisma } from "@/lib/prisma";

export async function getCurrencyCode() {
  if (!hasDatabaseUrl()) return "USD";

  const setting = await prisma.setting.findUnique({ where: { key: "currency" } }).catch(() => null);
  return setting?.value || "USD";
}
