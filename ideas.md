# Travel Planner Design Direction

## Three stylistic approaches

### Theme Name: Sunlit Atlas
A warm editorial travel workspace inspired by field journals, ferry tickets, and sun-washed map paper. It feels optimistic and practical, with a tactile planning rhythm rather than a generic dashboard.

**Probability:** 0.07

### Theme Name: Quiet Coordinates
A calm, monochrome planning tool with precise cartographic lines, generous whitespace, and restrained blue-gray accents. It prioritizes focus, clarity, and a sense of considered movement.

**Probability:** 0.03

### Theme Name: Night Route
A dark, cinematic trip-planning cockpit with electric route highlights and subtle glow. It makes planning feel like plotting a route through a living constellation.

**Probability:** 0.05

## Chosen direction: Sunlit Atlas

### Design Movement
Contemporary editorial travel design: the material warmth of a field notebook fused with the information clarity of a modern map interface.

### Core Principles
1. **Plan like a person, not a spreadsheet.** Human moments, place names, and small rituals sit beside dates and logistics.
2. **Warmth with structure.** Cream paper surfaces, ink-like typography, and a disciplined grid make the interface welcoming without losing utility.
3. **Progressive detail.** The home view gives a calm overview; deeper trip details can be added later without overwhelming the first screen.
4. **Useful asymmetry.** A strong left rail and offset content column create a sense of movement and editorial composition.

### Color Philosophy
The base is parchment rather than sterile white, creating the emotional feeling of an open notebook. Ink navy gives text and navigation the authority of printed cartography. The signature color, **canyon coral**, is reserved for actions and route markers so the interface feels sunlit and alive without becoming loud. A muted sage supports status and planning metadata.

### Layout Paradigm
A persistent left navigation rail anchors the product like the spine of a travel journal. The main canvas uses an offset two-column composition: an editorial welcome and route prompt on the left, a live trip snapshot and itinerary preview on the right. Content should breathe with generous margins and occasional edge-to-edge bands rather than defaulting to centered cards.

### Signature Elements
- Thin contour-line patterns and dotted route traces used as quiet background texture.
- Small ticket-stub labels for trip status, duration, and destination metadata.
- A coral route pin / compass mark that acts as the brand’s visual anchor.

### Interaction Philosophy
Interactions should feel like placing a mark on a map: immediate, tactile, and legible. Buttons use concise action language, cards respond with a small lift or ink-darkening, and placeholder actions explain what will arrive next instead of pretending functionality exists.

### Animation
Use short, directional transitions under 240ms. Navigation items should slide a few pixels toward the active state; route markers can fade and rise into view with a small stagger. Avoid decorative looping motion. Respect reduced-motion preferences and keep keyboard actions instant.

### Typography System
Use **DM Serif Display** for expressive destination and section headlines, paired with **Manrope** for navigation, metadata, and body copy. Headlines should use compact line-height and occasional italic emphasis for place names. Body copy stays at a comfortable 15–16px with clear tracking. Labels are uppercase, small, and letter-spaced like printed itinerary stamps.

### Brand Essence
A thoughtful trip-planning workspace for people who want the journey to feel as considered as the destination. **Personality:** observant, optimistic, grounded.

### Brand Voice
Headlines sound like a capable travel companion: specific, warm, and lightly poetic. CTAs are active but never salesy. Microcopy should reduce uncertainty and invite the next useful step.

Example headline: “Make room for the good detours.”

Example CTA: “Sketch a new route.”

### Wordmark & Logo
The mark is a simple coral compass rose built from four tapered route strokes, with one slightly offset point to suggest a planned detour. The wordmark should use a custom lockup with a serif “Atlas” feel and compact sans-serif supporting text; never rely on the browser default wordmark.

### Signature Brand Color
**Canyon coral — `#E56B52`**. It suggests sunlit wayfinding, human energy, and the small confidence boost of knowing where to go next.

## Implementation reminders

- Add this design philosophy as a short comment at the top of every CSS, component, and page file edited for the starter experience.
- Keep the first release frontend-only and explicitly label future features as placeholders.
- Keep the route data in a small typed local model so it can later be replaced by a backend without reshaping the UI.
- Do not add large local media files to the project. Use uploaded or remote assets only.

## Style Decisions

- Every major section now carries a cartographic or field-journal cue: dotted route traces, contour-like texture, ticket-stub labels, stamped metadata, or paper-panel treatment.
- Utility surfaces should feel like travel documents and map workspace panels rather than generic SaaS chrome.
- The coral compass mark recurs in brand lockup, action buttons, route markers, and key wayfinding moments; canyon coral remains reserved for meaningful movement.
