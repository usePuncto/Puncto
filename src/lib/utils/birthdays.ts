export function isBirthdayToday(birthDate?: string): boolean {
  if (!birthDate) return false;

  const date = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth();
}
