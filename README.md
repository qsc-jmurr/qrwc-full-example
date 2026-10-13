# QRWC Full Example

The "everything, done properly" app for the QRWC workshop. It connects to the same Core as the simple example and shows:

| Page | What it does | Q-SYS component |
|---|---|---|
| **Everywhere** | Main volume + mute, docked on every page | `MainGain` |
| **Audio** | Parametric EQ you drag on its live curve (bands discovered) + bypass | `MainEQ` |
| | Limiter transfer curve with a draggable threshold, live input dot, gain-reduction meter + bypass | `MainLimiter` |
| | Delay fader(s) + bypass | `Main Delay` |
| **Video** | Drag-and-drop (or tap-then-tap) routing; outputs and source names discovered | `Decoder` |
| **Cameras** | Camera list, joystick PTZ, ~1 fps JPEG still | camera router + USB video bridge |
| **Explore** | Design check + live explorer of everything the Core exposes, with generated types | all |
| **Home** | Weather (Open-Meteo), clock, system status | — |

Plus a **Settings** modal (cog icon): Core address, access token, polling interval, discovery mode, theme, weather location. Page changes slide using the browser's View Transitions API.

## Run it

Needs **Node 22.5+**.

```bash
npm install
cp .env.example .env.local     # set NEXT_PUBLIC_QSYS_HOST (and the token if Access Control is on)
npm run dev                    # http://localhost:3000
```

You can also set the Core in **Settings**, or with `?core=192.168.0.115` in the URL.

**No Core?** Run `npm run mock-core`, then open `http://localhost:3000/?core=localhost:8080`. It's a simplified fake with the same component names (including a camera still that changes with the selected camera), for rehearsing only.

## How it's built

```
lib/
  config.ts             THE design map: component names (+ Type fallbacks), connection defaults
  settings.tsx          per-browser settings (localStorage), theme
  toast.tsx             notifications
  qrwc/QrwcProvider.tsx ONE connection for the app (managed mode, reconnect, componentFilter, apiKey)
  qrwc/hooks.ts         useFeatureComponent, useComponentStates, useControl, useThrottledUpdate
  dsp.ts                maths for the EQ and limiter curves (no React)
features/               HEADLESS hooks: Q-SYS logic only, no JSX, no styling
  gain/ eq/ limiter/ delay/ video/ cameras/ weather/
components/
  ui/                   LOOKS: Fader, EqCurve, LimiterCurve, Joystick, RoutingBoard, ScrollList, Modal… (no Q-SYS)
  qsys/                 GLUE: one hook + one UI piece (EqPanel, LimiterPanel, VideoRouter, Cameras, VolumeDock…)
  shell/                AppShell (header, tab bar, dock), SettingsModal, PageTransition
  widgets/              Weather, Clock, RoomStatus
app/                    pages only compose; globals.css holds the themes
```

### Porting a feature into another project

Each feature is three layers, and you copy only what you need:

1. `features/eq/useParametricEq.ts`: the Q-SYS logic (needs `lib/qrwc/*` and `lib/config.ts`)
2. `components/ui/EqCurve.tsx`: the visual (needs `lib/dsp.ts`; works with any data, no Q-SYS)
3. `components/qsys/EqPanel.tsx`: about 60 lines of glue

### Best practices on show

| Practice | Where |
|---|---|
| One connection, shared via context; nothing else opens sockets | `QrwcProvider.tsx` |
| Managed mode (`host:`) with backoff reconnect; `disconnected` / `reconnected` → status + toasts | same |
| `componentFilter`: fetch and poll only what the app uses (Settings → Discovery mode for everything) | same + `config.ts` |
| `apiKey` only when Access Control is on; never hard-coded (env → Settings) | `config.ts`, `settings.tsx` |
| `createQrwc` returning `undefined` handled; StrictMode-safe cleanup | `QrwcProvider.tsx` |
| Seed from `control.state`, subscribe once per component, clean up (`useSyncExternalStore`) | `hooks.ts` |
| Throttled writes while dragging; optimistic UI so faders don't fight your finger | `hooks.ts`, `Fader`, `EqCurve` |
| Discover, don't assume: EQ bands, delay taps, decoder outputs and source names, camera inputs, limiter control names | `features/*` |
| Ranges from `ValueMin` / `ValueMax`; speeds via `Position` | `features/*` |
| Edge-triggered PTZ; everything released on unmount or window blur | `features/cameras/usePtz.ts` |
| Missing component → friendly panel pointing at Explore, not a crash | `components/qsys/Missing.tsx` |
| Themes as CSS variables; components only use tokens | `app/globals.css` |
| Accessible: real range inputs, keyboard joystick, native `<dialog>`, reduced-motion respected | `components/ui/*` |

## Things to check on your Core

Component names are in `lib/config.ts`. If a name doesn't match, the Type fallback usually finds it, and **Explore → Design check** shows what was found.

- **Decoder source names:** taken from the select control's `Choices`, else from per-input name controls, else from the fallback list in `config.ts`. The Video page subtitle says which one it used.
- **Camera still:** the first control on the USB bridge whose name contains `jpeg` (then `preview`, `snapshot`, `image`), rendered if its `String` is a base64 JPEG (or JSON carrying one).
- **PTZ control names:** `pan.left`, `tilt.up`, `zoom.in`, `pan.speed`… If yours differ, adjust the lists at the top of `features/cameras/usePtz.ts`.
- **Limiter control names** are matched by pattern (`threshold`, `attack`, `release`, `detector.level`, `applied.gain`).
- **Access Control:** if the Core asks for authentication, add a token in Settings (Core Manager → Access Tokens). Tokens in a browser are fine for a demo; in production, put a small server in front.
