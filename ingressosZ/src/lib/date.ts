export function formatDisplayDate(value?: string | null) {
  if (!value) return "";

  const trimmed = value.trim();
  const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);

  if (isoDate) {
    const [, year, month, day] = isoDate;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return trimmed.replace(/-/g, "/");
}
