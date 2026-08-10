# Cobra Clash — development notes

## Product decisions

- **Name:** “Cobra Clash” gives the prototype a playful identity while keeping `snake-fps` as the repository name.
- **Tone:** every weapon is a foam-dart blaster. Hits use bright sparks, sports language (“tagged out”), and no gore.
- **First release mode:** one local keyboard-and-mouse player versus 1–5 bots. Local-network multiplayer is deliberately deferred until the single-player loop is fun and stable.
- **Match rules:** two-minute free-for-all, one point per tag, five-second respawn, slow auto-heal after four seconds without damage.
- **Damage model:** head 52, torso 31, limbs 19. Clear hit markers reward accuracy without making one accidental hit an instant elimination.
- **Movement:** first-person walk, sprint, jump, and crouch with a slightly arcadey speed curve. Collision stays simple and forgiving.
- **Ammo:** 12 foam darts with a short reload. This creates useful breaks in combat without a weapon inventory.
- **Spawn protection:** every respawn gets a visible two-second shield so nobody is tagged before regaining control.
- **Arenas:** the first release includes three layouts: Sunset Sports Court has circular routes and mixed-height cover; Ice Pop Plaza has long accuracy lanes around a chunky center; Jungle Gym is an offset maze built for flanking.

## Technical decisions

- Static HTML/CSS/ES modules with no build step, matching the deployment shape of recent sibling game repositories.
- Three.js is pinned and vendored in `vendor/` so the game does not depend on a third-party CDN at runtime.
- GitHub Pages deploys the repository root using the official Pages actions on every push to `main`.
- Pages runs unit, syntax, asset-reference, and vendored-module checks before deploying, preventing an incomplete static runtime from reaching the live site.
- Arena geometry and characters are assembled from lightweight primitives. The generated cobra illustration is used as menu art; gameplay remains performant and readable from every angle.
- Web Audio generates short UI and blaster sounds in code, avoiding more asset downloads and making mute/volume support straightforward later.

## Art decision

- The supplied concept is a visual reference, not copied directly into the game. The in-game title character is an original generated render with a clean transparent cutout, delivered as an optimized WebP with a PNG favicon crop.

## Deferred

- LAN multiplayer and multiple human players.
- Additional blaster types and pickups.
