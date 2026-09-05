/*
 * Sunlit Atlas design philosophy: the trip form feels like filling out a beautiful travel card,
 * with warm paper surfaces, short labels, and a coral action reserved for committing a route.
 */
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createTrip, type Trip } from "@/lib/travel";

type TripCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (trip: Trip) => void;
};

export function TripCreateDialog({ open, onOpenChange, onCreated }: TripCreateDialogProps) {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setDestination("");
      setStartDate("");
      setEndDate("");
      setError("");
    }
  }, [open]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!destination.trim() || !startDate || !endDate) {
      setError("Add a destination and both dates to sketch this route.");
      return;
    }
    if (endDate < startDate) {
      setError("Your return date needs to come after your departure date.");
      return;
    }
    const trip = createTrip(destination.trim(), startDate, endDate);
    onCreated(trip);
    onOpenChange(false);
    toast("Trip added to your atlas", { description: `${trip.destination} is ready for planning.` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#DED6C9] bg-[#FBF8F2] text-[#22303A] shadow-[0_24px_80px_rgba(36,47,49,0.18)] sm:max-w-[520px]">
        <DialogHeader className="pr-8 text-left">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#E56B52]"><span className="h-px w-6 bg-[#E56B52]" /> New route</p>
          <DialogTitle className="font-display text-[34px] font-normal tracking-[-0.03em]">Where will you go next?</DialogTitle>
          <DialogDescription className="max-w-[390px] text-[13px] leading-6 text-[#7C827D]">Start with the shape of the trip. You can add places and daily plans once the route is on paper.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5 pt-3">
          <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#747D79]">Destination
            <span className="relative mt-2 block"><MapPin size={16} className="absolute left-3 top-3.5 text-[#E56B52]" /><input autoFocus value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Lisbon, Portugal" className="h-12 w-full rounded-[10px] border border-[#DFD7CA] bg-[#F5F0E7] pl-10 pr-3 text-[14px] font-semibold normal-case tracking-normal text-[#25343B] outline-none transition placeholder:text-[#A6A69E] focus:border-[#E56B52] focus:ring-2 focus:ring-[#E56B52]/10" /></span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#747D79]">Departure
              <span className="relative mt-2 block"><CalendarDays size={15} className="absolute left-3 top-3.5 text-[#718B77]" /><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-12 w-full rounded-[10px] border border-[#DFD7CA] bg-[#F5F0E7] pl-10 pr-3 text-[13px] font-semibold tracking-normal text-[#25343B] outline-none transition focus:border-[#E56B52] focus:ring-2 focus:ring-[#E56B52]/10" /></span>
            </label>
            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#747D79]">Return
              <span className="relative mt-2 block"><CalendarDays size={15} className="absolute left-3 top-3.5 text-[#718B77]" /><input type="date" min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-12 w-full rounded-[10px] border border-[#DFD7CA] bg-[#F5F0E7] pl-10 pr-3 text-[13px] font-semibold tracking-normal text-[#25343B] outline-none transition focus:border-[#E56B52] focus:ring-2 focus:ring-[#E56B52]/10" /></span>
            </label>
          </div>
          {error && <p role="alert" className="rounded-[9px] border border-[#E7B7AA] bg-[#FCEBE6] px-3 py-2 text-[12px] font-semibold text-[#B55543]">{error}</p>}
          <DialogFooter className="pt-2 sm:justify-between">
            <p className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A9E97] sm:flex"><span className="h-2 w-2 rounded-full bg-[#E56B52]" /> Saved locally</p>
            <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#E56B52] px-5 text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(229,107,82,0.22)] transition hover:-translate-y-0.5 hover:bg-[#D85D46] active:scale-[0.97]"><Plus size={16} /> Create trip</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
