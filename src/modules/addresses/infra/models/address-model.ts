export interface AddressModel {
  id: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  complement?: string | null;
  client_id: string;
  created_at: Date;
  updated_at: Date;
}
