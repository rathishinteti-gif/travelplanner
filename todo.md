# Travel Planner Full-Stack Update Checklist

- [x] Upgrade the static project to full-stack auth and database support.
- [x] Add a secure sign-in/sign-up entry using the built-in OAuth session flow.
- [x] Protect planner access and expose the current signed-in user state.
- [x] Add destination discovery for landmarks, hotels, restaurants, and dining.
- [x] Generate a day-by-day plan that balances visits and meals.
- [x] Persist trips and generated itinerary data for signed-in users.
- [x] Run schema, server, type, build, and browser validation.
- [ ] Save a project checkpoint and synchronize the GitHub main branch.
- [x] Add separate sign-in and create-account entry actions that reuse the documented nonce-bound OAuth flow.
- [x] Reconcile newly created trips with their server IDs after successful persistence.
- [x] Add mutation error handling and cache refresh so local and server trip state cannot silently diverge.
