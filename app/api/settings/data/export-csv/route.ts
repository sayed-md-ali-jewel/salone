import { NextResponse } from "next/server";
import { createBackupCsv, downloadName, saveBackupFile } from "@/lib/data-backup";
import { requireUser } from "@/lib/auth";
import { hasDatabaseUrl } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireUser(["ADMIN", "MANAGER"]);

  if (!hasDatabaseUrl()) {
    return new NextResponse(null, { status: 303, headers: { Location: "/settings?status=backup-db-missing" } });
  }

  const csv = await createBackupCsv();
  const fileName = downloadName();
  await saveBackupFile("export", csv);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "text/csv; charset=utf-8"
    }
  });
}
