import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createBackupCsv, restoreBackupCsv, saveBackupFile } from "@/lib/data-backup";
import { requireUser } from "@/lib/auth";
import { hasDatabaseUrl } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToSettings(status: string) {
  return new NextResponse(null, { status: 303, headers: { Location: `/settings?status=${status}` } });
}

export async function POST(request: Request) {
  await requireUser(["ADMIN"]);

  if (!hasDatabaseUrl()) {
    return redirectToSettings("backup-db-missing");
  }

  const formData = await request.formData();
  const file = formData.get("backupFile");

  if (!(file instanceof File) || file.size === 0 || !file.name.toLowerCase().endsWith(".csv")) {
    return redirectToSettings("import-invalid");
  }

  const csv = await file.text();

  try {
    await saveBackupFile("before-import", await createBackupCsv());
    await saveBackupFile("import", csv);
    await restoreBackupCsv(csv);
  } catch {
    return redirectToSettings("import-failed");
  }

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/customers");
  revalidatePath("/employees");
  revalidatePath("/services");
  revalidatePath("/entries");
  revalidatePath("/expenses");
  revalidatePath("/reports");
  revalidatePath("/staff-payments");

  return redirectToSettings("import-success");
}
