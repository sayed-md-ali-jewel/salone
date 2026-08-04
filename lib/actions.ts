"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function objectId() {
  return randomBytes(12).toString("hex");
}

function oid(id: string) {
  return { $oid: id };
}

function mongoDate(date = new Date()) {
  return { $date: date.toISOString() };
}

function withBase(data: Record<string, unknown>) {
  const now = mongoDate();
  return {
    _id: oid(objectId()),
    createdAt: now,
    updatedAt: now,
    ...data
  };
}

async function insertOne(collection: string, document: Record<string, unknown>) {
  await prisma.$runCommandRaw({
    insert: collection,
    documents: [withBase(document)]
  });
}

async function deleteOne(collection: string, id: string) {
  await prisma.$runCommandRaw({
    delete: collection,
    deletes: [{ q: { _id: oid(id) }, limit: 1 }]
  });
}

function money(value: FormDataEntryValue | null) {
  return Number(value || 0);
}

function settingsRedirect(status: string, tab?: string): never {
  redirect(`/settings?${tab ? `tab=${tab}&` : ""}status=${status}`);
}

function paymentDateRange(date: string, month: string) {
  if (date) {
    const from = new Date(`${date}T00:00:00`);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return { from, to };
  }

  if (month) {
    const from = new Date(`${month}-01T00:00:00`);
    const to = new Date(from);
    to.setMonth(to.getMonth() + 1);
    return { from, to };
  }

  return null;
}

function paymentPeriodLabel(date: string, month: string) {
  if (date) return date;
  if (month) return month;
  return "all time";
}

function isStaffPaymentForPeriod(expense: { title: string; notes: string | null }, employeeId: string, employeeName: string, periodLabel: string) {
  const notes = String(expense.notes || "");
  const matchesEmployee = expense.title.includes(employeeName) || notes.includes(employeeName) || notes.includes(`Employee ID: ${employeeId}`);
  if (!matchesEmployee) return false;
  return periodLabel === "all time" || notes.includes(`for ${periodLabel}.`);
}

export async function createCustomer(formData: FormData) {
  await requireUser();
  await insertOne("Customer", {
    name: String(formData.get("name") || ""),
    mobile: String(formData.get("mobile") || ""),
    address: String(formData.get("address") || "")
  });
  revalidatePath("/customers");
}

export async function deleteCustomer(formData: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  await deleteOne("Customer", String(formData.get("id")));
  revalidatePath("/customers");
}

export async function createEmployee(formData: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  const salaryType = String(formData.get("salaryType")) === "PERCENTAGE" ? "PERCENTAGE" : "MONTHLY";
  await insertOne("Employee", {
    name: String(formData.get("name") || ""),
    mobile: String(formData.get("mobile") || ""),
    salaryType,
    monthlySalary: salaryType === "MONTHLY" ? money(formData.get("monthlySalary")) : null,
    commissionRate: salaryType === "PERCENTAGE" ? money(formData.get("commissionRate")) : null
  });
  revalidatePath("/employees");
}

export async function updateEmployee(formData: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") || "");
  const salaryType = String(formData.get("salaryType")) === "PERCENTAGE" ? "PERCENTAGE" : "MONTHLY";

  if (!id) return;

  await prisma.$runCommandRaw({
    update: "Employee",
    updates: [
      {
        q: { _id: oid(id) },
        u: {
          $set: {
            name: String(formData.get("name") || ""),
            mobile: String(formData.get("mobile") || ""),
            salaryType,
            monthlySalary: salaryType === "MONTHLY" ? money(formData.get("monthlySalary")) : null,
            commissionRate: salaryType === "PERCENTAGE" ? money(formData.get("commissionRate")) : null,
            updatedAt: mongoDate()
          }
        }
      }
    ]
  });

  revalidatePath("/employees");
  revalidatePath("/reports");
  revalidatePath("/staff-payments");
  redirect("/employees?updated=1");
}

export async function deleteEmployee(formData: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  await deleteOne("Employee", String(formData.get("id")));
  revalidatePath("/employees");
}

export async function createService(formData: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  await insertOne("Service", {
    name: String(formData.get("name") || ""),
    price: money(formData.get("price")),
    defaultRate: money(formData.get("defaultRate"))
  });
  revalidatePath("/services");
}

export async function deleteService(formData: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  await deleteOne("Service", String(formData.get("id")));
  revalidatePath("/services");
}

export async function createExpense(formData: FormData) {
  await requireUser();
  await insertOne("Expense", {
    title: String(formData.get("title") || ""),
    category: String(formData.get("category") || "OTHER"),
    amount: money(formData.get("amount")),
    expenseDate: mongoDate(new Date(String(formData.get("expenseDate") || new Date().toISOString()))),
    notes: String(formData.get("notes") || "")
  });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function deleteExpense(formData: FormData) {
  await requireUser();
  await deleteOne("Expense", String(formData.get("id")));
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function payEmployee(formData: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);

  const employeeId = String(formData.get("employeeId") || "");
  const date = String(formData.get("date") || "");
  const month = String(formData.get("month") || "");
  const customAmount = money(formData.get("amount"));
  const paidDate = String(formData.get("paidDate") || "");
  const customNotes = String(formData.get("notes") || "").trim();
  const range = paymentDateRange(date, month);

  if (!employeeId) return;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { serviceEntries: true }
  });

  if (!employee) return;

  const serviceEntries = range
    ? employee.serviceEntries.filter((entry) => entry.serviceDate >= range.from && entry.serviceDate < range.to)
    : employee.serviceEntries;
  const commissionPayment = employee.salaryType === "PERCENTAGE"
    ? serviceEntries.reduce((total, entry) => total + Number(entry.commissionAmount), 0)
    : 0;
  const monthlyPayment = employee.salaryType === "MONTHLY" ? Number(employee.monthlySalary || 0) : 0;
  const suggestedAmount = commissionPayment + monthlyPayment;
  const periodLabel = paymentPeriodLabel(date, month);
  const previousPayments = await prisma.expense.findMany({ where: { category: "SALARY" } });
  const alreadyPaid = previousPayments
    .filter((expense) => isStaffPaymentForPeriod(expense, employeeId, employee.name, periodLabel))
    .reduce((total, expense) => total + Number(expense.amount), 0);
  const remainingAmount = Math.max(0, suggestedAmount - alreadyPaid);
  const amount = customAmount > 0 ? customAmount : remainingAmount;

  if (amount <= 0 || amount > remainingAmount) return;

  await insertOne("Expense", {
    title: `Staff payment - ${employee.name}`,
    category: "SALARY",
    amount,
    expenseDate: mongoDate(new Date(paidDate || new Date().toISOString())),
    notes: [
      `Paid ${employee.name} for ${paymentPeriodLabel(date, month)}.`,
      `Employee ID: ${employeeId}.`,
      `Suggested amount: ${suggestedAmount.toFixed(2)}.`,
      `Already paid: ${alreadyPaid.toFixed(2)}.`,
      `Remaining before payment: ${remainingAmount.toFixed(2)}.`,
      `Commission: ${commissionPayment.toFixed(2)}.`,
      `Monthly salary: ${monthlyPayment.toFixed(2)}.`,
      customNotes ? `Notes: ${customNotes}` : ""
    ].filter(Boolean).join(" ")
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/staff-payments");
  revalidatePath(`/employees/${employeeId}`);
}

export async function createServiceEntry(formData: FormData) {
  await requireUser();
  const serviceId = String(formData.get("serviceId"));
  const employeeId = String(formData.get("employeeId"));
  let customerId = String(formData.get("customerId"));

  if (customerId === "__new_customer__") {
    const name = String(formData.get("newCustomerName") || "").trim();
    const mobile = String(formData.get("newCustomerMobile") || "").trim();
    const address = String(formData.get("newCustomerAddress") || "").trim();

    if (!name || !mobile) return;

    const existingCustomer = await prisma.customer.findUnique({ where: { mobile } });

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      customerId = objectId();
      await insertOne("Customer", {
        _id: oid(customerId),
        name,
        mobile,
        address
      });
    }
  }

  const [service, employee] = await Promise.all([
    prisma.service.findUniqueOrThrow({ where: { id: serviceId } }),
    prisma.employee.findUniqueOrThrow({ where: { id: employeeId } })
  ]);

  const amount = Number(formData.get("amount") || service.price);
  const rate = employee.salaryType === "PERCENTAGE" ? Number(employee.commissionRate || 0) : 0;
  const commissionAmount = (amount * rate) / 100;

  await insertOne("ServiceEntry", {
    customerId: oid(customerId),
    employeeId: oid(employeeId),
    serviceId: oid(serviceId),
    serviceDate: mongoDate(new Date(String(formData.get("serviceDate") || new Date().toISOString()))),
    amount,
    commissionAmount,
    salonProfit: amount - commissionAmount,
    notes: String(formData.get("notes") || "")
  });

  revalidatePath("/entries");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function deleteServiceEntry(formData: FormData) {
  await requireUser();
  await deleteOne("ServiceEntry", String(formData.get("id")));
  revalidatePath("/entries");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function saveSettings(formData: FormData) {
  await requireUser(["ADMIN", "MANAGER"]);
  const entries = [
    ["salonName", String(formData.get("salonName") || "")],
    ["mobile", String(formData.get("mobile") || "")],
    ["address", String(formData.get("address") || "")],
    ["logoUrl", String(formData.get("logoUrl") || "")],
    ["currency", String(formData.get("currency") || "USD")]
  ] as const;

  await Promise.all(
    entries.map(([key, value]) =>
      prisma.$runCommandRaw({
        update: "Setting",
        updates: [
          {
            q: { key },
            u: {
              $set: { value, updatedAt: mongoDate() },
              $setOnInsert: { _id: oid(objectId()), key, createdAt: mongoDate() }
            },
            upsert: true
          }
        ]
      })
    )
  );

  revalidatePath("/settings");
}

export async function createUser(formData: FormData) {
  await requireUser(["ADMIN"]);

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const roleValue = String(formData.get("role") || "CASHIER");
  const role = roleValue === "ADMIN" || roleValue === "MANAGER" ? roleValue : "CASHIER";

  if (!name || !email || password.length < 6) settingsRedirect("user-invalid", "users");

  const existingUser = await prisma.user.findUnique({ where: { email } }).catch(() => null);
  if (existingUser) settingsRedirect("user-exists", "users");

  await insertOne("User", {
    name,
    email,
    password: await bcrypt.hash(password, 10),
    role
  });

  revalidatePath("/settings");
  settingsRedirect("user-created", "users");
}

export async function changeOwnPassword(formData: FormData) {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 6 || newPassword !== confirmPassword) settingsRedirect("password-invalid");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } }).catch(() => null);
  if (!dbUser) settingsRedirect("password-unavailable");

  const validPassword = await bcrypt.compare(currentPassword, dbUser.password);
  if (!validPassword) settingsRedirect("password-current");

  await prisma.$runCommandRaw({
    update: "User",
    updates: [
      {
        q: { _id: oid(user.id) },
        u: {
          $set: {
            password: await bcrypt.hash(newPassword, 10),
            updatedAt: mongoDate()
          }
        }
      }
    ]
  });

  revalidatePath("/settings");
  settingsRedirect("password-updated");
}
