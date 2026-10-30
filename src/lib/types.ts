export type SearchInput = {
  destination: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults: number; // min 1
  children: number; // min 0
  childAges: number[]; // length === children, each 0–17
};

export type Stay = {
  source: "booking" | "airbnb";
  name: string;
  totalPrice: number; // INR, incl. taxes & fees
  pricePerNight: number; // INR
  currency: "INR";
  rating: number; // /10, already converted
  reviewCount: number | null;
  url: string;
  feesMayBeExtra: boolean; // Airbnb only, else false
};
