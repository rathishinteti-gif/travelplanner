/*
 * Travel planner design philosophy: recommendations should feel curated but remain transparent,
 * showing the source categories before they become a suggested day-by-day route.
 */
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Compass, Hotel, LoaderCircle, MapPin, Utensils, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { MapView } from "@/components/Map";
import type { Activity, ItineraryDay, Trip } from "@/lib/travel";

type Recommendation = { id: string; name: string; address?: string; category: "Landmark" | "Restaurant" | "Dining" | "Hotel"; lat: number; lng: number; photoUrl?: string };
type AutoPlannerDialogProps = { trip: Trip; open: boolean; onOpenChange: (open: boolean) => void; onPlan: (trip: Trip) => void };

const searchGroups = [
  { category: "Landmark" as const, query: "famous landmarks tourist attractions" },
  { category: "Restaurant" as const, query: "best local restaurants" },
  { category: "Dining" as const, query: "must try food dining" },
  { category: "Hotel" as const, query: "recommended hotels" },
];

export function AutoPlannerDialog({ trip, open, onOpenChange, onPlan }: AutoPlannerDialogProps) {
  const [mapReady, setMapReady] = useState(false);
  const [service, setService] = useState<google.maps.places.PlacesService | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const days = useMemo(() => Math.max(1, Math.round((new Date(`${trip.endDate}T00:00:00`).getTime() - new Date(`${trip.startDate}T00:00:00`).getTime()) / 86400000) + 1), [trip.endDate, trip.startDate]);

  useEffect(() => {
    if (!mapReady || !window.google?.maps?.places) return;
    const mapNode = document.createElement("div");
    setService(new window.google.maps.places.PlacesService(mapNode));
  }, [mapReady]);

  useEffect(() => {
    if (!open || !service) return;
    let alive = true;
    setLoading(true); setRecommendations([]); setSelected(new Set());
    const all: Recommendation[] = [];
    let remaining = searchGroups.length;
    searchGroups.forEach(({ category, query }) => {
      service.textSearch({ query: `${trip.destination} ${query}` }, (results, status) => {
        if (status === "OK" && results) results.slice(0, 5).forEach((place) => { const location = place.geometry?.location; if (!location || !place.place_id || all.some((item) => item.id === place.place_id)) return; all.push({ id: place.place_id, name: place.name ?? category, address: place.formatted_address, category, lat: location.lat(), lng: location.lng(), photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 320, maxHeight: 180 }) }); });
        remaining -= 1;
        if (alive && remaining === 0) { setRecommendations(all); setSelected(new Set(all.filter((item) => item.category !== "Hotel").map((item) => item.id))); setLoading(false); }
      });
    });
    return () => { alive = false; };
  }, [open, service, trip.destination]);

  if (!open) return null;
  const toggle = (id: string) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const buildPlan = () => {
    const chosen = recommendations.filter((item) => selected.has(item.id));
    if (!chosen.length) { toast("Choose at least one place first"); return; }
    const landmarks = chosen.filter((item) => item.category === "Landmark");
    const restaurants = chosen.filter((item) => item.category === "Restaurant" || item.category === "Dining");
    const hotels = chosen.filter((item) => item.category === "Hotel");
    const itinerary: ItineraryDay[] = Array.from({ length: days }, (_, index) => {
      const date = new Date(`${trip.startDate}T00:00:00`); date.setDate(date.getDate() + index); const landmark = landmarks[index % Math.max(landmarks.length, 1)]; const restaurant = restaurants[index % Math.max(restaurants.length, 1)]; const hotel = hotels[index % Math.max(hotels.length, 1)];
      const activities: Activity[] = [];
      if (index === 0) activities.push({ id: `${trip.id}-arrival`, title: "Arrival and settle in", time: "15:00", location: trip.destination, notes: hotel ? `Stay idea: ${hotel.name}` : "Leave room to settle into the neighborhood." });
      if (landmark) activities.push({ id: `${trip.id}-${index}-landmark`, title: landmark.name, time: "10:00", location: landmark.address || trip.destination, notes: "Priority landmark from the destination search." });
      if (restaurant) activities.push({ id: `${trip.id}-${index}-dining`, title: restaurant.name, time: "19:30", location: restaurant.address || trip.destination, notes: `Don't miss this ${restaurant.category.toLowerCase()} stop.` });
      return { id: `${trip.id}-day-${index + 1}`, date: date.toISOString().slice(0, 10), activities };
    });
    onPlan({ ...trip, itinerary, status: "ready" }); onOpenChange(false); toast("Your route is ready", { description: `${days} days planned around the places worth making time for.` });
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2A35]/45 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label={`Plan ${trip.destination}`} className="max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[24px] border border-[#DED5C8] bg-[#FBF8F2] shadow-[0_24px_80px_rgba(31,42,53,0.24)]"><div className="flex items-start justify-between gap-5 border-b border-[#E5DDD2] p-6 sm:p-8"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#E56B52]"><WandSparkles size={14} /> Build a route</p><h2 className="mt-2 font-display text-[34px] leading-none text-[#26343B]">What should you not miss?</h2><p className="mt-3 max-w-[560px] text-[12px] leading-5 text-[#838A83]">We’ll look for famous places, stays, restaurants, and signature dining in {trip.destination}, then arrange a balanced plan across {days} day{days === 1 ? "" : "s"}.</p></div><button type="button" onClick={() => onOpenChange(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-[#929890] hover:bg-[#F0E8DD]">×</button></div><div className="grid lg:grid-cols-[1fr_1.05fr]"><div className="border-b border-[#E5DDD2] p-5 sm:p-8 lg:border-b-0 lg:border-r"><div id="auto-planner-map" className="hidden"><MapView className="h-1 w-1" initialCenter={{ lat: 0, lng: 0 }} initialZoom={1} onMapReady={() => setMapReady(true)} /></div><div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#92988F]">Destination brief</p><p className="mt-1 font-display text-[25px] text-[#33434A]">{trip.destination}</p></div><span className="flex items-center gap-1.5 rounded-full bg-[#E0E8DC] px-2.5 py-1.5 text-[10px] font-bold text-[#657964]"><CalendarDays size={12} /> {days} days</span></div>{loading && <div className="flex items-center gap-2 rounded-[12px] bg-[#F2ECE3] px-4 py-4 text-[11px] font-semibold text-[#858C85]"><LoaderCircle size={15} className="animate-spin text-[#E56B52]" /> Finding local favorites…</div>}{!loading && recommendations.length === 0 && <div className="rounded-[12px] border border-dashed border-[#D7CEC1] px-4 py-5 text-[11px] leading-5 text-[#8F968E]">The destination search is waiting for the map service. Open the map integration or try again in a moment.</div>}<div className="space-y-2">{recommendations.map((place) => <button key={place.id} type="button" onClick={() => toggle(place.id)} className={`flex w-full items-center gap-3 rounded-[11px] border p-2 text-left transition ${selected.has(place.id) ? "border-[#E5B9AD] bg-[#FCEBE6]" : "border-transparent bg-[#F3EEE6] opacity-65"}`}><div className="h-12 w-14 shrink-0 overflow-hidden rounded-[7px] bg-[#DCE4DF]">{place.photoUrl ? <img src={place.photoUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#6F8175]"><MapPin size={15} /></div>}</div><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-bold text-[#34434A]">{place.name}</span><span className="mt-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#E56B52]">{place.category === "Hotel" ? <Hotel size={11} /> : place.category === "Landmark" ? <Compass size={11} /> : <Utensils size={11} />} {place.category}</span><span className="mt-1 block truncate text-[10px] text-[#92978F]">{place.address || trip.destination}</span></span><span className={`flex h-7 w-7 items-center justify-center rounded-full ${selected.has(place.id) ? "bg-[#E56B52] text-white" : "bg-[#E6DED2] text-[#A5A49D]"}`}><Check size={13} /></span></button>)}</div></div><div className="bg-[#F3EEE6] p-5 sm:p-8"><div className="rounded-[14px] border border-[#DED5C8] bg-[#FBF8F2] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#92988F]">Auto-planning recipe</p><div className="mt-5 space-y-4"><div className="flex gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7DDD4] text-[#B75D49]"><Compass size={15} /></span><div><p className="text-[12px] font-bold text-[#38474D]">A signature place each day</p><p className="mt-1 text-[11px] leading-4 text-[#8B918A]">Landmarks and famous spots become the anchor activity.</p></div></div><div className="flex gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E0E8DC] text-[#647864]"><Utensils size={15} /></span><div><p className="text-[12px] font-bold text-[#38474D]">A dining stop worth remembering</p><p className="mt-1 text-[11px] leading-4 text-[#8B918A]">Restaurants and signature dining are placed into the evening.</p></div></div><div className="flex gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8E0D4] text-[#7A8079]"><Hotel size={15} /></span><div><p className="text-[12px] font-bold text-[#38474D]">A stay suggestion for context</p><p className="mt-1 text-[11px] leading-4 text-[#8B918A]">Hotel options are kept as arrival notes, never forced into the route.</p></div></div></div><button type="button" onClick={buildPlan} disabled={loading || selected.size === 0} className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#E56B52] text-[12px] font-bold text-white shadow-[0_9px_22px_rgba(229,107,82,0.2)] transition hover:bg-[#D75E47] disabled:cursor-not-allowed disabled:opacity-45"><WandSparkles size={15} /> Generate my {days}-day plan</button><p className="mt-3 text-center text-[10px] leading-4 text-[#979B94]">You can edit, reorder, or remove every suggestion after generating.</p></div></div></div></section></div>;
}
