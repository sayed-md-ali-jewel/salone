export function formatCurrency(value: number, currencyCode = "USD") {
  const locale = currencyCode === "BDT" ? "en-BD" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode }).format(value);
}
