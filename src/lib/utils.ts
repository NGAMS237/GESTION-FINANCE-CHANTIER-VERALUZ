export function fmtN(n: number | string | null | undefined): string {
  const v = Number(n || 0);
  const s = Math.abs(v)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (v < 0 ? "-" : "") + s;
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  partial: "Partiel",
  paid: "Soldé",
  in_progress: "En cours",
  completed: "Terminé",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#3b82f6",
  partial: "#8b5cf6",
  paid: "#10b981",
  in_progress: "#f97316",
  completed: "#10b981",
};

export const METHOD_LABELS: Record<string, string> = {
  virement: "Virement",
  mobile: "Mobile Money",
  mobile_money: "Mobile Money",
  especes: "Espèces",
  cheque: "Chèque",
};

// Extra alias for mobile_money
