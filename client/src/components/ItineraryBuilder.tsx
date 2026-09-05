/*
 * Sunlit Atlas design philosophy: itineraries read like annotated day cards, with tactile ordering
 * cues, stamped metadata, and direct controls that keep the route easy to reshape.
 */
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, GripVertical, MapPin, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Activity, ItineraryDay, Trip } from "@/lib/travel";

type ItineraryBuilderProps = {
  trip: Trip | null;
  onTripChange: (trip: Trip) => void;
};

export function ItineraryBuilder({ trip, onTripChange }: ItineraryBuilderProps) {
  const [activeDayId, setActiveDayId] = useState<string | null>(trip?.itinerary[0]?.id ?? null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const activeDay = useMemo(() => trip?.itinerary.find((day) => day.id === activeDayId) ?? trip?.itinerary[0] ?? null, [activeDayId, trip]);

  if (!trip || !activeDay) {
    return <section className="rounded-[20px] border border-dashed border-[#D4CCC0] bg-[#F7F2EA] p-8 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#E1B9AD] text-[#E56B52]"><CalendarDays size={18} /></span><h3 className="mt-4 font-display text-[25px] text-[#2D3B42]">Your itinerary is waiting for a route.</h3><p className="mx-auto mt-2 max-w-[320px] text-[12px] leading-5 text-[#92968F]">Create a trip above, then shape each day with stops, meals, and the small moments worth remembering.</p></section>;
  }

  const updateDay = (updater: (day: ItineraryDay) => ItineraryDay) => {
    const nextItinerary = trip.itinerary.map((day) => (day.id === activeDay.id ? updater(day) : day));
    onTripChange({ ...trip, itinerary: nextItinerary });
  };

  const reorder = (fromId: string, toIndex: number) => {
    const currentIndex = activeDay.activities.findIndex((activity) => activity.id === fromId);
    if (currentIndex < 0 || currentIndex === toIndex) return;
    updateDay((day) => {
      const activities = [...day.activities];
      const [moved] = activities.splice(currentIndex, 1);
      activities.splice(toIndex, 0, moved);
      return { ...day, activities };
    });
    setDraggedId(null);
  };

  const addActivity = () => {
    const activity: Activity = { id: `${Date.now()}-activity`, title: "A new place to explore", time: "10:00", location: trip.destination };
    updateDay((day) => ({ ...day, activities: [...day.activities, activity] }));
    toast("Blank activity added", { description: "Edit the title when your next idea arrives." });
  };

  const move = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= activeDay.activities.length) return;
    reorder(activeDay.activities[index].id, destination);
  };

  return (
    <section className="overflow-hidden rounded-[20px] border border-[#DCD4C7] bg-[#FBF8F2] shadow-[0_14px_36px_rgba(48,55,53,0.06)]">
      <div className="flex flex-col gap-4 border-b border-[#E5DED3] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#E56B52]"><Sparkles size={14} /> Route notes</p><h3 className="mt-2 font-display text-[30px] leading-none tracking-[-0.03em] text-[#293840]">Shape the day.</h3><p className="mt-2 text-[12px] text-[#8C918B]">{trip.destination} / Drag stops into the order that feels right.</p></div><button type="button" onClick={addActivity} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#E2B8AC] bg-[#FCEBE6] px-4 text-[11px] font-bold text-[#B75A47] transition hover:bg-[#F8DDD5] active:scale-[0.97]"><Plus size={15} /> Add activity</button></div>
      <div className="border-b border-[#E5DED3] bg-[#F4EFE6] px-5 py-3 sm:px-6"><div className="flex gap-2 overflow-x-auto">{trip.itinerary.map((day, index) => <button type="button" key={day.id} onClick={() => setActiveDayId(day.id)} className={`shrink-0 rounded-[9px] px-3 py-2 text-left transition ${day.id === activeDay.id ? "bg-[#293840] text-white" : "text-[#7D847E] hover:bg-[#E9E2D8]"}`}><span className="block text-[9px] font-bold uppercase tracking-[0.15em] opacity-65">Day {index + 1}</span><span className="mt-1 block text-[11px] font-bold">{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${day.date}T00:00:00`))}</span></button>)}</div></div>
      <div className="space-y-3 p-5 sm:p-6">
        {activeDay.activities.length === 0 && <div className="rounded-[12px] border border-dashed border-[#D5CEC2] px-4 py-7 text-center"><p className="font-display text-[22px] text-[#43514F]">An open page.</p><p className="mt-1 text-[11px] text-[#9A9E97]">Add your first stop, then move it into place.</p></div>}
        {activeDay.activities.map((activity, index) => <article key={activity.id} draggable onDragStart={(event) => { setDraggedId(activity.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", activity.id); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const sourceId = event.dataTransfer.getData("text/plain") || draggedId; if (sourceId) reorder(sourceId, index); }} className={`group flex items-center gap-3 rounded-[12px] border bg-[#F8F3EB] px-3 py-3 transition ${draggedId === activity.id ? "border-[#E56B52] opacity-60" : "border-[#E4DDD2] hover:border-[#CFC6B8]"}`}><button type="button" aria-label={`Drag ${activity.title}`} className="cursor-grab touch-none text-[#B3B1A7] active:cursor-grabbing"><GripVertical size={17} /></button><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAE2D6] text-[10px] font-bold text-[#7F877F]">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold text-[#34434A]">{activity.title}</p><p className="mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9A9D95]"><span>{activity.time}</span><span className="h-1 w-1 rounded-full bg-[#C8C1B5]" /><MapPin size={11} /> {activity.location}</p></div><div className="flex items-center gap-1 opacity-70 transition group-hover:opacity-100"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${activity.title} up`} className="flex h-7 w-7 items-center justify-center rounded-full text-[#7D877F] hover:bg-[#E9E0D5] disabled:opacity-25"><ArrowUp size={13} /></button><button type="button" onClick={() => move(index, 1)} disabled={index === activeDay.activities.length - 1} aria-label={`Move ${activity.title} down`} className="flex h-7 w-7 items-center justify-center rounded-full text-[#7D877F] hover:bg-[#E9E0D5] disabled:opacity-25"><ArrowDown size={13} /></button></div></article>)}
      </div>
    </section>
  );
}
