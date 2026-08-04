"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function objectId() {
  return randomBytes(12).toString("hex");
}

function oid(id: string) {
  return { $oid: id };
}

function isObjectId(id: string) {
  return /^[a-f\d]{24}$/i.test(id);
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

function validDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validMoney(value: FormDataEntryValue | null) {
  const amount = money(value);
  return Number.isFinite(amount) ? amount : null;
}

function settingsRedirect(status: string, tab?: string): never {
  redirect(`/settings?${tab ? `tab=${tab}&` : ""}status=${status}`);
}

function formDataSnapshot(formData: FormData) {
  const hiddenFields = new Set(["password", "currentPassword", "newPassword", "confirmPassword"]);
  return Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [
      key,
      hiddenFields.has(key)
        ? "[redacted]"
        : typeof File !== "undefined" && value instanceof File
          ? `[file:${value.name}:${value.size}]`
          : String(value)
    ])
  );
}

async function runAction(actionName: string, formData: FormData, action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[server-action:${actionName}]`, {
      fields: formDataSnapshot(formData),
      error
    });
    throw error;
  }
}

function paymentDateRange(date: string, month: string) {
  if (date) {
    const from = validDate(`${date}T00:00:00`);
    if (!from) return null;
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return { from, to };
  }

  if (month) {
    const from = validDate(`${month}-01T00:00:00`);
    if (!from) return null;
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
  return runAction("createCustomer", formData, async () => {
    await requireUser();
    if (!hasDatabaseUrl()) redirect("/customers?status=customer-db-missing");
    const name = String(formData.get("name") || "").trim();
    const mobile = String(formData.get("mobile") || "").trim();
    const address = String(formData.get("address") || "").trim();
    const previousDue = validMoney(formData.get("previousDue"));
    const previousDueNote = String(formData.get("previousDueNote") || "").trim();

    if (!name || !mobile || previousDue === null || previousDue < 0 || (previousDue > 0 && !previousDueNote)) {
      redirect("/customers?status=customer-invalid");
    }

    const existingCustomer = await prisma.customer.findUnique({ where: { mobile } });

    if (existingCustomer) {
      redirect("/customers?status=customer-exists");
    }

    await insertOne("Customer", {
      name,
      mobile,
      address,
      previousDue,
      previousDueNote
    });
    revalidatePath("/customers");
    redirect("/customers?status=customer-created");
  });
}

export async function deleteCustomer(formData: FormData) {
  return runAction("deleteCustomer", formData, async () => {
  await requireUser(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") || "");
  if (!hasDatabaseUrl() || !isObjectId(id)) redirect("/customers?status=customer-invalid");
  await deleteOne("Customer", id);
  revalidatePath("/customers");
  redirect("/customers?status=customer-deleted");
  });
}

export async function updateCustomer(formData: FormData) {
  return runAction("updateCustomer", formData, async () => {
    await requireUser();
    const id = String(formData.get("id") || "");
    if (!hasDatabaseUrl() || !isObjectId(id)) redirect("/customers?status=customer-invalid");
    const name = String(formData.get("name") || "").trim();
    const mobile = String(formData.get("mobile") || "").trim();
    const address = String(formData.get("address") || "").trim();
    const previousDue = validMoney(formData.get("previousDue"));
    const previousDueNote = String(formData.get("previousDueNote") || "").trim();

    if (!name || !mobile || previousDue === null || previousDue < 0 || (previousDue > 0 && !previousDueNote)) {
      redirect("/customers?status=customer-invalid");
    }

    const existingCustomer = await prisma.customer.findUnique({ where: { mobile } });

    if (existingCustomer && existingCustomer.id !== id) {
      redirect("/customers?status=customer-exists");
    }

    await prisma.$runCommandRaw({
      update: "Customer",
      updates: [
        {
          q: { _id: oid(id) },
          u: {
            $set: {
              name,
              mobile,
              address,
              previousDue,
              previousDueNote,
              updatedAt: mongoDate()
            }
          }
        }
      ]
    });

    revalidatePath("/customers");
    revalidatePath("/entries");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    redirect("/customers?status=customer-updated");
  });
}

export async function createCustomerPayment(formData: FormData) {
  return runAction("createCustomerPayment", formData, async () => {
    await requireUser();
    const customerId = String(formData.get("customerId") || "");
    const amount = validMoney(formData.get("amount"));
    const paymentDateValue = String(formData.get("paymentDate") || "");
    const paymentDate = paymentDateValue ? validDate(`${paymentDateValue}T00:00:00`) : new Date();
    const notes = String(formData.get("notes") || "").trim();

    if (!hasDatabaseUrl() || !isObjectId(customerId) || amount === null || amount <= 0 || !paymentDate || !notes) {
      redirect("/customers?status=customer-payment-invalid");
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { customerPayments: true }
    });

    if (!customer) redirect("/customers?status=customer-payment-invalid");

    const previousDue = Number(customer.previousDue || 0);
    const paidAmount = customer.customerPayments.reduce((total, payment) => total + Number(payment.amount), 0);
    const balance = Math.max(0, previousDue - paidAmount);

    if (amount > balance) redirect("/customers?status=customer-payment-invalid");

    await insertOne("CustomerPayment", {
      customerId: oid(customerId),
      amount,
      paymentDate: mongoDate(paymentDate),
      notes
    });

    revalidatePath("/customers");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    redirect("/customers?status=customer-payment-created");
  });
}

export async function createEmployee(formData: FormData) {
  return runAction("createEmployee", formData, async () => {
  await requireUser(["ADMIN", "MANAGER"]);
  if (!hasDatabaseUrl()) redirect("/employees?status=employee-db-missing");
  const name = String(formData.get("name") || "").trim();
  const mobile = String(formData.get("mobile") || "").trim();
  const joiningDateValue = String(formData.get("joiningDate") || "");
  const joiningDate = joiningDateValue ? validDate(`${joiningDateValue}T00:00:00`) : null;
  const salaryType = String(formData.get("salaryType")) === "PERCENTAGE" ? "PERCENTAGE" : "MONTHLY";
  const monthlySalary = validMoney(formData.get("monthlySalary"));
  const commissionRate = validMoney(formData.get("commissionRate"));
  const dueSalary = validMoney(formData.get("dueSalary"));
  const dueSalaryNote = String(formData.get("dueSalaryNote") || "").trim();

  if (
    !name ||
    !joiningDate ||
    dueSalary === null ||
    dueSalary < 0 ||
    (dueSalary > 0 && !dueSalaryNote) ||
    (salaryType === "MONTHLY" && (monthlySalary === null || monthlySalary < 0)) ||
    (salaryType === "PERCENTAGE" && (commissionRate === null || commissionRate < 0 || commissionRate > 100))
  ) {
    redirect("/employees?status=employee-invalid");
  }

  await insertOne("Employee", {
    name,
    mobile,
    joiningDate: mongoDate(joiningDate),
    salaryType,
    monthlySalary: salaryType === "MONTHLY" ? monthlySalary : null,
    commissionRate: salaryType === "PERCENTAGE" ? commissionRate : null,
    dueSalary,
    dueSalaryNote
  });
  revalidatePath("/employees");
  redirect("/employees?status=employee-created");
  });
}

export async function updateEmployee(formData: FormData) {
  return runAction("updateEmployee", formData, async () => {
  await requireUser(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") || "");
  if (!hasDatabaseUrl() || !isObjectId(id)) redirect("/employees?status=employee-invalid");
  const name = String(formData.get("name") || "").trim();
  const mobile = String(formData.get("mobile") || "").trim();
  const joiningDateValue = String(formData.get("joiningDate") || "");
  const joiningDate = joiningDateValue ? validDate(`${joiningDateValue}T00:00:00`) : null;
  const salaryType = String(formData.get("salaryType")) === "PERCENTAGE" ? "PERCENTAGE" : "MONTHLY";
  const monthlySalary = validMoney(formData.get("monthlySalary"));
  const commissionRate = validMoney(formData.get("commissionRate"));
  const dueSalary = validMoney(formData.get("dueSalary"));
  const dueSalaryNote = String(formData.get("dueSalaryNote") || "").trim();

  if (
    !name ||
    !joiningDate ||
    dueSalary === null ||
    dueSalary < 0 ||
    (dueSalary > 0 && !dueSalaryNote) ||
    (salaryType === "MONTHLY" && (monthlySalary === null || monthlySalary < 0)) ||
    (salaryType === "PERCENTAGE" && (commissionRate === null || commissionRate < 0 || commissionRate > 100))
  ) {
    redirect(`/employees?edit=${id}&status=employee-invalid`);
  }

  await prisma.$runCommandRaw({
    update: "Employee",
    updates: [
      {
        q: { _id: oid(id) },
        u: {
          $set: {
            name,
            mobile,
            joiningDate: mongoDate(joiningDate),
            salaryType,
            monthlySalary: salaryType === "MONTHLY" ? monthlySalary : null,
            commissionRate: salaryType === "PERCENTAGE" ? commissionRate : null,
            dueSalary,
            dueSalaryNote,
            updatedAt: mongoDate()
          }
        }
      }
    ]
  });

  revalidatePath("/employees");
  revalidatePath("/reports");
  revalidatePath("/staff-payments");
  redirect("/employees?status=employee-updated");
  });
}

export async function deleteEmployee(formData: FormData) {
  return runAction("deleteEmployee", formData, async () => {
  await requireUser(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") || "");
  if (!hasDatabaseUrl() || !isObjectId(id)) redirect("/employees?status=employee-invalid");
  await deleteOne("Employee", id);
  revalidatePath("/employees");
  redirect("/employees?status=employee-deleted");
  });
}

export async function createService(formData: FormData) {
  return runAction("createService", formData, async () => {
  await requireUser(["ADMIN", "MANAGER"]);
  if (!hasDatabaseUrl()) redirect("/services?status=service-db-missing");
  const name = String(formData.get("name") || "").trim();
  const price = validMoney(formData.get("price"));

  if (!name || price === null || price <= 0) {
    redirect("/services?status=service-invalid");
  }

  await insertOne("Service", {
    name,
    price
  });
  revalidatePath("/services");
  redirect("/services?status=service-created");
  });
}

export async function updateService(formData: FormData) {
  return runAction("updateService", formData, async () => {
  await requireUser(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") || "");
  if (!hasDatabaseUrl() || !isObjectId(id)) redirect("/services?status=service-invalid");
  const name = String(formData.get("name") || "").trim();
  const price = validMoney(formData.get("price"));

  if (!name || price === null || price <= 0) {
    redirect(`/services?edit=${id}&status=service-invalid`);
  }

  await prisma.$runCommandRaw({
    update: "Service",
    updates: [
      {
        q: { _id: oid(id) },
        u: {
          $set: {
            name,
            price,
            updatedAt: mongoDate()
          }
        }
      }
    ]
  });

  revalidatePath("/services");
  revalidatePath("/entries");
  revalidatePath("/reports");
  redirect("/services?status=service-updated");
  });
}

export async function deleteService(formData: FormData) {
  return runAction("deleteService", formData, async () => {
  await requireUser(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") || "");
  if (!hasDatabaseUrl() || !isObjectId(id)) redirect("/services?status=service-invalid");
  await deleteOne("Service", id);
  revalidatePath("/services");
  redirect("/services?status=service-deleted");
  });
}

export async function createExpense(formData: FormData) {
  return runAction("createExpense", formData, async () => {
  await requireUser();
  if (!hasDatabaseUrl()) redirect("/expenses?status=expense-db-missing");
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "OTHER");
  const amount = validMoney(formData.get("amount"));
  const expenseDateValue = String(formData.get("expenseDate") || "");
  const expenseDate = expenseDateValue ? validDate(`${expenseDateValue}T00:00:00`) : new Date();
  const notes = String(formData.get("notes") || "").trim();
  const categories = new Set(["RENT", "SALARY", "PRODUCT", "UTILITY", "OTHER"]);

  if (!title || !categories.has(category) || amount === null || amount <= 0 || !expenseDate) {
    redirect("/expenses?status=expense-invalid");
  }

  await insertOne("Expense", {
    title,
    category,
    amount,
    expenseDate: mongoDate(expenseDate),
    notes
  });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  redirect("/expenses?status=expense-created");
  });
}

export async function updateExpense(formData: FormData) {
  return runAction("updateExpense", formData, async () => {
  await requireUser();
  const id = String(formData.get("id") || "");
  if (!hasDatabaseUrl() || !isObjectId(id)) redirect("/expenses?status=expense-invalid");
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "OTHER");
  const amount = validMoney(formData.get("amount"));
  const expenseDateValue = String(formData.get("expenseDate") || "");
  const expenseDate = expenseDateValue ? validDate(`${expenseDateValue}T00:00:00`) : null;
  const notes = String(formData.get("notes") || "").trim();
  const categories = new Set(["RENT", "SALARY", "PRODUCT", "UTILITY", "OTHER"]);

  if (!title || !categories.has(category) || amount === null || amount <= 0 || !expenseDate) {
    redirect("/expenses?status=expense-invalid");
  }

  await prisma.$runCommandRaw({
    update: "Expense",
    updates: [
      {
        q: { _id: oid(id) },
        u: {
          $set: {
            title,
            category,
            amount,
            expenseDate: mongoDate(expenseDate),
            notes,
            updatedAt: mongoDate()
          }
        }
      }
    ]
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/staff-payments");
  redirect("/expenses?status=expense-updated");
  });
}

export async function deleteExpense(formData: FormData) {
  return runAction("deleteExpense", formData, async () => {
  await requireUser();
  const id = String(formData.get("id") || "");
  if (!hasDatabaseUrl() || !isObjectId(id)) redirect("/expenses?status=expense-invalid");
  await deleteOne("Expense", id);
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  redirect("/expenses?status=expense-deleted");
  });
}

export async function payEmployee(formData: FormData) {
  return runAction("payEmployee", formData, async () => {
  await requireUser(["ADMIN", "MANAGER"]);

  const employeeId = String(formData.get("employeeId") || "");
  const date = String(formData.get("date") || "");
  const month = String(formData.get("month") || "");
  const customAmount = validMoney(formData.get("amount"));
  const paidDate = String(formData.get("paidDate") || "");
  const range = paymentDateRange(date, month);
  const paymentDate = paidDate ? validDate(`${paidDate}T00:00:00`) : new Date();

  if (!hasDatabaseUrl() || !isObjectId(employeeId) || customAmount === null || customAmount <= 0 || !paymentDate) {
    redirect("/staff-payments?status=payment-invalid");
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { serviceEntries: true }
  });

  if (!employee) redirect("/staff-payments?status=payment-invalid");

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

  if (amount <= 0 || amount > remainingAmount) redirect("/staff-payments?status=payment-invalid");
  const remainingAfterPayment = Math.max(0, remainingAmount - amount);

  await insertOne("Expense", {
    title: `Staff payment - ${employee.name}`,
    category: "SALARY",
    amount,
    expenseDate: mongoDate(paymentDate),
    notes: [
      `Employee ID: ${employeeId}.`,
      `Paid ${employee.name} for ${periodLabel}.`,
      `Remaining before payment: ${remainingAmount.toFixed(2)}.`,
      remainingAfterPayment > 0 ? `After payment amount: ${remainingAfterPayment.toFixed(2)}.` : ""
    ].filter(Boolean).join(" ")
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/staff-payments");
  revalidatePath(`/employees/${employeeId}`);
  redirect("/staff-payments?status=payment-created");
  });
}

export async function createServiceEntry(formData: FormData) {
  return runAction("createServiceEntry", formData, async () => {
  await requireUser();
  if (!hasDatabaseUrl()) redirect("/entries?status=entry-db-missing");
  const serviceId = String(formData.get("serviceId") || "");
  const employeeId = String(formData.get("employeeId") || "");
  let customerId = String(formData.get("customerId") || "");

  if (customerId === "__new_customer__") {
    const name = String(formData.get("newCustomerName") || "").trim();
    const mobile = String(formData.get("newCustomerMobile") || "").trim();
    const address = String(formData.get("newCustomerAddress") || "").trim();

    if (!name || !mobile) redirect("/entries?status=entry-invalid");

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

  if (!isObjectId(customerId) || !isObjectId(employeeId) || !isObjectId(serviceId)) {
    redirect("/entries?status=entry-invalid");
  }

  const [service, employee] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    prisma.employee.findUnique({ where: { id: employeeId } })
  ]);

  if (!service || !employee) redirect("/entries?status=entry-invalid");

  const amount = validMoney(formData.get("amount")) ?? Number(service.price);
  const serviceDateValue = String(formData.get("serviceDate") || "");
  const serviceDate = serviceDateValue ? validDate(`${serviceDateValue}T00:00:00`) : new Date();

  if (!Number.isFinite(amount) || amount <= 0 || !serviceDate) redirect("/entries?status=entry-invalid");

  const rate = employee.salaryType === "PERCENTAGE" ? Number(employee.commissionRate || 0) : 0;
  const commissionAmount = (amount * rate) / 100;

  await insertOne("ServiceEntry", {
    customerId: oid(customerId),
    employeeId: oid(employeeId),
    serviceId: oid(serviceId),
    serviceDate: mongoDate(serviceDate),
    amount,
    commissionAmount,
    salonProfit: amount - commissionAmount,
    notes: String(formData.get("notes") || "").trim()
  });

  revalidatePath("/entries");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect("/entries?status=entry-created");
  });
}

export async function updateServiceEntry(formData: FormData) {
  return runAction("updateServiceEntry", formData, async () => {
  await requireUser();
  const id = String(formData.get("id") || "");
  const customerId = String(formData.get("customerId") || "");
  const employeeId = String(formData.get("employeeId") || "");
  const serviceId = String(formData.get("serviceId") || "");

  if (!hasDatabaseUrl() || !isObjectId(id) || !isObjectId(customerId) || !isObjectId(employeeId) || !isObjectId(serviceId)) {
    redirect("/entries?status=entry-invalid");
  }

  const [customer, service, employee] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.service.findUnique({ where: { id: serviceId } }),
    prisma.employee.findUnique({ where: { id: employeeId } })
  ]);

  if (!customer || !service || !employee) redirect("/entries?status=entry-invalid");

  const amount = validMoney(formData.get("amount")) ?? Number(service.price);
  const serviceDateValue = String(formData.get("serviceDate") || "");
  const serviceDate = serviceDateValue ? validDate(`${serviceDateValue}T00:00:00`) : null;

  if (!Number.isFinite(amount) || amount <= 0 || !serviceDate) redirect("/entries?status=entry-invalid");

  const rate = employee.salaryType === "PERCENTAGE" ? Number(employee.commissionRate || 0) : 0;
  const commissionAmount = (amount * rate) / 100;

  await prisma.$runCommandRaw({
    update: "ServiceEntry",
    updates: [
      {
        q: { _id: oid(id) },
        u: {
          $set: {
            customerId: oid(customerId),
            employeeId: oid(employeeId),
            serviceId: oid(serviceId),
            serviceDate: mongoDate(serviceDate),
            amount,
            commissionAmount,
            salonProfit: amount - commissionAmount,
            notes: String(formData.get("notes") || "").trim(),
            updatedAt: mongoDate()
          }
        }
      }
    ]
  });

  revalidatePath("/entries");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect("/entries?status=entry-updated");
  });
}

export async function deleteServiceEntry(formData: FormData) {
  return runAction("deleteServiceEntry", formData, async () => {
  await requireUser();
  const id = String(formData.get("id") || "");
  if (!hasDatabaseUrl() || !isObjectId(id)) redirect("/entries?status=entry-invalid");
  await deleteOne("ServiceEntry", id);
  revalidatePath("/entries");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect("/entries?status=entry-deleted");
  });
}

export async function saveSettings(formData: FormData) {
  return runAction("saveSettings", formData, async () => {
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
  settingsRedirect("settings-saved");
  });
}

export async function createUser(formData: FormData) {
  return runAction("createUser", formData, async () => {
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
  });
}

export async function changeOwnPassword(formData: FormData) {
  return runAction("changeOwnPassword", formData, async () => {
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
  });
}
