
/*
 * INFINITE CHEF — DISTILLER TOOL
 * Single-file build: engine + UI + tests + adapters.
 * Version 2.0.0
 *
 * Load after the game scripts.
 * No external dependencies.
 *
 * Browser console:
 *   InfiniteChefDistiller.runTests()
 *   InfiniteChefDistiller.mount()
 */

(function (G) {
  "use strict";

  if (G.InfiniteChefDistiller?.version === "2.0.0") return;

  const VERSION = "2.0.0";
  const ingredients = new Map();
  const discoveries = new Map();
  const listeners = new Map();
  const adapters = [];
  let panel = null;
  let lastResult = null;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const norm = s => String(s ?? "").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

  function hash(value) {
    const str = typeof value === "string"
      ? value : JSON.stringify(value);
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }

  function emit(name, data) {
    for (const fn of listeners.get(name) || []) {
      try { fn(data); } catch (e) {
        console.error("[Distiller] Event error", e);
      }
    }
    try {
      G.dispatchEvent?.(new CustomEvent("ic:distiller:" + name, {
        detail: data
      }));
    } catch (_) {}
  }

  function on(name, fn) {
    if (typeof fn !== "function") throw Error("Callback non valida");
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return () => listeners.get(name)?.delete(fn);
  }

  function registerIngredient(raw) {
    if (typeof raw === "string") raw = { name: raw };
    if (!raw || typeof raw !== "object") throw Error("Ingrediente non valido");

    const name = String(raw.name || raw.id || "").trim();
    if (!name) throw Error("Nome ingrediente mancante");

    const id = String(raw.id || norm(name));
    const old = ingredients.get(id) || {};

    const item = Object.freeze({
      ...old, ...raw, id, name,
      category: raw.category || old.category || "unknown",
      boilingPoint: clamp(num(raw.boilingPoint, 100), -50, 600),
      volatility: clamp(num(raw.volatility, 0.5), 0, 1),
      purity: clamp(num(raw.purity, 0.8), 0, 1),
      aroma: clamp(num(raw.aroma, 0.3), 0, 1),
      density: clamp(num(raw.density, 1), 0.01, 25),
      polarity: clamp(num(raw.polarity, 0.5), 0, 1),
      toxicity: clamp(num(raw.toxicity, 0), 0, 1),
      waterContent: clamp(num(raw.waterContent, 0), 0, 1),
      tags: Array.isArray(raw.tags) ? [...raw.tags] : []
    });

    ingredients.set(id, item);
    emit("ingredient", item);
    return item;
  }

  function getIngredient(key) {
    if (key == null) return null;
    if (ingredients.has(String(key))) return ingredients.get(String(key));
    const n = norm(key);
    return [...ingredients.values()].find(x => norm(x.name) === n) || null;
  }

  function importIngredients(data) {
    if (data instanceof Map) data = [...data.values()];
    if (data && !Array.isArray(data) && typeof data === "object") {
      data = Object.entries(data).map(([id, value]) =>
        typeof value === "string" ? { id, name: value } : { id, ...value }
      );
    }
    if (!Array.isArray(data)) return 0;

    let count = 0;
    for (const item of data) {
      try { registerIngredient(item); count++; } catch (_) {}
    }
    return count;
  }

  function addAdapter(adapter) {
    if (!adapter || typeof adapter !== "object") throw Error("Adapter non valido");
    adapters.push(adapter);
    return adapter;
  }

  function discover() {
    let count = 0;
    for (const key of [
      "ingredients", "Ingredients", "allIngredients",
      "ALL_INGREDIENTS", "elements", "Elements", "ITEMS", "items"
    ]) {
      try {
        if (G[key] && G[key] !== ingredients) {
          count += importIngredients(G[key]);
        }
      } catch (_) {}
    }

    for (const adapter of adapters) {
      try {
        if (typeof adapter.getIngredients === "function") {
          count += importIngredients(adapter.getIngredients());
        }
      } catch (e) {
        console.warn("[Distiller] Discovery adapter:", e);
      }
    }
    return count;
  }

  function mixtureOf(input) {
    let rows;
    if (Array.isArray(input)) {
      rows = input.map(x => typeof x === "string"
        ? { id: x, amount: 1 } : x);
    } else if (input && typeof input === "object") {
      rows = Object.entries(input).map(([id, v]) =>
        typeof v === "number" ? { id, amount: v } : { id, ...v }
      );
    } else throw Error("Inserisci gli ingredienti");

    const map = new Map();
    for (const row of rows) {
      if (!row) continue;
      const id = String(row.id || row.name || "");
      const amount = num(row.amount ?? row.quantity, 1);
      if (!id || amount <= 0) continue;

      let item = getIngredient(id);
      if (!item) item = registerIngredient({ id: norm(id), name: id });
      map.set(item.id, (map.get(item.id) || 0) + amount);
    }

    if (!map.size) throw Error("La miscela è vuota");
    return [...map].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([id, amount]) => ({ item: ingredients.get(id), amount }));
  }

  function processOf(options = {}) {
    const p = {
      method: "fractional",
      temperature: 85,
      pressure: 1,
      duration: 60,
      power: 65,
      cooling: 70,
      reflux: 3,
      stages: 8,
      efficiency: 0.82,
      agitation: 25,
      batchSize: 100,
      ...options
    };

    const methods = [
      "simple", "fractional", "vacuum", "steam",
      "maceration", "fermentation", "rectification"
    ];
    if (!methods.includes(p.method)) p.method = "fractional";

    p.temperature = clamp(num(p.temperature, 85), -20, 500);
    p.pressure = clamp(num(p.pressure, 1), 0.05, 20);
    p.duration = clamp(num(p.duration, 60), 1, 10000);
    p.power = clamp(num(p.power, 65), 0, 100);
    p.cooling = clamp(num(p.cooling, 70), 0, 100);
    p.reflux = clamp(num(p.reflux, 3), 0, 20);
    p.stages = Math.round(clamp(num(p.stages, 8), 1, 100));
    p.efficiency = clamp(num(p.efficiency, 0.82), 0, 1);
    p.agitation = clamp(num(p.agitation, 25), 0, 100);
    return p;
  }

  function simulate(input, options = {}) {
    const mix = mixtureOf(input);
    const p = processOf(options);
    const total = mix.reduce((s, x) => s + x.amount, 0);

    const components = mix.map(({ item: i, amount }) => {
      const bp = i.boilingPoint + 18 * Math.log(p.pressure);
      const fit = Math.exp(-Math.abs(p.temperature - bp) / 28);
      const time = 1 - Math.exp(-p.duration / 40);

      let recovery = i.volatility * fit * p.efficiency *
        (0.4 + p.power / 170) *
        (0.35 + p.cooling / 155) * time;

      if (p.method === "maceration") {
        recovery = i.aroma * (0.3 + p.agitation / 150) * time;
      } else if (p.method === "fermentation") {
        recovery = (i.waterContent + i.aroma) * 0.5 * time;
      } else {
        recovery *= p.method === "rectification" ? 1.12 :
          p.method === "fractional" ? 1.05 :
          p.method === "vacuum" ? 1.04 : 1;
      }

      if (p.method === "fractional" || p.method === "rectification") {
        recovery *= (1 + Math.log1p(p.stages) / 10) * (1 + p.reflux / 25);
      }

      recovery = clamp(recovery, 0, 0.97);

      return {
        id: i.id, name: i.name, category: i.category,
        amount, boilingPoint: bp,
        recovered: amount * recovery,
        residual: amount * (1 - recovery),
        purity: i.purity, aroma: i.aroma,
        toxicity: i.toxicity, density: i.density,
        polarity: i.polarity
      };
    }).sort((a, b) => a.boilingPoint - b.boilingPoint || a.id.localeCompare(b.id));

    const recovered = components.reduce((s, x) => s + x.recovered, 0);
    const residue = components.reduce((s, x) => s + x.residual, 0);
    const weighted = key => recovered
      ? components.reduce((s, x) => s + x[key] * x.recovered, 0) / recovered
      : 0;

    const fractions = [];
    const count = p.method === "simple" ? 1 : Math.min(p.stages, components.length);
    const active = components.filter(x => x.recovered > 0);
    if (active.length) {
      const minBP = active[0].boilingPoint;
      const span = Math.max(1, active[active.length - 1].boilingPoint - minBP);

      for (let n = 0; n < count; n++) {
        const members = active.filter(c => {
          const pos = (c.boilingPoint - minBP) / span;
          return count === 1 ||
            (pos >= n / count && (pos < (n + 1) / count || n === count - 1));
        });
        if (!members.length) continue;

        const qty = members.reduce((s, x) => s + x.recovered, 0);
        fractions.push({
          index: fractions.length + 1,
          label: n === 0 ? "Frazione iniziale" :
            n === count - 1 ? "Frazione finale" : "Frazione centrale",
          quantity: +qty.toFixed(4),
          components: members.map(x => ({
            id: x.id, name: x.name, quantity: +x.recovered.toFixed(4)
          }))
        });
      }
    }

    const categories = mix.map(x => norm(x.item.category));
    const product = p.method === "maceration" ? "Estratto simulato" :
      p.method === "fermentation" ? "Fermentato simulato" :
      p.method === "steam" ? "Condensato aromatico" :
      p.method === "vacuum" ? "Distillato sottovuoto" :
      p.method === "rectification" ? "Distillato rettificato" :
      categories.includes("fruit") ? "Distillato fruttato" :
      categories.includes("herb") ? "Distillato aromatico" :
      fractions.length > 1 ? "Distillato frazionato" : "Distillato misto";

    // Stable identity: same normalized mixture and settings => same ID.
    const signature = {
      version: VERSION,
      mix: mix.map(x => [x.item.id, +x.amount.toFixed(8)]),
      process: p
    };
    const fingerprint = hash(signature);
    const result = {
      id: "distillate-" + fingerprint,
      fingerprint,
      product,
      method: p.method,
      input: mix.map(x => ({ id: x.item.id, name: x.item.name, amount: x.amount })),
      process: p,
      output: {
        inputQuantity: +total.toFixed(4),
        quantity: +recovered.toFixed(4),
        residue: +residue.toFixed(4),
        yield: +(recovered / total).toFixed(4),
        purity: +weighted("purity").toFixed(4),
        aroma: +weighted("aroma").toFixed(4),
        density: +weighted("density").toFixed(4),
        polarity: +weighted("polarity").toFixed(4),
        toxicityIndex: +weighted("toxicity").toFixed(4)
      },
      fractions,
      residueComponents: components.filter(x => x.residual > 0).map(x => ({
        id: x.id, name: x.name, quantity: +x.residual.toFixed(4)
      })),
      warnings: [],
      createdAt: new Date().toISOString()
    };

    if (result.output.toxicityIndex > 0.3) {
      result.warnings.push("Indice virtuale elevato: sicurezza reale non verificata.");
    }
    if (result.output.yield < 0.1) {
      result.warnings.push("Resa virtuale bassa.");
    }

    discoveries.set(result.id, result);
    lastResult = result;
    emit("complete", result);

    for (const adapter of adapters) {
      try { adapter.onDistillation?.(result); }
      catch (e) { console.warn("[Distiller] Adapter callback:", e); }
    }
    return result;
  }

  // ---------- AUTOMATIC TEST SUITE ----------

  function runTests() {
    const report = [];
    const test = (name, fn) => {
      try {
        fn();
        report.push({ test: name, passed: true });
      } catch (e) {
        report.push({ test: name, passed: false, error: e.message });
      }
    };
    const assert = (condition, message) => {
      if (!condition) throw Error(message || "Assertion failed");
    };

    registerIngredient({
      id: "__test_water", name: "Test Water",
      boilingPoint: 100, volatility: 0.95, purity: 0.99,
      waterContent: 1
    });
    registerIngredient({
      id: "__test_herb", name: "Test Herb",
      category: "herb", boilingPoint: 180,
      volatility: 0.4, aroma: 0.95, purity: 0.85
    });
    registerIngredient({
      id: "__test_resin", name: "Test Resin",
      category: "resin", boilingPoint: 260,
      volatility: 0.15, aroma: 0.8, purity: 0.7
    });

    test("Ingredient registration", () => {
      assert(!!getIngredient("__test_water"), "Ingredient not registered");
    });

    test("Multi-ingredient mixture", () => {
      const r = simulate([
        { id: "__test_water", amount: 70 },
        { id: "__test_herb", amount: 20 },
        { id: "__test_resin", amount: 10 }
      ]);
      assert(r.input.length === 3, "Expected three ingredients");
    });

    test("Mass balance", () => {
      const r = simulate([
        { id: "__test_water", amount: 60 },
        { id: "__test_herb", amount: 40 }
      ]);
      const balance = r.output.quantity + r.output.residue;
      assert(Math.abs(balance - r.output.inputQuantity) < 0.001,
        "Recovered quantity + residue differs from input");
    });

    test("Repeatable fingerprint", () => {
      const input = [
        { id: "__test_water", amount: 60 },
        { id: "__test_herb", amount: 40 }
      ];
      const a = simulate(input, { temperature: 90, method: "fractional" });
      const b = simulate(input, { temperature: 90, method: "fractional" });
      assert(a.fingerprint === b.fingerprint, "Fingerprint is not stable");
      assert(a.output.quantity === b.output.quantity, "Output is not stable");
    });

    test("Different process signatures", () => {
      const input = [
        { id: "__test_water", amount: 60 },
        { id: "__test_herb", amount: 40 }
      ];
      const a = simulate(input, { temperature: 90, method: "fractional" });
      const b = simulate(input, { temperature: 140, method: "simple" });
      assert(a.fingerprint !== b.fingerprint, "Signatures should differ");
    });

    test("Quantity validation", () => {
      const r = simulate([{ id: "__test_water", amount: -2 }]);
      assert(r.input.length === 0, "Negative quantities should be ignored");
    });

    test("UI-independent event system", () => {
      let received = false;
      const off = on("complete", () => { received = true; });
      simulate([{ id: "__test_water", amount: 10 }]);
      off();
      assert(received, "Completion event not delivered");
    });

    const passed = report.filter(x => x.passed).length;
    const result = {
      version: VERSION, passed,
      failed: report.length - passed,
      total: report.length, tests: report
    };

    console.table(report);
    console.info(`[Distiller tests] ${passed}/${report.length} passed`);
    emit("tests", result);
    return result;
  }

  // ---------- USER INTERFACE ----------

  function mount(target) {
    if (!G.document) throw Error("UI disponibile solo nel browser");

    if (typeof target === "string") target = G.document.querySelector(target);
    if (!target) target = G.document.body;
    if (!target) throw Error("Container UI non trovato");

    panel?.remove();

    const root = G.document.createElement("section");
    root.id = "ic-distiller-panel";
    root.style.cssText = [
      "font:14px system-ui,sans-serif",
      "color:var(--text-color,#eee)",
      "background:var(--background-color,#202329)",
      "border:1px solid #7778",
      "border-radius:12px",
      "padding:16px",
      "margin:12px 0",
      "max-width:760px"
    ].join(";");

    root.innerHTML = `
      <style>
        #ic-distiller-panel *{box-sizing:border-box}
        #ic-distiller-panel label{display:block;margin:9px 0}
        #ic-distiller-panel input,#ic-distiller-panel select,
        #ic-distiller-panel textarea{width:100%;padding:7px;margin-top:3px}
        #ic-distiller-panel button{padding:9px 12px;margin:5px 5px 5px 0;cursor:pointer}
        #ic-distiller-panel pre{white-space:pre-wrap;overflow-wrap:anywhere;
          max-height:380px;overflow:auto;background:#0002;padding:10px}
        #ic-distiller-panel .grid{display:grid;
          grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}
      </style>
      <header>
        <h2 style="margin-top:0">⚗️ Distiller Lab</h2>
        <div>Infinite Chef · Engine ${VERSION}</div>
      </header>
      <label>Ingredienti: un ingrediente per riga, formato nome,quantità
        <textarea data-mix rows="5"
          placeholder="Test Water,60&#10;Test Herb,30&#10;Test Resin,10"></textarea>
      </label>
      <div class="grid">
        <label>Metodo
          <select data-method>
            <option value="simple">Distillazione semplice</option>
            <option value="fractional" selected>Frazionata</option>
            <option value="vacuum">Sottovuoto simulato</option>
            <option value="steam">Corrente di vapore simulata</option>
            <option value="maceration">Macerazione</option>
            <option value="fermentation">Fermentazione simulata</option>
            <option value="rectification">Rettificazione simulata</option>
          </select>
        </label>
        <label>Temperatura °C <output data-tout>85</output>
          <input data-temp type="range" min="0" max="250" value="85">
        </label>
        <label>Pressione relativa
          <input data-pressure type="number" min=".05" max="20" step=".05" value="1">
        </label>
        <label>Durata (minuti)
          <input data-time type="number" min="1" max="10000" value="60">
        </label>
        <label>Potenza % <output data-pout>65</output>
          <input data-power type="range" min="0" max="100" value="65">
        </label>
        <label>Raffreddamento % <output data-cout>70</output>
          <input data-cooling type="range" min="0" max="100" value="70">
        </label>
        <label>Stadi della colonna
          <input data-stages type="number" min="1" max="100" value="8">
        </label>
        <label>Riflusso
          <input data-reflux type="number" min="0" max="20" value="3">
        </label>
      </div>
      <div>
        <button data-run>Esegui distillazione</button>
        <button data-discover>Importa ingredienti</button>
        <button data-test>Esegui test automatici</button>
        <button data-export>Esporta risultato JSON</button>
      </div>
      <div data-status role="status">Pronto per la simulazione.</div>
      <pre data-output>Il risultato apparirà qui.</pre>
    `;

    target.appendChild(root);
    panel = root;

    const $ = selector => root.querySelector(selector);
    const show = value => {
      $("[data-output]").textContent = typeof value === "string"
        ? value : JSON.stringify(value, null, 2);
    };

    for (const [input, output] of [
      ["[data-temp]", "[data-tout]"],
      ["[data-power]", "[data-pout]"],
      ["[data-cooling]", "[data-cout]"]
    ]) {
      $(input).addEventListener("input", () => {
        $(output).textContent = $(input).value;
      });
    }

    $("[data-run]").addEventListener("click", () => {
      try {
        const rows = $("[data-mix]").value.split(/\r?\n/)
          .map(s => s.trim()).filter(Boolean)
          .map(line => {
            const parts = line.split(",");
            return { id: parts[0].trim(), amount: num(parts[1], 1) };
          });

        const result = simulate(rows, {
          method: $("[data-method]").value,
          temperature: $("[data-temp]").value,
          pressure: $("[data-pressure]").value,
          duration: $("[data-time]").value,
          power: $("[data-power]").value,
          cooling: $("[data-cooling]").value,
          stages: $("[data-stages]").value,
          reflux: $("[data-reflux]").value
        });

        $("[data-status]").textContent =
          `Completato: ${result.product} · ID ${result.id}`;
        show(result);
      } catch (e) {
        $("[data-status]").textContent = "Errore di simulazione";
        show(e.message);
      }
    });

    $("[data-discover]").addEventListener("click", () => {
      const count = discover();
      $("[data-status]").textContent =
        `${count} elementi importati. Catalogo: ${ingredients.size}.`;
      show([...ingredients.values()]);
    });

    $("[data-test]").addEventListener("click", () => {
      const result = runTests();
      $("[data-status]").textContent =
        `Test: ${result.passed}/${result.total} superati`;
      show(result);
    });

    $("[data-export]").addEventListener("click", () => {
      if (!lastResult) {
        show("Esegui prima una simulazione.");
        return;
      }
      const blob = new Blob([JSON.stringify(lastResult, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = G.document.createElement("a");
      a.href = url;
      a.download = lastResult.id + ".json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      $("[data-status]").textContent = "Esportazione avviata.";
    });

    emit("ui:mounted", { element: root });
    return {
      element: root,
      destroy() {
        root.remove();
        if (panel === root) panel = null;
      }
    };
  }

  function exportState() {
    return {
      version: VERSION,
      ingredients: [...ingredients.values()],
      discoveries: [...discoveries.values()]
    };
  }

  function importState(state) {
    if (!state || typeof state !== "object") throw Error("Stato non valido");
    importIngredients(state.ingredients || []);
    for (const r of state.discoveries || []) {
      if (r?.id) discoveries.set(r.id, r);
    }
    return true;
  }

  const api = Object.freeze({
    version: VERSION,
    registerIngredient,
    getIngredient,
    listIngredients: () => [...ingredients.values()],
    importIngredients,
    discover,
    addAdapter,
    on,
    simulate,
    distill: simulate,
    runTests,
    mount,
    getDiscovery: id => discoveries.get(id) || null,
    listDiscoveries: () => [...discoveries.values()],
    exportState,
    importState,
    getLastResult: () => lastResult
  });

  G.InfiniteChefDistiller = api;

  // Bridge to a real game API: adapters must explicitly define
  // getIngredients() and/or onDistillation(result).
  G.addEventListener?.("DOMContentLoaded", () => {
    discover();
    emit("ready", { version: VERSION, ingredients: ingredients.size });
  }, { once: true });

  // Optional opt-in auto UI:
  // <script src="distiller.js" data-auto-mount="true"></script>
  try {
    const scripts = G.document?.getElementsByTagName("script");
    const current = scripts && [...scripts].find(s =>
      /distiller\.js(?:\?|$)/i.test(s.src || "")
    );
    if (current?.dataset.autoMount === "true") {
      const start = () => mount();
      if (G.document.readyState === "loading") {
        G.document.addEventListener("DOMContentLoaded", start, { once: true });
      } else {
        start();
      }
    }
  } catch (_) {}

  console.info("[Infinite Chef Distiller] Engine ready:", VERSION);
})(typeof globalThis !== "undefined" ? globalThis : window);

InfiniteChefDistiller.addAdapter({
  getIngredients() {
    // Sostituisci GameIngredientRegistry con
    // il registro reale di Infinite Chef.
    return GameIngredientRegistry.getAll();
  },

  onDistillation(result) {
    // Qui puoi collegare il risultato al sistema
    // delle scoperte del gioco, usando la sua API reale.
    console.log("Nuova lavorazione:", result);
  }
});

InfiniteChefDistiller.discover();
