export interface AddressModel {
  id: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  complement?: string;
  client_id: string;
  created_at: Date;
  updated_at: Date;
}
