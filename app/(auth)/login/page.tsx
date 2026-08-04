import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <Image src="/royal-arob.jpeg" alt="Royale Arab Men's Club logo" width={64} height={64} className="h-16 w-16 rounded-full border object-cover" priority />
          <div>
            <CardTitle className="text-2xl">Royale Arab Men's Club</CardTitle>
            <CardDescription>Sign in to manage bookings, income, expenses and reports.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {params.error ? (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Invalid email or password.
            </div>
          ) : null}
          <form action="/api/auth/login" method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue="admin@salon.local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" defaultValue="admin123" required />
            </div>
            <Button className="w-full" type="submit">Login</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
