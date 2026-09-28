const SOUTH_ASIAN_UNITS = [
  { value: 10000000, label: "Crore" },
  { value: 100000, label: "Lakh" },
  { value: 1000, label: "Thousand" },
  { value: 100, label: "Hundred" },
];

export function formatSouthAsianAmountInWords(amount: number): string {
  if (!Number.isFinite(amount)) return "Zero";

  const absoluteAmount = Math.floor(Math.abs(amount));
  if (absoluteAmount === 0) return "Zero";

  let remaining = absoluteAmount;
  const parts: string[] = [];

  for (const unit of SOUTH_ASIAN_UNITS) {
    const quantity = Math.floor(remaining / unit.value);
    if (quantity > 0) {
      parts.push(`${quantity} ${unit.label}`);
      remaining %= unit.value;
    }
  }

  if (remaining > 0) parts.push(String(remaining));
  return parts.join(" ");
}