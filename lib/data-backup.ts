import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

const backupDirName = "salone_backup";

const csvFields = [
  "table",
  "id",
  "name",
  "email",
  "password",
  "role",
  "mobile",
  "address",
  "previousDue",
  "previousDueNote",
  "salaryType",
  "monthlySalary",
  "commissionRate",
  "joiningDate",
  "dueSalary",
  "dueSalaryNote",
  "price",
  "customerId",
  "employeeId",
  "serviceId",
  "serviceDate",
  "paymentDate",
  "amount",
  "commissionAmount",
  "salonProfit",
  "title",
  "category",
  "expenseDate",
  "notes",
  "key",
  "value",
  "createdAt",
  "updatedAt"
] as const;

type CsvField = (typeof csvFields)[number];
type CsvRow = Record<CsvField, string>;

type BackupRow = Partial<Record<CsvField, string | number | null | Date>> & {
  table: string;
  id: string;
};

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function backupDir() {
  return path.join(process.cwd(), backupDirName);
}

function backupPath(prefix: string) {
  return path.join(backupDir(), `${prefix}-${stamp()}.csv`);
}

export async function saveBackupFile(prefix: string, contents: string) {
  const filePath = backupPath(prefix);
  await mkdir(backupDir(), { recursive: true });
  await writeFile(filePath, contents, "utf8");
  return filePath;
}

function cell(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (value === null || typeof value === "undefined") return "";
  return String(value);
}

function csvEscape(value: unknown) {
  return JSON.stringify(cell(value));
}

export function rowsToCsv(rows: BackupRow[]) {
  return [
    csvFields.join(","),
    ...rows.map((row) => csvFields.map((field) => csvEscape(row[field])).join(","))
  ].join("\n");
}

export async function createBackupCsv() {
  const [users, settings, customers, customerPayments, employees, services, expenses, serviceEntries] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.setting.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.customer.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.customerPayment.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.employee.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.service.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.expense.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.serviceEntry.findMany({ orderBy: { createdAt: "asc" } })
  ]);

  return rowsToCsv([
    ...users.map((row) => ({ table: "User", ...row })),
    ...settings.map((row) => ({ table: "Setting", ...row })),
    ...customers.map((row) => ({ table: "Customer", ...row })),
    ...customerPayments.map((row) => ({ table: "CustomerPayment", ...row })),
    ...employees.map((row) => ({ table: "Employee", ...row })),
    ...services.map((row) => ({ table: "Service", ...row })),
    ...expenses.map((row) => ({ table: "Expense", ...row })),
    ...serviceEntries.map((row) => ({ table: "ServiceEntry", ...row }))
  ]);
}

export function downloadName() {
  return `salone-backup-${stamp()}.csv`;
}

function parseCsv(csv: string) {
  const records: string[][] = [];
  let record: string[] = [];
  let value = "";
  let inQuotes = false;
  const source = csv.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      value += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      record.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      record.push(value);
      if (record.some((cellValue) => cellValue.trim().length > 0)) records.push(record);
      record = [];
      value = "";
    } else {
      value += char;
    }
  }

  record.push(value);
  if (record.some((cellValue) => cellValue.trim().length > 0)) records.push(record);

  const [headers = [], ...rows] = records;
  return rows.map((values) => {
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])) as CsvRow;
  });
}

function dateValue(value: string) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function numberValue(value: string) {
  return Number(value || 0);
}

function optionalNumber(value: string) {
  return value === "" ? null : Number(value);
}

function optionalString(value: string) {
  return value === "" ? null : value;
}

function roleValue(value: string) {
  return value === "ADMIN" || value === "MANAGER" ? value : "CASHIER";
}

function salaryTypeValue(value: string) {
  return value === "PERCENTAGE" ? value : "MONTHLY";
}

function expenseCategoryValue(value: string) {
  return value === "RENT" || value === "SALARY" || value === "PRODUCT" || value === "UTILITY" ? value : "OTHER";
}

function requireId(row: CsvRow) {
  if (!row.id) throw new Error("Every imported row must include an id.");
  return row.id;
}

export async function restoreBackupCsv(csv: string) {
  const rows = parseCsv(csv);
  const byTable = (table: string) => rows.filter((row) => row.table === table);

  await prisma.serviceEntry.deleteMany();
  await prisma.customerPayment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.service.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: byTable("User").map((row) => ({
      id: requireId(row),
      name: row.name,
      email: row.email,
      password: row.password,
      role: roleValue(row.role),
      createdAt: dateValue(row.createdAt),
      updatedAt: dateValue(row.updatedAt)
    }))
  });

  await prisma.setting.createMany({
    data: byTable("Setting").map((row) => ({
      id: requireId(row),
      key: row.key,
      value: row.value,
      createdAt: dateValue(row.createdAt),
      updatedAt: dateValue(row.updatedAt)
    }))
  });

  await prisma.customer.createMany({
    data: byTable("Customer").map((row) => ({
      id: requireId(row),
      name: row.name,
      mobile: row.mobile,
      address: optionalString(row.address),
      previousDue: optionalNumber(row.previousDue),
      previousDueNote: optionalString(row.previousDueNote),
      createdAt: dateValue(row.createdAt),
      updatedAt: dateValue(row.updatedAt)
    }))
  });

  await prisma.customerPayment.createMany({
    data: byTable("CustomerPayment").map((row) => ({
      id: requireId(row),
      customerId: row.customerId,
      amount: numberValue(row.amount),
      paymentDate: dateValue(row.paymentDate),
      notes: row.notes,
      createdAt: dateValue(row.createdAt),
      updatedAt: dateValue(row.updatedAt)
    }))
  });

  await prisma.employee.createMany({
    data: byTable("Employee").map((row) => ({
      id: requireId(row),
      name: row.name,
      mobile: optionalString(row.mobile),
      salaryType: salaryTypeValue(row.salaryType),
      joiningDate: row.joiningDate ? dateValue(row.joiningDate) : null,
      monthlySalary: optionalNumber(row.monthlySalary),
      commissionRate: optionalNumber(row.commissionRate),
      dueSalary: optionalNumber(row.dueSalary),
      dueSalaryNote: optionalString(row.dueSalaryNote),
      createdAt: dateValue(row.createdAt),
      updatedAt: dateValue(row.updatedAt)
    }))
  });

  await prisma.service.createMany({
    data: byTable("Service").map((row) => ({
      id: requireId(row),
      name: row.name,
      price: numberValue(row.price),
      createdAt: dateValue(row.createdAt),
      updatedAt: dateValue(row.updatedAt)
    }))
  });

  await prisma.expense.createMany({
    data: byTable("Expense").map((row) => ({
      id: requireId(row),
      title: row.title,
      category: expenseCategoryValue(row.category),
      amount: numberValue(row.amount),
      expenseDate: dateValue(row.expenseDate),
      notes: optionalString(row.notes),
      createdAt: dateValue(row.createdAt),
      updatedAt: dateValue(row.updatedAt)
    }))
  });

  await prisma.serviceEntry.createMany({
    data: byTable("ServiceEntry").map((row) => ({
      id: requireId(row),
      customerId: row.customerId,
      employeeId: row.employeeId,
      serviceId: row.serviceId,
      serviceDate: dateValue(row.serviceDate),
      amount: numberValue(row.amount),
      commissionAmount: numberValue(row.commissionAmount),
      salonProfit: numberValue(row.salonProfit),
      notes: optionalString(row.notes),
      createdAt: dateValue(row.createdAt),
      updatedAt: dateValue(row.updatedAt)
    }))
  });
}

export { backupDirName };
