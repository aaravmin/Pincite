/**
 * Pure normalization of the inventor rows the ADS form submits. Every field is trimmed, and
 * a row where the user typed nothing at all is dropped - the form always renders at least one
 * blank row, so an untouched matter must not persist a phantom inventor. Order is preserved:
 * the caller assigns `ord` from the resulting index (the ADS lists inventors in order).
 */
import type { InventorInput } from "@/features/filing/domain/types";

export function normalizeInventors(input: InventorInput[]): InventorInput[] {
  return input
    .map((i) => ({
      legal_name: i.legal_name?.trim() ?? "",
      residence: i.residence?.trim() ?? "",
      mailing_address: i.mailing_address?.trim() ?? "",
      citizenship: i.citizenship?.trim() ?? "",
    }))
    .filter(
      (i) =>
        i.legal_name || i.residence || i.mailing_address || i.citizenship,
    );
}
