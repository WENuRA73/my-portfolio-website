# Playable games on Sitelume

`play.html` loads one game at a time in an iframe. The two games are hosted under `games/deadzone/` and `games/space-shooter/`. Portfolio links use `play.html#deadzone` and `play.html#space-shooter`.

## Deadzone

`game-src/deadzone/` is a local copy of the game's gameplay files from the source project. It is bundled into the static `games/deadzone/game.js` file, so the Sitelume website does not require a Next.js server to run the game. The CSS and three game artwork files sit beside the bundle. Rebuild after changing this copy:

```powershell
$env:DEADZONE_ESBUILD = 'path\to\deadzone-wave-survival\node_modules\esbuild'
$env:DEADZONE_NODE_MODULES = 'path\to\deadzone-wave-survival\node_modules'
node game-src\deadzone\build.cjs
Copy-Item game-src\deadzone\globals.css games\deadzone\game.css
```

## Space Shooter

The static files in `games/space-shooter/` were built from the Space Shooter source using Vite with `--base ./` and an output directory inside this website. The game's runtime uses root-based `/assets/` paths for artwork. After rebuilding, replace those paths in the generated `assets/index-*.js` with `/games/space-shooter/assets/` and update the script URL in `index.html` to avoid browser cache issues. The playable game files are already included; visitors do not need the original development project.

Both games use browser storage for local records. Sound begins after a visitor starts a game. The game portal loads only the selected game, keeping the rest of the portfolio light.
