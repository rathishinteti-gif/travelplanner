/*
 * Travel planner design philosophy: editorial travel planning that feels like a field journal,
 * balancing human warmth with clear route structure and a coral wayfinding accent.
 */
import { useEffect, useState } from "react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Compass,
  Ellipsis,
  FolderOpen,
  Globe2,
  Heart,
  LayoutGrid,
  Map,
  MapPin,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Ticket,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AutoPlannerDialog } from "@/components/AutoPlannerDialog";
import { ItineraryBuilder } from "@/components/ItineraryBuilder";
import { MapExplorer } from "@/components/MapExplorer";
import { TripCreateDialog } from "@/components/TripCreateDialog";
import { formatShortDate, parsePersistedTrip, readSharedTrip, readStorage, tripDays, TRIPS_STORAGE_KEY, writeStorage, type Trip } from "@/lib/travel";
import { trpc } from "@/lib/trpc";

const HERO_IMAGE = "/manus-storage/travelplanner-hero_c5784f74.jpg";
const LOGO_IMAGE = "/manus-storage/travelplanner-logo_03977460.png";
const LISBON_IMAGE = "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=900&q=85";
const KYOTO_IMAGE = "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=85";

type NavItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
};

const navigation: NavItem[] = [
  { label: "Overview", icon: LayoutGrid, active: true },
  { label: "My trips", icon: FolderOpen },
  { label: "Explore", icon: Compass },
  { label: "Saved places", icon: Heart },
];

const demoTrips = [
  {
    city: "Lisbon, Portugal",
    dates: "12–18 May 2025",
    days: "6 days",
    status: "Planning",
    image: LISBON_IMAGE,
    accent: "coral",
    progress: "68% planned",
    description: "Light, tiled streets, long lunches.",
    tripId: undefined,
  },
  {
    city: "Kyoto, Japan",
    dates: "03–11 October 2025",
    days: "8 days",
    status: "Idea",
    image: KYOTO_IMAGE,
    accent: "sage",
    progress: "3 places saved",
    description: "Quiet lanes and old wood.",
    tripId: undefined,
  },
];

function notifyComingSoon(label: string) {
  toast(`${label} is ready for the next build.`, {
    description: "This starter keeps the structure in place while the feature is wired up.",
  });
}

function AuthGate({ error }: { error: unknown }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#F6F2EA] px-5 py-12 text-[#1F2A35]"><section className="w-full max-w-[460px] rounded-[28px] border border-[#DDD5C8] bg-[#FBF8F2] p-8 shadow-[0_24px_70px_rgba(48,55,53,0.12)] sm:p-10"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-[#E56B52] text-white"><Compass size={20} /></span><div><p className="font-display text-[22px] leading-none">Routebook</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C928B]">Private travel planning</p></div></div><p className="mt-12 text-[10px] font-bold uppercase tracking-[0.2em] text-[#E56B52]">Your routes, kept together</p><h1 className="mt-3 font-display text-[44px] leading-[0.96] tracking-[-0.04em] text-[#26343B]">Plan with a little<br /><em>more certainty.</em></h1><p className="mt-5 text-[14px] leading-6 text-[#747B76]">Sign in to save trips, generate day-by-day recommendations, and keep your places and plans ready wherever you go.</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => startLogin()} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#E56B52] px-4 text-[13px] font-bold text-white shadow-[0_10px_24px_rgba(229,107,82,0.24)] transition hover:-translate-y-0.5 hover:bg-[#D95D45] active:scale-[0.98]">Sign in <ArrowUpRight size={16} /></button><button type="button" onClick={() => startLogin()} className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#E2B8AC] bg-[#FCEBE6] px-4 text-[13px] font-bold text-[#B75A47] transition hover:bg-[#F8DDD5] active:scale-[0.98]">Create account <Plus size={16} /></button></div><p className="mt-4 text-center text-[10px] leading-4 text-[#969B94]">Your account is protected by the hosted OAuth flow. Sign in and account creation both return to your private planner.</p>{Boolean(error) && <p className="mt-4 rounded-[10px] bg-[#FCEBE6] px-3 py-2 text-[11px] font-semibold text-[#B75A47]">We couldn’t confirm your session yet. Please try again.</p>}</section></main>;
}

export default function Home() {
  // The useAuth hook provides authentication state.
  // To implement login/logout, call logout(), or start login from an event
  // handler: onClick={() => startLogin()} (imported from "@/const"). Never call
  // startLogin() during render (no href={startLogin()}) — it mints a one-time
  // nonce cookie and must run only at the moment of navigation.
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const [activeNav, setActiveNav] = useState("Overview");
  const [tripDialogOpen, setTripDialogOpen] = useState(false);
  const [autoPlannerOpen, setAutoPlannerOpen] = useState(false);
  const [savedTrips, setSavedTrips] = useState<Trip[]>(() => readStorage(TRIPS_STORAGE_KEY, []));
  const [activeTripId, setActiveTripId] = useState<string | null>(() => readStorage<Trip[]>(TRIPS_STORAGE_KEY, [])[0]?.id ?? null);
  const persistedTripsQuery = trpc.trips.list.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const createTripMutation = trpc.trips.create.useMutation();
  const updateTripMutation = trpc.trips.update.useMutation();
  const trpcUtils = trpc.useUtils();

  useEffect(() => {
    if (savedTrips.length > 0 && !savedTrips.some((trip) => trip.id === activeTripId)) setActiveTripId(savedTrips[0].id);
  }, [activeTripId, savedTrips]);

  useEffect(() => {
    if (!persistedTripsQuery.data) return;
    const remoteTrips = persistedTripsQuery.data.map(parsePersistedTrip);
    if (remoteTrips.length > 0) {
      setSavedTrips(remoteTrips);
      setActiveTripId((current) => current && remoteTrips.some((trip) => trip.id === current) ? current : remoteTrips[0].id);
      writeStorage(TRIPS_STORAGE_KEY, remoteTrips);
    }
  }, [persistedTripsQuery.data]);

  useEffect(() => {
    const sharedTrip = readSharedTrip(window.location.hash);
    if (!sharedTrip) return;
    setSavedTrips((current) => current.some((trip) => trip.id === sharedTrip.id) ? current : [sharedTrip, ...current]);
    setActiveTripId(sharedTrip.id);
    writeStorage(TRIPS_STORAGE_KEY, [sharedTrip, ...savedTrips.filter((trip) => trip.id !== sharedTrip.id)]);
    toast("Shared itinerary loaded", { description: `${sharedTrip.destination} is ready to explore.` });
  }, []);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#F6F2EA]"><div className="text-center"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#E56B52] border-t-transparent" /><p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#92958D]">Opening your routebook</p></div></main>;
  if (!isAuthenticated) return <AuthGate error={error} />;

  const activeTrip = savedTrips.find((trip) => trip.id === activeTripId) ?? null;
  const trips = savedTrips.length > 0 ? savedTrips.map((trip) => ({
    city: trip.destination,
    dates: `${formatShortDate(trip.startDate)} – ${formatShortDate(trip.endDate)}`,
    days: `${tripDays(trip.startDate, trip.endDate)} days`,
    status: trip.status === "planning" ? "Planning" : trip.status === "ready" ? "Ready" : "Idea",
    image: trip.coverImage || (trip.destination.toLowerCase().includes("kyoto") ? KYOTO_IMAGE : LISBON_IMAGE),
    accent: trip.status === "planning" ? "coral" : "sage",
    progress: `${trip.itinerary.reduce((sum, day) => sum + day.activities.length, 0)} activities`,
    description: trip.description || "A new route taking shape.",
    tripId: trip.id,
  })) : demoTrips;

  return (
    <div className="min-h-screen bg-[#F6F2EA] text-[#1F2A35]">
      <div className="atlas-paper mx-auto flex min-h-screen max-w-[1580px]">
        <aside className="hidden w-[246px] shrink-0 flex-col border-r border-[#DED8CE] bg-[#F1ECE2] px-6 py-7 lg:flex">
          <div className="flex items-center gap-3">
            <span className="hidden text-[9px] font-bold uppercase tracking-[0.18em] text-[#E56B52] sm:block">Est. / 2025</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#E56B52] p-2 shadow-[0_8px_20px_rgba(229,107,82,0.2)]">
              <img src={LOGO_IMAGE} alt="Travel planner compass mark" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="font-display text-[18px] leading-none text-[#1F2A35]">Routebook</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7D817D]">Travel planner</p>
            </div>
          </div>

          <div className="mt-14">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#92958D]">Workspace</p>
            <nav className="space-y-1" aria-label="Primary navigation">
              {navigation.map((item) => {
                const Icon = item.icon;
                const selected = activeNav === item.label;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setActiveNav(item.label);
                      if (item.label !== "Overview") notifyComingSoon(item.label);
                    }}
                    className={`group flex w-full items-center justify-between rounded-[10px] px-3 py-3 text-left text-[13px] font-semibold transition-all duration-200 active:scale-[0.98] ${
                      selected
                        ? "bg-[#E5DDD0] text-[#1F2A35] shadow-[inset_3px_0_0_#E56B52]"
                        : "text-[#737A78] hover:bg-[#E8E1D5] hover:text-[#1F2A35]"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={17} strokeWidth={selected ? 2.2 : 1.8} />
                      {item.label}
                    </span>
                    {selected && <ChevronRight size={14} className="text-[#E56B52]" />}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto">
            <div className="rounded-[16px] border border-[#DED7CA] bg-[#F9F5EE] p-4">
              <div className="mb-3 flex items-start justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DCE3D8] text-[#5A6B5D]"><Sparkles size={15} /></span>
                <span className="rounded-full bg-[#EAE4D8] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#7B817B]">Beta</span>
              </div>
              <p className="font-display text-[18px] leading-tight text-[#26333A]">Good plans leave room for detours.</p>
              <p className="mt-2 text-[11px] leading-relaxed text-[#7F817C]">Keep the essentials close. Let the rest unfold.</p>
            </div>
            <button type="button" onClick={() => notifyComingSoon("Settings")} className="mt-5 flex w-full items-center gap-3 px-3 py-2 text-[13px] font-semibold text-[#737A78] transition hover:text-[#1F2A35]"><Settings2 size={16} /> Settings</button>
            <button type="button" onClick={() => notifyComingSoon("Your profile")} className="mt-2 flex w-full items-center gap-3 border-t border-[#DED8CE] px-3 pt-4 text-[13px] font-semibold text-[#737A78] transition hover:text-[#1F2A35]"><UserRound size={16} /> Your profile</button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-[#E2DCD2] px-5 py-5 sm:px-8 lg:px-12">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#E56B52] p-2"><img src={LOGO_IMAGE} alt="" className="h-full w-full object-contain" /></div>
              <span className="font-display text-[18px]">Routebook</span>
            </div>
            <div className="relative hidden max-w-[340px] flex-1 md:block">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A9B94]" />
              <input aria-label="Search trips" placeholder="Search your trips" className="h-10 w-full rounded-full border border-[#DFD9CF] bg-[#F9F6F0] pl-10 pr-4 text-[13px] text-[#1F2A35] outline-none transition placeholder:text-[#AAA9A1] focus:border-[#E56B52] focus:ring-2 focus:ring-[#E56B52]/10" />
            </div>
            <div className="ml-auto flex items-center gap-4">
              <button type="button" onClick={() => notifyComingSoon("Notifications")} aria-label="Notifications" className="relative text-[#7A807D] transition hover:text-[#E56B52]"><Ticket size={18} /><span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#E56B52]" /></button>
              <div className="flex items-center gap-2 border-l border-[#DFD9CF] pl-4"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D6E0D4] text-[11px] font-bold text-[#55665A]">{(user?.name || user?.email || "TR").slice(0, 2).toUpperCase()}</div><span className="hidden max-w-[120px] truncate text-[12px] font-semibold text-[#65706D] sm:block">{user?.name || user?.email || "My trips"}</span><button type="button" onClick={() => void logout()} className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A9E97] transition hover:text-[#E56B52]">Sign out</button></div>
            </div>
          </header>

          <div className="px-5 pb-14 pt-8 sm:px-8 lg:px-12 lg:pt-11">
            <section className="grid gap-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(400px,1.05fr)] xl:items-end">
              <div className="max-w-[580px] pb-3">
                <p className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#E56B52]"><span className="h-px w-7 bg-[#E56B52]" />Tuesday, 08 April</p>
                <h1 className="font-display text-[clamp(48px,5.7vw,78px)] leading-[0.9] tracking-[-0.045em] text-[#22303A]">Plan the days<br /><em className="font-display text-[#E56B52]">you’ll remember.</em></h1>
                <p className="mt-7 max-w-[410px] text-[15px] leading-7 text-[#737976]">Keep the essentials close, shape each day with intention, and leave a little room for the unexpected.</p>
                <button type="button" onClick={() => setTripDialogOpen(true)} className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#E56B52] px-5 py-3.5 text-[13px] font-bold text-white shadow-[0_9px_22px_rgba(229,107,82,0.24)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#D95D45] active:scale-[0.97]"><Plus size={17} /> Sketch a new route</button>
              </div>
              <div className="relative overflow-hidden rounded-[24px] bg-[#263C45] shadow-[0_18px_40px_rgba(48,55,53,0.13)]">
                <img src={HERO_IMAGE} alt="Sunlit coastal road beside the sea" className="h-[290px] w-full object-cover opacity-90 sm:h-[330px]" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#172A31]/65 via-[#172A31]/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 text-white sm:p-7">
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/65">A little inspiration</p><p className="mt-2 font-display text-[27px] leading-none">The scenic way is<br /><em>usually worth it.</em></p></div>
                  <button type="button" onClick={() => notifyComingSoon("Explore inspiration")} aria-label="Explore inspiration" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white/10 backdrop-blur transition hover:bg-white/20"><ArrowUpRight size={18} /></button>
                </div>
              </div>
            </section>

            <section className="mt-16">
              <div className="mb-5 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#92958D]">Your routes</p><h2 className="mt-2 font-display text-[31px] tracking-[-0.03em] text-[#26343B]">Trips in motion</h2></div><button type="button" onClick={() => notifyComingSoon("All trips")} className="flex items-center gap-1 text-[12px] font-bold text-[#E56B52] transition hover:gap-2">See all <ChevronRight size={14} /></button></div>
              <div className="grid gap-5 lg:grid-cols-2">
                {trips.map((trip) => (
                  <article key={trip.tripId ?? trip.city} onClick={() => trip.tripId && setActiveTripId(trip.tripId)} className="group relative overflow-hidden rounded-[18px] border border-[#E2DCD2] bg-[#FBF8F2] transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(48,55,53,0.08)]">
                    <div className="relative flex gap-4 p-4"><span className="absolute left-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-[#E56B52] text-white shadow-sm"><Compass size={12} /></span><img src={trip.image} alt={trip.city} className="h-[118px] w-[124px] shrink-0 rounded-[12px] object-cover" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${trip.accent === "coral" ? "bg-[#F7DDD4] text-[#BB5D49]" : "bg-[#DCE5D8] text-[#627663]"}`}>{trip.status}</span><button type="button" onClick={() => notifyComingSoon(`${trip.city} options`)} aria-label={`Options for ${trip.city}`} className="text-[#A6A59E] transition hover:text-[#26343B]"><Ellipsis size={17} /></button></div><h3 className="mt-3 truncate font-display text-[21px] text-[#2A3840]">{trip.city}</h3><p className="mt-1 text-[11px] font-semibold text-[#8A8E89]">{trip.dates}</p><p className="mt-2 line-clamp-1 text-[11px] text-[#969990]">{trip.description}</p><div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#A0A29A]"><CalendarDays size={13} /> {trip.days}<span className="h-1 w-1 rounded-full bg-[#CBC6BC]" /> {trip.progress}</div></div></div>
                    <div className="flex items-center justify-between border-t border-[#EDE7DD] px-4 py-3"><div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-[#8D928B]"><MapPin size={13} className="text-[#E56B52]" /> Route ready</div><button type="button" onClick={() => notifyComingSoon(`${trip.city} itinerary`)} className="text-[11px] font-bold text-[#26343B] transition group-hover:text-[#E56B52]">Open itinerary <ArrowUpRight size={13} className="ml-1 inline" /></button></div>
                  </article>
                ))}
                <button type="button" onClick={() => setTripDialogOpen(true)} className="flex min-h-[176px] flex-col items-center justify-center rounded-[18px] border border-dashed border-[#D4CEC2] bg-[#F5F0E8] text-center transition duration-200 hover:border-[#E56B52] hover:bg-[#F8EEE7] active:scale-[0.99]"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E1B9AD] text-[#E56B52]"><Plus size={18} /></span><span className="mt-3 text-[13px] font-bold text-[#5E6866]">Add another trip</span><span className="mt-1 text-[11px] text-[#999C95]">Start with a place or a feeling</span></button>
              </div>
            </section>

            <section className="mt-16 border-t border-[#E2DCD2] pt-8">
              <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#92958D]"><Globe2 size={14} className="text-[#E56B52]" /> From the atlas</p><h2 className="mt-2 font-display text-[31px] tracking-[-0.03em] text-[#26343B]">Places worth keeping close</h2></div><p className="max-w-[250px] text-right text-[12px] leading-5 text-[#92958D]">A few starting points for the days that do not have a plan yet.</p></div>
              <div className="route-line mt-6 grid gap-4 sm:grid-cols-2">
                {[{ city: "Lisbon", detail: "Light, tiled streets, long lunches", image: LISBON_IMAGE }, { city: "Kyoto", detail: "Quiet lanes, old wood, maple shade", image: KYOTO_IMAGE }].map((place) => <button type="button" key={place.city} onClick={() => notifyComingSoon(`${place.city} guide`)} className="group relative h-[190px] overflow-hidden rounded-[16px] text-left"><img src={place.image} alt={place.city} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#17252C]/75 via-[#17252C]/15 to-transparent" /><div className="absolute bottom-5 left-5 text-white"><p className="font-display text-[27px] leading-none">{place.city}</p><p className="mt-2 text-[11px] font-semibold text-white/75">{place.detail}</p></div><span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/35 bg-white/10 text-white backdrop-blur transition group-hover:bg-white/20"><ArrowUpRight size={15} /></span></button>)}
              </div>
            </section>

            <section className="mt-16 border-t border-[#E2DCD2] pt-8">
              <div className="mb-6"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#92958D]"><MapPin size={14} className="text-[#E56B52]" /> Draw the wider route</p><h2 className="mt-2 font-display text-[31px] tracking-[-0.03em] text-[#26343B]">Pin the places that call you.</h2></div>
              <MapExplorer />
            </section>

            <section className="mt-16 border-t border-[#E2DCD2] pt-8">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#92958D]"><CalendarDays size={14} className="text-[#E56B52]" /> Daily rhythm</p><h2 className="mt-2 font-display text-[31px] tracking-[-0.03em] text-[#26343B]">The route, in your handwriting.</h2></div>{activeTrip && <button type="button" onClick={() => setAutoPlannerOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#E2B8AC] bg-[#FCEBE6] px-4 text-[11px] font-bold text-[#B75A47] transition hover:bg-[#F8DDD5]"><Sparkles size={14} /> Auto-plan this trip</button>}</div>
              <ItineraryBuilder trip={activeTrip} onTripChange={(nextTrip) => { const next = savedTrips.map((trip) => trip.id === nextTrip.id ? nextTrip : trip); setSavedTrips(next); writeStorage(TRIPS_STORAGE_KEY, next); const id = Number(nextTrip.id); if (Number.isInteger(id) && id > 0) void updateTripMutation.mutateAsync({ id, destination: nextTrip.destination, startDate: nextTrip.startDate, endDate: nextTrip.endDate, description: nextTrip.description ?? null, coverImage: nextTrip.coverImage ?? null, itinerary: JSON.stringify(nextTrip.itinerary) }).then(() => trpcUtils.trips.list.invalidate()).catch(() => toast("Couldn’t save this edit", { description: "Your local copy is still available." })); }} />
            </section>

            <footer className="mt-14 flex flex-col gap-3 border-t border-[#E2DCD2] pt-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A0A29A] sm:flex-row sm:items-center sm:justify-between"><p>Routebook / A calmer way to go</p><p className="flex items-center gap-2"><Map size={13} /> Frontend starter workspace <span className="text-[#E56B52]">●</span></p></footer>
          </div>
        </main>
        <TripCreateDialog open={tripDialogOpen} onOpenChange={setTripDialogOpen} onCreated={(trip) => { const next = [trip, ...savedTrips]; setSavedTrips(next); setActiveTripId(trip.id); writeStorage(TRIPS_STORAGE_KEY, next); void createTripMutation.mutateAsync({ destination: trip.destination, startDate: trip.startDate, endDate: trip.endDate, description: trip.description ?? null, coverImage: trip.coverImage ?? null, itinerary: JSON.stringify(trip.itinerary) }).then((created) => { const persisted = { ...trip, id: String(created.id) }; setSavedTrips((current) => [persisted, ...current.filter((item) => item.id !== trip.id)]); setActiveTripId(persisted.id); writeStorage(TRIPS_STORAGE_KEY, [persisted, ...savedTrips.filter((item) => item.id !== trip.id)]); return trpcUtils.trips.list.invalidate(); }).catch(() => toast("Trip saved locally", { description: "Sign-in storage is temporarily unavailable; we’ll retry on the next save." })); }} />
        {activeTrip && <AutoPlannerDialog open={autoPlannerOpen} onOpenChange={setAutoPlannerOpen} trip={activeTrip} onPlan={(plannedTrip) => { const next = savedTrips.map((trip) => trip.id === plannedTrip.id ? plannedTrip : trip); setSavedTrips(next); writeStorage(TRIPS_STORAGE_KEY, next); const id = Number(plannedTrip.id); if (Number.isInteger(id) && id > 0) void updateTripMutation.mutateAsync({ id, destination: plannedTrip.destination, startDate: plannedTrip.startDate, endDate: plannedTrip.endDate, description: plannedTrip.description ?? null, coverImage: plannedTrip.coverImage ?? null, itinerary: JSON.stringify(plannedTrip.itinerary) }).then(() => trpcUtils.trips.list.invalidate()).catch(() => toast("Couldn’t save the generated plan", { description: "Your local generated itinerary is still available." })); }} />}
      </div>
    </div>
  );
}
