export interface ClientAddressDto {
  id: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  complement?: string;
}

export interface ClientDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  addresses?: ClientAddressDto[];
}
