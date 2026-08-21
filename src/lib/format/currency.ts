const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Formats a monetary amount for display. */
export function formatCurrency(amount: number): string {
  return formatter.format(amount);
}

/** Formats a surcharge, e.g. `+$1.50`. Returns `""` when there is none. */
export function formatSurcharge(amount: number): string {
  return amount > 0 ? `+${formatter.format(amount)}` : "";
}

/** Parses user input into a number, treating blank/invalid input as 0. */
export function parseAmount(input: string): number {
  const parsed = Number.parseFloat(input);
  return Number.isFinite(parsed) ? parsed : 0;
}
