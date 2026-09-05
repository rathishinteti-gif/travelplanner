/*
 * Sunlit Atlas design philosophy: map discovery feels like unfolding a paper atlas, with coral
 * route marks, stamped place labels, and a clear distinction between searching and saving.
 */
import { useMemo, useRef, useState } from "react";
import { Check, Compass, MapPin, Search, Star, X } from "lucide-react";
import { toast } from "sonner";
import { MapView } from "@/components/Map";
import { PLACES_STORAGE_KEY, readStorage, writeStorage, type SavedPlace } from "@/lib/travel";

type MapExplorerProps = { onPlacesChange?: (places: SavedPlace[]) => void };
type Destination = SavedPlace & { detail: string };

const destinations: Destination[] = [
  { id: "lisbon", name: "Lisbon", address: "Portugal", lat: 38.7223, lng: -9.1393, detail: "Light, tiled streets, long lunches" },
  { id: "kyoto", name: "Kyoto", address: "Japan", lat: 35.0116, lng: 135.7681, detail: "Quiet lanes, old wood, maple shade" },
  { id: "marrakech", name: "Marrakech", address: "Morocco", lat: 31.6295, lng: -7.9811, detail: "Courtyards, spice markets, warm evenings" },
  { id: "reykjavik", name: "Reykjavik", address: "Iceland", lat: 64.1466, lng: -21.9426, detail: "Long light, sea air, open roads" },
  { id: "mexico-city", name: "Mexico City", address: "Mexico", lat: 19.4326, lng: -99.1332, detail: "Big skies, neighborhood tables, color" },
];

export function MapExplorer({ onPlacesChange }: MapExplorerProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Record<string, google.maps.marker.AdvancedMarkerElement>>({});
  const [query, setQuery] = useState("");
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>(() => readStorage(PLACES_STORAGE_KEY, []));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return destinations.filter((place) => !normalized || `${place.name} ${place.address}`.toLowerCase().includes(normalized)).slice(0, 4);
  }, [query]);

  const focusPlace = (place: SavedPlace) => {
    setSelectedId(place.id);
    mapRef.current?.panTo({ lat: place.lat, lng: place.lng });
    mapRef.current?.setZoom(10);
  };

  const addMarker = (place: SavedPlace) => {
    if (!mapRef.current || !window.google?.maps?.marker || markersRef.current[place.id]) return;
    markersRef.current[place.id] = new window.google.maps.marker.AdvancedMarkerElement({ map: mapRef.current, position: { lat: place.lat, lng: place.lng }, title: place.name });
  };

  const savePlace = (place: SavedPlace) => {
    if (savedPlaces.some((saved) => saved.id === place.id)) {
      focusPlace(place);
      return;
    }
    const next = [...savedPlaces, place];
    setSavedPlaces(next);
    writeStorage(PLACES_STORAGE_KEY, next);
    onPlacesChange?.(next);
    addMarker(place);
    focusPlace(place);
    toast(`${place.name} pinned to your atlas`, { description: "Saved locally for your next route." });
  };

  const removePlace = (place: SavedPlace) => {
    const next = savedPlaces.filter((saved) => saved.id !== place.id);
    setSavedPlaces(next);
    writeStorage(PLACES_STORAGE_KEY, next);
    onPlacesChange?.(next);
    if (markersRef.current[place.id]) markersRef.current[place.id].map = null;
    delete markersRef.current[place.id];
    if (selectedId === place.id) setSelectedId(null);
  };

  return (
    <section className="relative overflow-hidden rounded-[20px] border border-[#DCD4C7] bg-[#E5E0D5] shadow-[0_14px_36px_rgba(48,55,53,0.08)]">
      <div className="grid lg:grid-cols-[0.38fr_0.62fr]">
        <div className="relative z-10 border-b border-[#D4CCC0] bg-[#F9F5EE] p-5 lg:border-b-0 lg:border-r lg:p-6">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#E56B52]"><Compass size={14} /> Field notes</p>
          <h3 className="mt-3 font-display text-[30px] leading-[0.98] tracking-[-0.03em] text-[#26343B]">Keep a few places<br /><em>within reach.</em></h3>
          <p className="mt-4 text-[12px] leading-5 text-[#7E837E]">Search the atlas, then pin the places that deserve a future day.</p>
          <label className="relative mt-6 block"><Search size={15} className="absolute left-3 top-3.5 text-[#9A9D96]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cities" className="h-11 w-full rounded-[10px] border border-[#DCD4C7] bg-[#F1ECE3] pl-9 pr-3 text-[12px] font-semibold text-[#25343B] outline-none transition placeholder:text-[#AAA9A1] focus:border-[#E56B52] focus:ring-2 focus:ring-[#E56B52]/10" /></label>
          <div className="mt-4 space-y-2">
            {results.length === 0 && <p className="rounded-[10px] border border-dashed border-[#D4CCC0] px-3 py-4 text-[11px] leading-5 text-[#8D928B]">No place in the starter atlas matches that search yet.</p>}
            {results.map((place) => {
              const isSaved = savedPlaces.some((saved) => saved.id === place.id);
              return <div key={place.id} role="button" tabIndex={0} onClick={() => focusPlace(place)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") focusPlace(place); }} className={`flex w-full items-center justify-between rounded-[10px] border px-3 py-3 text-left transition ${selectedId === place.id ? "border-[#E56B52] bg-[#FCEBE6]" : "border-transparent bg-[#F1ECE3] hover:border-[#DCCFC2]"}`}><span className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DCE5D8] text-[#647A69]"><MapPin size={14} /></span><span className="min-w-0"><span className="block truncate text-[12px] font-bold text-[#34434A]">{place.name}, {place.address}</span><span className="mt-1 block truncate text-[10px] text-[#969990]">{place.detail}</span></span></span><button type="button" onClick={(event) => { event.stopPropagation(); savePlace(place); }} aria-label={isSaved ? `${place.name} is pinned` : `Pin ${place.name}`} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${isSaved ? "bg-[#DCE5D8] text-[#647A69]" : "text-[#B2B0A6] hover:bg-[#E8DDD1] hover:text-[#E56B52]"}`}>{isSaved ? <Check size={15} /> : <Star size={14} />}</button></div>;
            })}
          </div>
          <div className="mt-6 border-t border-[#E1D9CC] pt-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94988F]">Pinned places / {savedPlaces.length}</p><div className="mt-2 flex flex-wrap gap-2">{savedPlaces.map((place) => <span key={place.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#E8E1D5] px-2.5 py-1.5 text-[10px] font-bold text-[#5D6B68]">{place.name}<button type="button" onClick={() => removePlace(place)} aria-label={`Remove ${place.name}`} className="text-[#9C9F98] hover:text-[#E56B52]"><X size={12} /></button></span>)}{savedPlaces.length === 0 && <span className="text-[11px] text-[#9A9E97]">Nothing pinned yet.</span>}</div></div>
        </div>
        <div className="relative min-h-[360px] overflow-hidden bg-[#DCE4DF]"><MapView className="h-[430px] w-full" initialCenter={{ lat: 38.7223, lng: -9.1393 }} initialZoom={2} onMapReady={(map) => { mapRef.current = map; setMapReady(true); savedPlaces.forEach(addMarker); }} />{!mapReady && <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#DCE4DF] opacity-95"><div className="absolute inset-0 opacity-45" style={{ backgroundImage: "linear-gradient(rgba(102,125,112,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(102,125,112,0.14) 1px, transparent 1px)", backgroundSize: "44px 44px" }} /><div className="absolute inset-x-10 top-1/2 border-t border-dashed border-[#718B77]/50" /><div className="absolute left-1/4 top-1/3 h-24 w-40 rounded-[50%] border border-[#718B77]/35" /><div className="absolute right-1/4 bottom-1/4 h-32 w-48 rounded-[50%] border border-[#718B77]/30" />{destinations.map((place, index) => <span key={place.id} className={`absolute flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#F9F5EE] bg-[#E56B52] text-[9px] font-bold text-white shadow-md transition ${selectedId === place.id ? "scale-125 ring-4 ring-[#E56B52]/20" : ""}`} style={{ left: `${18 + (index * 17) % 68}%`, top: `${25 + (index * 23) % 48}%` }}>{index + 1}</span>)}</div>}<div className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/70 bg-[#F9F5EE]/90 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#64716B] shadow-sm backdrop-blur"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#E56B52]" /> {mapReady ? "Live atlas" : "Atlas preview"}</div><div className="pointer-events-none absolute bottom-5 right-5 rounded-[10px] bg-[#F9F5EE]/90 px-3 py-2 text-[10px] font-semibold text-[#737A78] shadow-sm backdrop-blur">Select a city to center the map</div></div>
      </div>
      <div className="flex items-center justify-between border-t border-[#D7CFC3] bg-[#EEE8DD] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8F948C]"><span>Destination map / Saved locally</span><span className="flex items-center gap-1.5 text-[#E56B52]"><MapPin size={12} /> {savedPlaces.length} pinned</span></div>
    </section>
  );
}
