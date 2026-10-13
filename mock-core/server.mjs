/**
 * MOCK Q-SYS CORE for rehearsing without hardware.
 * QRWC doesn't connect to Designer's Emulation mode, so this fakes enough of
 * the QRC WebSocket API for this app. It is NOT a Core: tapers, ranges and
 * timing are simplified, and control names are best guesses at the real ones.
 *
 *   npm run mock-core     → ws://localhost:8080/qrc-public-api/v0
 *   then open http://localhost:3000/?core=localhost:8080
 */
import { readFileSync } from "node:fs";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT ?? 8080);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const db = (v) => `${v.toFixed(1)}dB`;
const hz = (v) => (v < 1000 ? `${Math.round(v)}Hz` : `${(v / 1000).toFixed(2)}kHz`);
const ms = (v) => `${(v * 1000).toFixed(0)}ms`;

// ---- control factories ------------------------------------------------------
const float = (Value, ValueMin, ValueMax, fmt = (v) => v.toFixed(2), log = false) => ({ Type: "Float", Value, ValueMin, ValueMax, fmt, log });
const bool = (on = false) => ({ Type: "Boolean", Value: on ? 1 : 0, ValueMin: 0, ValueMax: 1, fmt: (v) => (v ? "true" : "false") });
const int = (Value, ValueMin, ValueMax) => ({ Type: "Integer", Value, ValueMin, ValueMax, fmt: (v) => String(v) });
const text = (String, Choices) => ({ Type: "Text", Value: 0, String, Choices });
const meter = (Value) => ({ Type: "Float", Value, ValueMin: -60, ValueMax: 0, fmt: db, readOnly: true });

// ---- the design (component names match the workshop design) -----------------
const frames = JSON.parse(readFileSync(new URL("./frames.json", import.meta.url), "utf8"));
const eqBands = [
  [80, -3, 0.5],
  [400, 0, 1],
  [2500, 2, 1],
  [9000, 0, 1],
];
const design = {
  MainGain: { Type: "gain", controls: { gain: float(-12, -100, 20, db), mute: bool() } },
  "Main Delay": {
    Type: "delay",
    controls: { "delay.1": float(0.04, 0, 1, ms), bypass: bool() },
  },
  MainEQ: {
    Type: "equalizer_parametric",
    controls: Object.assign(
      { bypass: bool() },
      ...eqBands.map(([f, g, bw], i) => ({
        [`frequency.${i + 1}`]: float(f, 20, 20000, hz, true),
        [`gain.${i + 1}`]: float(g, -18, 18, db),
        [`bandwidth.${i + 1}`]: float(bw, 0.03, 4, (v) => `${v.toFixed(2)}oct`),
        [`type.${i + 1}`]: text("Parametric", ["Parametric", "Low Shelf", "High Shelf"]),
        [`bypass.${i + 1}`]: bool(),
      })),
    ),
  },
  MainLimiter: {
    Type: "limiter_peak",
    controls: {
      bypass: bool(),
      threshold: float(-10, -60, 20, db),
      attack: float(0.001, 0.0001, 0.5, ms, true),
      release: float(0.1, 0.001, 5, ms, true),
      "detector.level": meter(-30),
      "applied.gain": { ...meter(0), ValueMin: -60, ValueMax: 0 },
    },
  },
  Decoder: {
    Type: "streamer_hdmi_switcher",
    controls: {
      "hdmi.out.1.select.index": { ...int(4, 1, 7), Choices: ["None", "Graphics 1", "Graphics 2", "Laptop Front", "Laptop Rear", "Room PC", "Wireless"] },
      "hdmi.out.2.select.index": { ...int(1, 1, 7), Choices: ["None", "Graphics 1", "Graphics 2", "Laptop Front", "Laptop Rear", "Room PC", "Wireless"] },
    },
  },
  "Camera Router": {
    Type: "video_router",
    controls: {
      "select.1": int(1, 1, 4),
      ...Object.fromEntries([1, 2, 3, 4].map((n) => [`output.1.input.${n}.select`, bool(n === 1)])),
      "input.1.source.name": text("Front of room"),
      "input.2.source.name": text("Lectern"),
      "input.3.source.name": text("Audience wide"),
      "input.4.source.name": text("Ceiling"),
    },
  },
  "USB Bridge": {
    Type: "usb_bridge",
    controls: {
      ...Object.fromEntries(
        ["pan.left", "pan.right", "tilt.up", "tilt.down", "pan.left.tilt.up", "pan.left.tilt.down", "pan.right.tilt.up", "pan.right.tilt.down", "zoom.in", "zoom.out"].map((n) => [n, bool()]),
      ),
      "pan.speed": float(0.5, 0, 1),
      "tilt.speed": float(0.5, 0, 1),
      jpeg: text(frames["1"][0]),
    },
  },
  Unrelated_Gain: { Type: "gain", controls: { gain: float(0, -100, 20, db), mute: bool() } },
};

// ---- state helpers ------------------------------------------------------------
function stateOf(component, name) {
  const c = design[component].controls[name];
  const numeric = c.Type !== "Text";
  let Position = 0;
  if (numeric && c.ValueMax !== c.ValueMin) {
    Position = c.log
      ? Math.log(c.Value / c.ValueMin) / Math.log(c.ValueMax / c.ValueMin)
      : (c.Value - c.ValueMin) / (c.ValueMax - c.ValueMin);
  }
  return {
    Component: component,
    Name: name,
    Type: c.Type,
    Direction: c.readOnly ? "Read Only" : "Read/Write",
    Value: c.Value,
    ValueMin: c.ValueMin,
    ValueMax: c.ValueMax,
    Position,
    String: numeric ? c.fmt(c.Value) : c.String,
    ...(c.Choices ? { Choices: c.Choices } : {}),
  };
}

const groups = new Map();
const key = (c, n) => `${c}\u0000${n}`;
function dirty(component, name) {
  for (const g of groups.values()) if (g.controls.has(key(component, name))) g.dirty.add(key(component, name));
}

function set(component, upd) {
  const c = design[component]?.controls[upd.Name];
  if (!c) throw new Error(`Unknown control ${component}.${upd.Name}`);
  if (c.readOnly) throw new Error("Read only");
  if (c.Type === "Text") {
    if (upd.String !== undefined) c.String = String(upd.String);
    else if (typeof upd.Value === "string") c.String = upd.Value;
  } else if (upd.Position !== undefined) {
    const p = clamp(upd.Position, 0, 1);
    c.Value = c.log ? c.ValueMin * Math.pow(c.ValueMax / c.ValueMin, p) : c.ValueMin + p * (c.ValueMax - c.ValueMin);
  } else if (upd.Value !== undefined) {
    c.Value = clamp(Number(upd.Value), c.ValueMin, c.ValueMax);
  }
  if (c.Type === "Boolean") c.Value = c.Value >= 0.5 ? 1 : 0;
  if (c.Type === "Integer") c.Value = Math.round(c.Value);
  dirty(component, upd.Name);

  // keep the camera router's interlocked buttons in step with select.1
  if (component === "Camera Router") {
    const r = design["Camera Router"].controls;
    if (upd.Name === "select.1") {
      for (const n of [1, 2, 3, 4]) {
        r[`output.1.input.${n}.select`].Value = n === r["select.1"].Value ? 1 : 0;
        dirty("Camera Router", `output.1.input.${n}.select`);
      }
    }
  }
  if (component === "USB Bridge" && c.Type === "Boolean") console.log(`PTZ ${upd.Name} ${c.Value ? "ON" : "off"}`);
  return stateOf(component, upd.Name);
}

// Animate the limiter meters from the main gain, and publish a JPEG frame every second.
setInterval(() => {
  const g = design.MainGain.controls;
  const L = design.MainLimiter.controls;
  const input = g.mute.Value ? -100 : clamp(-18 + g.gain.Value * 0.5 + (Math.random() * 14 - 7), -60, 0);
  L["detector.level"].Value += (input - L["detector.level"].Value) * 0.4;
  const over = L.bypass.Value ? 0 : Math.max(0, L["detector.level"].Value - L.threshold.Value);
  L["applied.gain"].Value = -over;
  dirty("MainLimiter", "detector.level");
  dirty("MainLimiter", "applied.gain");
}, 120);

let frame = 0;
setInterval(() => {
  frame = (frame + 1) % 4;
  const cam = String(design["Camera Router"].controls["select.1"].Value);
  design["USB Bridge"].controls.jpeg.String = (frames[cam] ?? frames["1"])[frame];
  dirty("USB Bridge", "jpeg");
}, 1000);

const engineStatus = () => ({
  Platform: "Mock Core (not real hardware)",
  State: "Active",
  DesignName: "QRWC Workshop (mock)",
  DesignCode: "mock",
  IsRedundant: false,
  IsEmulator: false,
  Status: { Code: 0, String: "OK" },
});

const handlers = {
  NoOp: () => true,
  StatusGet: engineStatus,
  "Component.GetComponents": () =>
    Object.entries(design).map(([Name, c]) => ({ ID: Name, Name, Type: c.Type, Properties: [], Controls: null, ControlSource: 2 })),
  "Component.GetControls": ({ Name }) => ({ Name, Controls: Object.keys(design[Name].controls).map((n) => stateOf(Name, n)) }),
  "ChangeGroup.AddComponentControl": ({ Id, Component }, ws) => {
    const g = groups.get(Id) ?? { controls: new Set(), dirty: new Set(), ws };
    groups.set(Id, g);
    for (const { Name } of Component.Controls) {
      g.controls.add(key(Component.Name, Name));
      g.dirty.add(key(Component.Name, Name));
    }
    return { Id, Controls: Component.Controls.map((c) => c.Name) };
  },
  "ChangeGroup.Poll": ({ Id }) => {
    const g = groups.get(Id);
    if (!g) return { Id, Changes: [] };
    const Changes = [...g.dirty].map((k) => stateOf(...k.split("\u0000")));
    g.dirty.clear();
    return { Id, Changes };
  },
  "Component.Set": ({ Name, Controls }) => Controls.map((c) => set(Name, c)),
};

const wss = new WebSocketServer({ port: PORT, path: "/qrc-public-api/v0" });
wss.on("connection", (ws) => {
  console.log("client connected");
  ws.send(JSON.stringify({ jsonrpc: "2.0", method: "EngineStatus", params: engineStatus() }));
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    const h = handlers[msg.method];
    if (!h) return ws.send(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: `Unknown method ${msg.method}` } }));
    try {
      ws.send(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: h(msg.params ?? {}, ws) }));
    } catch (e) {
      ws.send(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { code: 1, message: e.message } }));
    }
  });
  ws.on("close", () => {
    for (const [id, g] of groups) if (g.ws === ws) groups.delete(id);
    console.log("client disconnected");
  });
});

console.log(`Mock Q-SYS Core on ws://localhost:${PORT}/qrc-public-api/v0`);
console.log(`Open the app with ?core=localhost:${PORT}`);
