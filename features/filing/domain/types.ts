/** Filing-domain types: the ADS inventors the application names. Pure. */

export type Inventor = {
  id: string;
  project_id: string;
  legal_name: string;
  residence: string;
  mailing_address: string;
  citizenship: string;
  ord: number;
  created_at: string;
};

/** A draft inventor row before it is persisted (no id/ord yet). */
export type InventorInput = {
  legal_name: string;
  residence: string;
  mailing_address: string;
  citizenship: string;
};
