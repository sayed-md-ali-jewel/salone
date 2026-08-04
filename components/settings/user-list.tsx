"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createUser } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function UserList({ users }: { users: UserListItem[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>User List</CardTitle>
          <Button type="button" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.length ? users.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-3 font-medium">{item.name}</td>
                  <td>{item.email}</td>
                  <td>{item.role}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted-foreground">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-md border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Add User</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form action={createUser} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input name="name" required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input name="email" type="email" required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input name="password" type="password" minLength={6} required />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <select name="role" defaultValue="CASHIER" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="CASHIER">Cashier</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit">
                  <Plus className="h-4 w-4" />
                  Add User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
