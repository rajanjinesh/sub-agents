import { SearchForm } from "@/components/SearchForm";

export default function SearchPage() {
  return (
    <main className="page-column flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-strong">Sub-Agents</h1>
        <p className="text-sm leading-5 text-muted">Compare stays on Booking.com and Airbnb</p>
      </header>
      <SearchForm />
    </main>
  );
}
