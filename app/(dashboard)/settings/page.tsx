import Link from "next/link";
import { Download, Upload } from "lucide-react";
import { changeOwnPassword, saveSettings } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { UserList } from "@/components/settings/user-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function searchValue(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function statusMessage(status: string) {
  const messages: Record<string, { tone: string; text: string }> = {
    "user-created": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "User added successfully." },
    "user-exists": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "A user with this email already exists." },
    "user-invalid": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "Please enter a name, email, and a password with at least 6 characters." },
    "password-updated": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Password changed successfully." },
    "password-invalid": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "New password must be at least 6 characters and match the confirmation." },
    "password-current": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "Current password is incorrect." },
    "password-unavailable": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "This account password cannot be changed from the database settings page." },
    "settings-saved": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Settings saved successfully." },
    "backup-db-missing": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "Database connection is required for backup import or export." },
    "import-success": { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "CSV backup imported successfully." },
    "import-invalid": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "Please choose a CSV backup file to import." },
    "import-failed": { tone: "border-destructive/30 bg-destructive/10 text-destructive", text: "CSV import failed. Check the file format and try again." }
  };
  return messages[status];
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const status = statusMessage(searchValue(params, "status") || "");
  const requestedTab = searchValue(params, "tab") || "salon";
  const activeTab = requestedTab === "users" && user.role === "ADMIN" ? "users" : "salon";
  const [settings, users] = hasDatabaseUrl() ? await Promise.all([
    prisma.setting.findMany().catch(() => []),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true } }).catch(() => [])
  ]) : [[], []];
  const values = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));

  return (
    <>
      <PageHeader title="Settings" description="Configure salon info, account access, and users." />
      {status && <div className={`mb-4 rounded-md border px-4 py-3 text-sm font-medium ${status.tone}`}>{status.text}</div>}
      <div className="mb-4 flex flex-wrap gap-2 border-b">
        <Link
          href="/settings"
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors",
            activeTab === "salon" ? "border-primary text-primary" : "border-transparent hover:text-foreground"
          )}
        >
          Salon Information
        </Link>
        {user.role === "ADMIN" && (
          <Link
            href="/settings?tab=users"
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors",
              activeTab === "users" ? "border-primary text-primary" : "border-transparent hover:text-foreground"
            )}
          >
            User List
          </Link>
        )}
      </div>
      <div className="space-y-4">
        {activeTab === "salon" && (
          <>
            <Card>
              <CardHeader><CardTitle>Salon Information</CardTitle></CardHeader>
              <CardContent>
                <form action={saveSettings} className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Salon Name</Label><Input name="salonName" defaultValue={values.salonName || "Salon Pro"} /></div>
                  <div className="space-y-2"><Label>Mobile</Label><Input name="mobile" defaultValue={values.mobile || ""} /></div>
                  <div className="space-y-2 sm:col-span-2"><Label>Address</Label><Input name="address" defaultValue={values.address || ""} /></div>
                  <div className="space-y-2"><Label>Logo URL</Label><Input name="logoUrl" defaultValue={values.logoUrl || ""} /></div>
                  <div className="space-y-2"><Label>Currency</Label><select name="currency" defaultValue={values.currency || "USD"} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="USD">USD</option><option value="BDT">BDT</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></div>
                  <div className="sm:col-span-2"><Button type="submit">Save Settings</Button></div>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
              <CardContent>
                <form action={changeOwnPassword} className="space-y-4">
                  <div className="space-y-2"><Label>Current Password</Label><Input name="currentPassword" type="password" required /></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>New Password</Label><Input name="newPassword" type="password" minLength={6} required /></div>
                    <div className="space-y-2"><Label>Confirm Password</Label><Input name="confirmPassword" type="password" minLength={6} required /></div>
                  </div>
                  <Button type="submit">Change Password</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>CSV Backup</CardTitle></CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium">Export Data</h3>
                    <p className="text-sm text-muted-foreground">Download a full CSV backup and save a copy in salone_backup.</p>
                  </div>
                  <Button asChild variant="outline">
                    <a href="/api/settings/data/export-csv">
                      <Download className="h-4 w-4" />
                      Export CSV
                    </a>
                  </Button>
                </div>
                {user.role === "ADMIN" && (
                  <form action="/api/settings/data/import-csv" method="post" encType="multipart/form-data" className="space-y-3">
                    <div>
                      <h3 className="text-sm font-medium">Import Data</h3>
                      <p className="text-sm text-muted-foreground">Restore from an exported CSV. A pre-import backup is saved first.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backupFile">CSV File</Label>
                      <Input id="backupFile" name="backupFile" type="file" accept=".csv,text/csv" required />
                    </div>
                    <Button type="submit">
                      <Upload className="h-4 w-4" />
                      Import CSV
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </>
        )}
        {activeTab === "users" && <UserList users={users} />}
      </div>
    </>
  );
}
