# ABYSS / RUN

A little turtle. A very hostile ocean. A dependency-free canvas survival roguelike.

## Play locally

Requires Node.js 20 or newer. No package installation or build step is needed.

```sh
npm start
# Open http://localhost:3000
```

Set `PORT` to use a different port. `npm run dev` restarts the server on changes.

## How to survive

- **WASD / arrow keys:** swim. On touchscreens, drag anywhere in the arena to use the virtual joystick.
- **Space / Dash button:** burst in your movement direction with brief invulnerability. Recharges in 3.5 seconds.
- **Escape / P / pause button:** pause and resume. Changing tabs automatically pauses the dive.
- Harpoons aim and fire automatically at the closest creature.
- Eliminations award XP. Choose one of three evolutions with a click or **1 / 2 / 3**. Combat pauses while choosing.
- Gold shells drift toward you in pickup range. Every 20 shells repairs 8 hull.
- Guardians arrive at 90 and 180 seconds. The final Leviathan arrives at 300 seconds. Defeat it to win; each guardian repairs 35 hull and clears enemy bullets.
- Watch the warning rings. Sharks lock in a dash; jellyfish and bosses release bullet patterns. Dash through danger or move between projectiles.

There are eleven stackable evolutions, three ocean zones, six enemy species, synthesized sound effects, personal records, and randomized builds. Sound is opt-in and can be toggled in the header. Reduced-motion preferences disable decorative animation and screen shake.

## Development

```sh
npm run check
npm test
```

`public/engine.js` owns the simulation, `public/render.js` draws the arena, and `public/app.js` handles input, menus, sound and storage. Regression tests cover combat, progression, bosses, movement, pause, and the HTTP server.

Personal records and audio preference are stored locally in the browser, with a graceful fallback when storage is unavailable. `/api/score` is an optional, in-memory high-score endpoint for the current server process; scores are client-reported and are not a verified leaderboard. It resets when the server restarts. Google Fonts are optional; local font fallbacks keep the game playable offline once assets are loaded.

The legacy `src/` landing-page prototype is retained for reference; the server serves only `public/`.
