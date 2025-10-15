export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateOnlyToUTC(dateString: string): Date {
  if (!DATE_ONLY_REGEX.test(dateString)) {
    throw new Error(`Invalid date-only value: ${dateString}`);
  }
  return new Date(`${dateString}T00:00:00.000Z`);
}

export function normalizeDateInput(
  value: string | Date | null | undefined,
): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const normalized = new Date(value.getTime());
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  }

  if (typeof value === "string") {
    if (DATE_ONLY_REGEX.test(value)) {
      return parseDateOnlyToUTC(value);
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Unable to parse date value: ${value}`);
    }
    parsed.setUTCHours(0, 0, 0, 0);
    return parsed;
  }

  throw new Error("Unsupported date input");
}

export function formatDateOnly(
  value: Date | string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    if (DATE_ONLY_REGEX.test(value)) {
      return value;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Unable to format date value: ${value}`);
    }
    return parsed.toISOString().slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}
