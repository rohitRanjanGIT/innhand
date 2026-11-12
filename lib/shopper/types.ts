// What the account page receives. Types only.

export type Profile = {
  name: string;
  email: string;
  phone: string;
  orderUpdates: boolean;
  offers: boolean;
  /** "March 2026". */
  memberSince: string;
};

export type Address = {
  id: string;
  label: string;
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pin: string;
  phone: string;
  isDefault: boolean;
};
