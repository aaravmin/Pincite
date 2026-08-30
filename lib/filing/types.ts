/**
 * Split into two features. Re-export shim; delete once every importer is remapped.
 * - Inventor / InventorInput -> features/filing/domain/types.ts
 * - Attachment* / Drawing*   -> features/drawings/domain/types.ts
 */
export * from "@/features/filing/domain/types";
export * from "@/features/drawings/domain/types";
