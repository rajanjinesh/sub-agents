export type SearchInput = {
  destination: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults: number; // min 1
  children: number; // min 0
  childAges: number[]; // length === children, each 0–17
};
