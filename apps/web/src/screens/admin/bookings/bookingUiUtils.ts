export const bookingAmountUnitOptions = [
  { value: "Lakh", label: "Lakh" },
  { value: "Cr", label: "Cr" },
] as const;

export type BookingAmountUnit =
  (typeof bookingAmountUnitOptions)[number]["value"];

export function normalizeBookingAmountInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = cleaned.split(".");
  const decimal = decimalParts.join("").slice(0, 2);
  return decimalParts.length > 0 ? `${whole}.${decimal}` : whole;
}

export function toBookingAmountRupees(amount: string, unit: BookingAmountUnit) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return "";

  const multiplier = unit === "Cr" ? 10_000_000 : 100_000;
  return Math.round(numericAmount * multiplier).toString();
}

export function toRupeeAmount(amount: string) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return "";
  return Math.round(numericAmount).toString();
}

export function getFirstInventoryImage(
  unit?: {
    imageUrl?: string | null;
    imageGallery?: Array<string | null | undefined>;
  },
  project?: {
    imageUrl?: string | null;
    imageGallery?: Array<string | null | undefined>;
  },
) {
  const unitGalleryImage = unit?.imageGallery?.find((image): image is string =>
    Boolean(image),
  );
  const projectGalleryImage = project?.imageGallery?.find(
    (image): image is string => Boolean(image),
  );

  return (
    unit?.imageUrl ||
    unitGalleryImage ||
    project?.imageUrl ||
    projectGalleryImage ||
    ""
  );
}
