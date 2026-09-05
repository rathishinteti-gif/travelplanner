/*
 * Travel planner design philosophy: map discovery feels like unfolding a paper atlas, with coral
 * route marks, visual place cards, and a clear distinction between searching and saving.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Compass, LoaderCircle, MapPin, Search, Star, X } from "lucide-react";
import { toast } from "sonner";
import { MapView } from "@/components/Map";
import { PLACES_STORAGE_KEY, readStorage, writeStorage, type SavedPlace } from "@/lib/travel";

type MapExplorerProps = { onPlacesChange?: (places: SavedPlace[]) => void };
type PlaceCard = SavedPlace & { detail: string };

const starterDestinations: PlaceCard[] = [
  { id: "lisbon", name: "Lisbon", address: "Portugal", lat: 38.7223, lng: -9.1393, category: "Historic city", detail: "Light, tiled streets, long lunches", photoUrl: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=320&q=80" },
  { id: "kyoto", name: "Kyoto", address: "Japan", lat: 35.0116, lng: 135.7681, category: "Cultural city", detail: "Quiet lanes, old wood, maple shade", photoUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=320&q=80" },
  { id: "marrakech", name: "Marrakech", address: "Morocco", lat: 31.6295, lng: -7.9811, category: "Market city", detail: "Courtyards, spice markets, warm evenings", photoUrl: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=320&q=80" },
  { id: "reykjavik", name: "Reykjavik", address: "Iceland", lat: 64.1466, lng: -21.9426, category: "Coastal city", detail: "Long light, sea air, open roads", photoUrl: "https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=320&q=80" },
];

const categoryLabel = (types: string[] = []) => {
  const labels: Record<string, string> = { locality: "City", political: "Region", country: "Country", tourist_attraction: "Landmark", establishment: "Place", neighborhood: "Neighborhood" };
  return types.find((type) => labels[type]) ? labels[types.find((type) => labels[type]) as string] : "Destination";
};

export function MapExplorer({ onPlacesChange }: MapExplorerProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const markersRef = useRef<Record<string, google.maps.marker.AdvancedMarkerElement>>({});
  const [query, setQuery] = useState("");
  const [liveSuggestions, setLiveSuggestions] = useState<PlaceCard[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>(() => readStorage(PLACES_STORAGE_KEY, []));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [searchReady, setSearchReady] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [reverseLabel, setReverseLabel] = useState("");
  const [livePlace, setLivePlace] = useState<SavedPlace | null>(null);

  const visiblePlaces = useMemo(() => query.trim().length >= 2 ? liveSuggestions : starterDestinations, [liveSuggestions, query]);

  const focusPlace = (place: SavedPlace) => {
    setSelectedId(place.id);
    mapRef.current?.panTo({ lat: place.lat, lng: place.lng });
    mapRef.current?.setZoom(10);
  };

  const addMarker = (place: SavedPlace) => {
    if (!mapRef.current || !window.google?.maps?.marker || markersRef.current[place.id]) return;
    markersRef.current[place.id] = new window.google.maps.marker.AdvancedMarkerElement({ map: mapRef.current, position: { lat: place.lat, lng: place.lng }, title: place.name });
  };

  const reverseGeocode = (lat: number, lng: number) => {
    if (!window.google?.maps) return;
    new window.google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => { if (status === "OK" && results?.[0]) setReverseLabel(results[0].formatted_address); });
  };

  const savePlace = (place: SavedPlace) => {
    if (savedPlaces.some((saved) => saved.id === place.id)) { focusPlace(place); return; }
    const next = [...savedPlaces, place];
    setSavedPlaces(next); writeStorage(PLACES_STORAGE_KEY, next); onPlacesChange?.(next); addMarker(place); focusPlace(place);
    toast(`${place.name} pinned to your planner`, { description: "Saved locally for your next route." });
  };

  const removePlace = (place: SavedPlace) => {
    const next = savedPlaces.filter((saved) => saved.id !== place.id);
    setSavedPlaces(next); writeStorage(PLACES_STORAGE_KEY, next); onPlacesChange?.(next);
    if (markersRef.current[place.id]) markersRef.current[place.id].map = null;
    delete markersRef.current[place.id]; if (selectedId === place.id) setSelectedId(null);
  };

  useEffect(() => {
    if (!mapReady || !window.google?.maps?.places || !mapRef.current) return;
    autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    placesServiceRef.current = new window.google.maps.places.PlacesService(mapRef.current);
    setSearchReady(true);
  }, [mapReady]);

  useEffect(() => {
    const input = query.trim();
    if (input.length < 2 || !autocompleteServiceRef.current || !placesServiceRef.current) { setLiveSuggestions([]); return; }
    let alive = true;
    const timer = window.setTimeout(() => {
      setLoadingSuggestions(true);
      autocompleteServiceRef.current?.getPlacePredictions({ input, types: ["(cities)"] }, (predictions, status) => {
        if (!alive) return;
        if (status !== "OK" || !predictions?.length) { setLiveSuggestions([]); setLoadingSuggestions(false); return; }
        let remaining = Math.min(predictions.length, 5);
        const details: PlaceCard[] = [];
        predictions.slice(0, 5).forEach((prediction) => {
          placesServiceRef.current?.getDetails({ placeId: prediction.place_id, fields: ["place_id", "name", "formatted_address", "geometry", "types", "photos"] }, (place, detailStatus) => {
            if (detailStatus === "OK" && place?.geometry?.location) {
              details.push({ id: place.place_id ?? prediction.place_id, providerId: place.place_id, name: place.name ?? prediction.structured_formatting.main_text, address: place.formatted_address ?? prediction.description, lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), category: categoryLabel(place.types), detail: prediction.description, photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 320, maxHeight: 180 }) });
            }
            remaining -= 1;
            if (remaining === 0 && alive) { setLiveSuggestions(details); setLoadingSuggestions(false); }
          });
        });
      });
    }, 260);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [query]);

  useEffect(() => { if (mapReady) savedPlaces.forEach(addMarker); }, [mapReady, savedPlaces]);

  return <section className="relative overflow-hidden rounded-[20px] border border-[#DCD4C7] bg-[#E5E0D5] shadow-[0_14px_36px_rgba(48,55,53,0.08)]"><div className="grid lg:grid-cols-[0.38fr_0.62fr]">
    <div className="relative z-10 border-b border-[#D4CCC0] bg-[#F9F5EE] p-5 lg:border-b-0 lg:border-r lg:p-6"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#E56B52]"><Compass size={14} /> Field notes</p><h3 className="mt-3 font-display text-[30px] leading-[0.98] tracking-[-0.03em] text-[#26343B]">Keep a few places<br /><em>within reach.</em></h3><p className="mt-4 text-[12px] leading-5 text-[#7E837E]">Search live cities and addresses, then pin the places that deserve a future day.</p>
      <label className="relative mt-6 block"><Search size={15} className="absolute left-3 top-3.5 text-[#9A9D96]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cities or addresses" className="h-11 w-full rounded-[10px] border border-[#DCD4C7] bg-[#F1ECE3] pl-9 pr-3 text-[12px] font-semibold text-[#25343B] outline-none transition placeholder:text-[#AAA9A1] focus:border-[#E56B52] focus:ring-2 focus:ring-[#E56B52]/10" /></label>
      <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-[#969990]"><span className={`h-1.5 w-1.5 rounded-full ${searchReady ? "bg-[#718B77]" : "bg-[#E5A353]"}`} /> {searchReady ? "Live Places search ready" : mapReady ? "Loading Places search" : "Open the map to search"}</p>
      <div className="mt-4 space-y-2">{loadingSuggestions && <div className="flex items-center gap-2 rounded-[10px] bg-[#F1ECE3] px-3 py-4 text-[11px] font-semibold text-[#8D928B]"><LoaderCircle size={14} className="animate-spin text-[#E56B52]" /> Finding places with photos…</div>}{!loadingSuggestions && visiblePlaces.length === 0 && <p className="rounded-[10px] border border-dashed border-[#D4CCC0] px-3 py-4 text-[11px] leading-5 text-[#8D928B]">No live place cards match that search yet.</p>}{!loadingSuggestions && visiblePlaces.map((place) => { const isSaved = savedPlaces.some((saved) => saved.id === place.id); return <div key={place.id} role="button" tabIndex={0} onClick={() => focusPlace(place)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") focusPlace(place); }} className={`flex w-full gap-3 rounded-[10px] border p-2 text-left transition ${selectedId === place.id ? "border-[#E56B52] bg-[#FCEBE6]" : "border-transparent bg-[#F1ECE3] hover:border-[#DCCFC2]"}`}><div className="h-12 w-16 shrink-0 overflow-hidden rounded-[7px] bg-[#DCE4DF]">{place.photoUrl ? <img src={place.photoUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#718B77]"><MapPin size={15} /></div>}</div><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-bold text-[#34434A]">{place.name}</span><span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-[0.1em] text-[#E56B52]">{place.category || "Destination"}</span><span className="mt-1 block truncate text-[10px] text-[#969990]">{place.address || place.detail}</span></span><button type="button" onClick={(event) => { event.stopPropagation(); savePlace(place); }} aria-label={isSaved ? `${place.name} is pinned` : `Pin ${place.name}`} className={`flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full transition ${isSaved ? "bg-[#DCE5D8] text-[#647A69]" : "text-[#B2B0A6] hover:bg-[#E8DDD1] hover:text-[#E56B52]"}`}>{isSaved ? <Check size={15} /> : <Star size={14} />}</button></div>; })}</div>
      {livePlace && <div className="mt-4 rounded-[10px] border border-[#E5B9AD] bg-[#FCEBE6] p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#B75A47]">Dropped pin</p><p className="mt-1 text-[12px] font-bold text-[#34434A]">{livePlace.name}</p><p className="mt-1 text-[10px] leading-4 text-[#8C817B]">{reverseLabel || livePlace.address || "Reverse geocoding…"}</p></div><button type="button" onClick={() => savePlace({ ...livePlace, address: reverseLabel || livePlace.address, category: "Dropped pin" })} className="rounded-full bg-[#E56B52] px-3 py-2 text-[10px] font-bold text-white">Pin</button></div></div>}
      <div className="mt-6 border-t border-[#E1D9CC] pt-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94988F]">Pinned places / {savedPlaces.length}</p><div className="mt-2 flex flex-wrap gap-2">{savedPlaces.map((place) => <span key={place.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#E8E1D5] px-2.5 py-1.5 text-[10px] font-bold text-[#5D6B68]">{place.name}<button type="button" onClick={() => removePlace(place)} aria-label={`Remove ${place.name}`} className="text-[#9C9F98] hover:text-[#E56B52]"><X size={12} /></button></span>)}{savedPlaces.length === 0 && <span className="text-[11px] text-[#9A9E97]">Nothing pinned yet.</span>}</div></div>
    </div>
    <div className="relative min-h-[360px] overflow-hidden bg-[#DCE4DF]"><MapView className="h-[430px] w-full" initialCenter={{ lat: 38.7223, lng: -9.1393 }} initialZoom={2} onMapReady={(map) => { mapRef.current = map; setMapReady(true); savedPlaces.forEach(addMarker); map.addListener("click", (event: google.maps.MapMouseEvent) => { if (!event.latLng) return; const lat = event.latLng.lat(); const lng = event.latLng.lng(); setLivePlace({ id: `${lat}-${lng}`, name: "Dropped pin", lat, lng }); setReverseLabel(""); reverseGeocode(lat, lng); }); }} />{!mapReady && <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#DCE4DF] opacity-95"><div className="absolute inset-0 opacity-45" style={{ backgroundImage: "linear-gradient(rgba(102,125,112,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(102,125,112,0.14) 1px, transparent 1px)", backgroundSize: "44px 44px" }} /><LoaderCircle className="absolute left-1/2 top-1/2 -ml-3 -mt-3 animate-spin text-[#718B77]" size={24} /></div>}<div className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/70 bg-[#F9F5EE]/90 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#64716B] shadow-sm backdrop-blur"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#E56B52]" /> {mapReady ? "Live atlas" : "Loading map"}</div><div className="pointer-events-none absolute bottom-5 right-5 rounded-[10px] bg-[#F9F5EE]/90 px-3 py-2 text-[10px] font-semibold text-[#737A78] shadow-sm backdrop-blur">Click the map to reverse geocode a pin</div></div>
  </div><div className="flex items-center justify-between border-t border-[#D7CFC3] bg-[#EEE8DD] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8F948C]"><span>Places API / Saved locally</span><span className="flex items-center gap-1.5 text-[#E56B52]"><MapPin size={12} /> {savedPlaces.length} pinned</span></div></section>;
}
