export function formatPassengers(n: number): string {
  return n.toLocaleString("hr-HR");
}

export function formatK(n: number): string {
  return (n / 1000).toLocaleString("hr-HR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + "k"
}
