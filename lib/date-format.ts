function ordinal(day: number) {
  if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`;

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function formatDisplayDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${ordinal(date.getDate())} ${date.toLocaleString("en-US", { month: "long" })}, ${date.getFullYear()}`;
}
