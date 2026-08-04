const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function objectId() {
  return crypto.randomBytes(12).toString("hex");
}

function oid(id) {
  return { $oid: id };
}

function mongoDate(date = new Date()) {
  return { $date: date.toISOString() };
}

function withBase(data) {
  const { id, ...document } = data;
  const now = mongoDate();
  return {
    _id: oid(id || objectId()),
    createdAt: now,
    updatedAt: now,
    ...document
  };
}

async function insert(collection, documents) {
  await prisma.$runCommandRaw({
    insert: collection,
    documents
  });
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function calculateEntry({ amount, rate }) {
  const commissionAmount = (amount * rate) / 100;
  return {
    amount,
    commissionAmount,
    salonProfit: amount - commissionAmount
  };
}

async function main() {
  const password = await bcrypt.hash("admin123", 10);

  await Promise.all(
    ["ServiceEntry", "Expense", "Service", "Employee", "Customer", "Setting", "User"].map((collection) =>
      prisma.$runCommandRaw({
        delete: collection,
        deletes: [{ q: {}, limit: 0 }]
      })
    )
  );

  await insert("User", [
    withBase({ name: "Salon Admin", email: "admin@salon.local", password, role: "ADMIN" }),
    withBase({ name: "Front Desk Manager", email: "manager@salon.local", password, role: "MANAGER" }),
    withBase({ name: "Cash Counter", email: "cashier@salon.local", password, role: "CASHIER" })
  ]);

  const customers = [
    { id: objectId(), name: "Ayesha Rahman", mobile: "01711000001", address: "Dhanmondi, Dhaka" },
    { id: objectId(), name: "Nusrat Jahan", mobile: "01711000002", address: "Banani, Dhaka" },
    { id: objectId(), name: "Farhana Akter", mobile: "01711000003", address: "Uttara, Dhaka" },
    { id: objectId(), name: "Mehedi Hasan", mobile: "01711000004", address: "Mirpur, Dhaka" },
    { id: objectId(), name: "Sadia Islam", mobile: "01711000005", address: "Gulshan, Dhaka" }
  ];
  await insert("Customer", customers.map(withBase));

  const employees = [
    { id: objectId(), name: "Rima Sultana", mobile: "01822000001", salaryType: "PERCENTAGE", monthlySalary: null, commissionRate: 25 },
    { id: objectId(), name: "Tanvir Ahmed", mobile: "01822000002", salaryType: "MONTHLY", monthlySalary: 25000, commissionRate: null },
    { id: objectId(), name: "Maliha Khan", mobile: "01822000003", salaryType: "PERCENTAGE", monthlySalary: null, commissionRate: 30 }
  ];
  await insert("Employee", employees.map(withBase));

  const services = [
    { id: objectId(), name: "Hair Cut", price: 500, defaultRate: 15 },
    { id: objectId(), name: "Hair Color", price: 2500, defaultRate: 20 },
    { id: objectId(), name: "Facial", price: 1800, defaultRate: 18 },
    { id: objectId(), name: "Manicure", price: 800, defaultRate: 12 },
    { id: objectId(), name: "Bridal Makeup", price: 12000, defaultRate: 25 }
  ];
  await insert("Service", services.map(withBase));

  const serviceEntries = [
    { customer: customers[0], employee: employees[0], service: services[0], amount: 500, rate: 25, days: 0, notes: "Regular hair trim" },
    { customer: customers[1], employee: employees[2], service: services[2], amount: 1800, rate: 30, days: 1, notes: "Glow facial package" },
    { customer: customers[2], employee: employees[1], service: services[1], amount: 2500, rate: 20, days: 3, notes: "Full hair color" },
    { customer: customers[3], employee: employees[0], service: services[3], amount: 800, rate: 25, days: 5, notes: "Manicure service" },
    { customer: customers[4], employee: employees[2], service: services[4], amount: 12000, rate: 30, days: 9, notes: "Premium bridal makeup" },
    { customer: customers[0], employee: employees[1], service: services[2], amount: 1800, rate: 18, days: 16, notes: "Monthly facial visit" },
    { customer: customers[1], employee: employees[0], service: services[1], amount: 2400, rate: 25, days: 30, notes: "Discounted color service" }
  ];

  await insert(
    "ServiceEntry",
    serviceEntries.map((entry) =>
      withBase({
        customerId: oid(entry.customer.id),
        employeeId: oid(entry.employee.id),
        serviceId: oid(entry.service.id),
        serviceDate: mongoDate(daysAgo(entry.days)),
        notes: entry.notes,
        ...calculateEntry(entry)
      })
    )
  );

  await insert("Expense", [
    withBase({ title: "Shop Rent", category: "RENT", amount: 35000, expenseDate: mongoDate(daysAgo(2)), notes: "July rent" }),
    withBase({ title: "Hair Color Products", category: "PRODUCT", amount: 8500, expenseDate: mongoDate(daysAgo(4)), notes: "Color and developer stock" }),
    withBase({ title: "Electricity Bill", category: "UTILITY", amount: 4200, expenseDate: mongoDate(daysAgo(8)), notes: "Monthly utility bill" }),
    withBase({ title: "Staff Snacks", category: "OTHER", amount: 1200, expenseDate: mongoDate(daysAgo(1)), notes: "Team refreshments" })
  ]);

  await insert("Setting", [
    withBase({ key: "salonName", value: "Glow & Grace Salon" }),
    withBase({ key: "mobile", value: "+8801711000000" }),
    withBase({ key: "address", value: "House 12, Road 7, Dhanmondi, Dhaka" }),
    withBase({ key: "logoUrl", value: "" }),
    withBase({ key: "currency", value: "BDT" })
  ]);

  console.log("Seed data created successfully.");
  console.log("Login: admin@salon.local / admin123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
