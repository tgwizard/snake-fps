# Cobra Clash

A colorful, child-friendly first-person foam-dart arena game. Play a two-minute free-for-all against adjustable bots across three arenas, score one point per tag, and jump back in after a five-second respawn.

Play: https://tgwizard.github.io/snake-fps/

## Controls

| Action | Control |
|---|---|
| Move | `W` `A` `S` `D` |
| Aim | Mouse |
| Fire | Left click |
| Sprint | `Shift` |
| Jump | `Space` |
| Crouch | `C` or `Ctrl` |
| Reload | `R` |
| Pause | `Esc` |

## Run locally

```sh
npm run serve
```

Open `http://localhost:9922/`.

## Test

```sh
npm test
npm run check
```

## Stack

Static HTML, CSS, JavaScript ES modules, and a vendored copy of Three.js. There is no build step. See [notes.md](notes.md) for gameplay and technical decisions.
