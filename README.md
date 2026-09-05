# Routebook / Travel Planner

Routebook is a React + TypeScript starter web app for planning trips with a calmer, more editorial feel. The first release is a frontend-only workspace with a trip overview, route cards, destination inspiration, and clearly labeled placeholder actions for features that will be wired up later.

## Stack

The project uses React 19, TypeScript, Vite, Tailwind CSS 4, Wouter, Lucide icons, and the shadcn/ui component set included by the Manus web-static template.

## Project structure

```text
client/
  public/       Small public configuration files only
  src/
    components/ Shared UI and template primitives
    contexts/   Theme and app contexts
    hooks/      Reusable hooks
    lib/        Utility helpers
    pages/      Route-level pages
    App.tsx     App shell and routes
    index.css   Global design tokens and styles
server/         Static-template compatibility server
shared/         Shared constants
ideas.md        Design direction and brand decisions
```

## Local development

```bash
pnpm install
pnpm dev
```

To validate the starter app and create a production build:

```bash
pnpm check
pnpm build
```

## Current scope

The current screen is intentionally local-data driven so the UI vocabulary can settle before a backend is introduced. The next product milestones are trip creation, itinerary editing, saved places, map search, and persistence.
