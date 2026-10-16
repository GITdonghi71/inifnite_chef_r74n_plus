
(() => {
  "use strict";

  // Restoration Simulator — Infinite Chef R74n Plus
  // Pannello laterale sinistro, 3 giorni, 6 piatti.
  // Acquisizione in sola lettura e salvataggio persistente.

  const MOD_ID = "restoration-simulator-v3";
  const SAVE_KEY = "restorationSimulatorSave_v2";
  const STARTING_CAPITAL = 1000;

  if (window[MOD_ID]?.destroy) window[MOD_ID].destroy();
  // Compatibilità con la versione precedente.
  if (window["restoration-simulator-v2"]?.destroy) {
    window["restoration-simulator-v2"].destroy();
  }

  let selectedSlot = 0;
  let collapsed = false;
  let state = loadState();
  let panel, tab, style;
  let destroyed = false;

  const slots = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    day: Math.floor(i / 2) + 1,
    meal: i % 2 === 0 ? "Pranzo" : "Cena"
  }));

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (saved && Array.isArray(saved.slots) && saved.slots.length === 6) {
        return {
          capital: Number.isFinite(saved.capital)
            ? saved.capital : STARTING_CAPITAL,
          slots: saved.slots,
          history: Array.isArray(saved.history) ? saved.history : [],
          lastSimulation: saved.lastSimulation || null
        };
      }
    } catch (e) {
      console.warn("[Restoration Simulator] Salvataggio non leggibile.", e);
    }

    return {
      capital: STARTING_CAPITAL,
      slots: Array(6).fill(null),
      history: [],
      lastSimulation: null
    };
  }

  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("[Restoration Simulator] Errore di salvataggio:", e);
      alert("Salvataggio non riuscito. Prova a esportare i dati JSON.");
    }
  }

  function money(n) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2
    }).format(n);
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    })[ch]);
  }

  // Copia i dati degli oggetti sul piano senza modificarli.
  function captureCurrentDish() {
    const view = window.currentView;
    const total = window.viewData?.[view]?.total;

    if (!Array.isArray(total)) {
      throw new Error(
        "Piano di lavoro non accessibile. Verifica che Infinite Chef sia caricato."
      );
    }

    const items = total
      .filter(item => item && item.id && !item.hide)
      .map(item => {
        const copy = {};
        for (const [key, value] of Object.entries(item)) {
          if (key === "lastImg") continue;

          if (
            value === null ||
            ["string", "number", "boolean"].includes(typeof value)
          ) {
            copy[key] = value;
          }
        }
        return copy;
      });

    if (!items.length) {
      throw new Error("Non ci sono ingredienti visibili da acquisire.");
    }

    const counts = {};
    for (const item of items) {
      counts[item.id] = (counts[item.id] || 0) + 1;
    }

    return {
      name: "Piatto acquisito",
      capturedAt: new Date().toISOString(),
      view: String(view || "sconosciuta"),
      items,
      counts,
      recipeURL: typeof window.generateRecipeURL === "function"
        ? window.generateRecipeURL()
        : null
    };
  }

  // Stime illustrative, modificabili in base al proprio sistema economico.
  function ingredientCost(id) {
    const name = String(id).toLowerCase();

    if (/lobster|caviar|truffle|saffron|wagyu|uni|oyster/.test(name)) {
      return 8;
    }
    if (/salmon|steak|beef|pork|lamb|shrimp|prawn|cheese|chocolate|tuna/.test(name)) {
      return 4;
    }
    if (/flour|water|salt|sugar|rice|bread|dough|oil|egg|potato|onion/.test(name)) {
      return 0.6;
    }
    if (/fruit|vegetable|tomato|lettuce|bean|pea/.test(name)) {
      return 1.2;
    }
    return 1.8;
  }

  function evaluateDish(dish) {
    const items = dish?.items || [];
    const counts = dish?.counts || {};
    const names = Object.keys(counts);
    const quantity = items.length;
    const variety = names.length;

    const cost = items.reduce(
      (sum, item) => sum + ingredientCost(item.id), 0
    );

    const complexity = Math.min(10, variety * 1.2 + quantity * 0.3);
    const balance = quantity >= 2 && variety >= 2
      ? Math.min(10, 5 + variety * 0.45)
      : 3;

    const price = Math.max(
      5,
      Math.round((cost * 2.7 + variety * 2.5 + 4) * 100) / 100
    );

    const rating = Math.max(1, Math.min(
      5,
      Math.round((balance * 0.55 + complexity * 0.45) / 2 * 10) / 10
    ));

    return { quantity, variety, cost, price, rating, balance, complexity };
  }

  function dishName(dish) {
    if (!dish) return "Da acquisire";
    if (dish.name && dish.name !== "Piatto acquisito") return dish.name;

    const names = Object.keys(dish.counts || {});
    if (!names.length) return "Piatto acquisito";

    return names.slice(0, 3).join(" + ") +
      (names.length > 3 ? "…" : "");
  }

  function getCompletedDays() {
    return [0, 1, 2].filter(day =>
      state.slots[day * 2] && state.slots[day * 2 + 1]
    ).length;
  }

  function render() {
    if (!panel || destroyed) return;

    const current = state.slots[selectedSlot];
    const stats = current ? evaluateDish(current) : null;
    const sim = state.lastSimulation;

    panel.innerHTML = `
      <header class="rs-header">
        <div class="rs-brand">
          <div class="rs-logo">R</div>
          <div>
            <div class="rs-kicker">INFINITE CHEF</div>
            <h2>Restoration</h2>
            <div class="rs-subtitle">Restaurant simulator</div>
          </div>
        </div>
        <button class="rs-icon-button" data-action="collapse"
          title="Riduci pannello" aria-label="Riduci pannello">‹</button>
      </header>

      <section class="rs-capital">
        <div>
          <div class="rs-label">CAPITALE DISPONIBILE</div>
          <div class="rs-capital-value">${money(state.capital)}</div>
          <div class="rs-capital-note">Saldo del ristorante</div>
        </div>
        <div class="rs-euro">€</div>
      </section>

      <section class="rs-section">
        <div class="rs-section-heading">
          <h3>Menu dei tre giorni</h3>
          <span class="rs-counter">${state.slots.filter(Boolean).length}/6</span>
        </div>
        <div class="rs-progress">
          <div style="width:${state.slots.filter(Boolean).length / 6 * 100}%"></div>
        </div>

        ${[0, 1, 2].map(day => `
          <div class="rs-day">
            <div class="rs-day-title">
              <span>GIORNO ${day + 1}</span>
              ${state.slots[day * 2] && state.slots[day * 2 + 1]
                ? '<span class="rs-day-done">COMPLETO ✓</span>'
                : '<span class="rs-day-pending">IN CORSO</span>'}
            </div>
            <div class="rs-day-slots">
              ${[day * 2, day * 2 + 1].map(i => {
                const dish = state.slots[i];
                return `
                  <button class="rs-slot ${selectedSlot === i ? "active" : ""}"
                    data-action="select" data-slot="${i}">
                    <span class="rs-slot-check ${dish ? "checked" : ""}">
                      ${dish ? "✓" : ""}
                    </span>
                    <span class="rs-slot-info">
                      <span class="rs-slot-meal">${slots[i].meal}</span>
                      <span class="rs-slot-name">${esc(dishName(dish))}</span>
                    </span>
                    <span class="rs-slot-arrow">›</span>
                  </button>`;
              }).join("")}
            </div>
          </div>
        `).join("")}
      </section>

      <section class="rs-card">
        <div class="rs-card-title">
          <div>
            <div class="rs-label">SLOT SELEZIONATO</div>
            <h3>Giorno ${slots[selectedSlot].day} · ${slots[selectedSlot].meal}</h3>
          </div>
          <span class="rs-status ${current ? "done" : "pending"}">
            ${current ? "✓ Salvato" : "Da acquisire"}
          </span>
        </div>

        <p class="rs-help">
          Prepara il piatto nel gioco, poi acquisiscilo. Gli ingredienti originali
          non vengono spostati né modificati.
        </p>

        <button class="rs-primary" data-action="capture">
          <span>＋</span> Acquisisci piatto corrente
        </button>

        ${current ? `
          <div class="rs-capture-info">
            <div class="rs-info-row">
              <span>Ingredienti acquisiti</span><strong>${stats.quantity}</strong>
            </div>
            <div class="rs-info-row">
              <span>Ingredienti distinti</span><strong>${stats.variety}</strong>
            </div>
            <div class="rs-info-row">
              <span>Vista del gioco</span><strong>${esc(current.view)}</strong>
            </div>
            <div class="rs-info-row">
              <span>Acquisito il</span>
              <strong>${esc(new Date(current.capturedAt).toLocaleString("it-IT"))}</strong>
            </div>
          </div>

          <div class="rs-ingredients">
            <div class="rs-subheading">Ingredienti del piatto</div>
            ${Object.entries(current.counts || {}).map(([name, count]) => `
              <div class="rs-ingredient-row">
                <span class="rs-ingredient-dot"></span>
                <span>${esc(name.replace(/_/g, " "))}</span>
                <strong>${count > 1 ? "× " + count : "1"}</strong>
              </div>
            `).join("")}
          </div>

          <div class="rs-button-row">
            <button class="rs-secondary" data-action="rename">Rinomina</button>
            <button class="rs-danger" data-action="remove">Rimuovi</button>
          </div>
        ` : `
          <div class="rs-empty">
            <div class="rs-empty-symbol">＋</div>
            <strong>Slot ancora vuoto</strong>
            <span>Acquisisci il piatto che hai preparato.</span>
          </div>
        `}
      </section>

      <section class="rs-section">
        <div class="rs-section-heading">
          <h3>Metriche del piatto</h3>
          <span class="rs-tag">STIME</span>
        </div>
        ${current ? `
          <div class="rs-metric-grid">
            <div class="rs-metric">
              <span>Costo ingredienti</span>
              <strong>${money(stats.cost)}</strong>
            </div>
            <div class="rs-metric">
              <span>Prezzo suggerito</span>
              <strong>${money(stats.price)}</strong>
            </div>
            <div class="rs-metric">
              <span>Valutazione</span>
              <strong>${stats.rating.toFixed(1)}<small>/5</small></strong>
            </div>
            <div class="rs-metric">
              <span>Varietà</span>
              <strong>${stats.variety}<small> ingredienti</small></strong>
            </div>
          </div>
          <div class="rs-rating-track">
            <div style="width:${stats.rating / 5 * 100}%"></div>
          </div>
        ` : `
          <div class="rs-muted-box">Acquisisci un piatto per vedere le metriche.</div>
        `}
        <p class="rs-footnote">
          Costi, prezzi e valutazioni sono stime illustrative della mod, non
          valori ufficiali del gioco.
        </p>
      </section>

      <section class="rs-section">
        <div class="rs-section-heading">
          <h3>Risultati economici</h3>
          <span class="rs-tag">3 GIORNI</span>
        </div>

        <div class="rs-metric-grid">
          <div class="rs-metric">
            <span>Giorni completi</span>
            <strong>${getCompletedDays()}<small>/3</small></strong>
          </div>
          <div class="rs-metric">
            <span>Piatti acquisiti</span>
            <strong>${state.slots.filter(Boolean).length}<small>/6</small></strong>
          </div>
        </div>

        <button class="rs-primary" data-action="simulate">
          ▶ Simula il ristorante
        </button>

        ${sim ? `
          <div class="rs-results">
            <div class="rs-result-row">
              <span>Ricavi totali</span><strong>${money(sim.revenue)}</strong>
            </div>
            <div class="rs-result-row">
              <span>Costi totali</span><strong>${money(sim.cost)}</strong>
            </div>
            <div class="rs-result-row rs-profit">
              <span>Profitto netto</span>
              <strong class="${sim.profit >= 0 ? "positive" : "negative"}">
                ${money(sim.profit)}
              </strong>
            </div>
            <div class="rs-result-row">
              <span>Capitale finale</span><strong>${money(state.capital)}</strong>
            </div>

            <div class="rs-subheading rs-daily-heading">Riepilogo giornaliero</div>
            ${sim.days.map(day => `
              <div class="rs-daily">
                <div class="rs-daily-top">
                  <strong>Giorno ${day.day}</strong>
                  <strong class="${day.profit >= 0 ? "positive" : "negative"}">
                    ${money(day.profit)}
                  </strong>
                </div>
                <div class="rs-daily-detail">
                  Ricavi ${money(day.revenue)} · Costi ${money(day.cost)}
                </div>
              </div>
            `).join("")}
          </div>
        ` : `
          <div class="rs-muted-box">
            Completa i sei slot per calcolare ricavi, costi e profitto.
          </div>
        `}
      </section>

      <section class="rs-section rs-tools">
        <div class="rs-section-heading"><h3>Gestione dati</h3></div>
        <button class="rs-secondary rs-full" data-action="export">
          ↓ Esporta salvataggio JSON
        </button>
        <button class="rs-secondary rs-full" data-action="import">
          ↑ Importa salvataggio JSON
        </button>
        <button class="rs-danger rs-full" data-action="reset">
          Nuovo ristorante
        </button>
        <div class="rs-storage-note">Salvataggio automatico attivo nel browser.</div>
      </section>

      <footer class="rs-footer">RESTORATION SIMULATOR · R74N PLUS</footer>
    `;
  }

  function simulate() {
    const missing = state.slots
      .map((dish, i) => dish ? -1 : i)
      .filter(i => i >= 0);

    if (missing.length) {
      alert(
        "Prima di simulare, acquisisci tutti e sei i piatti.\n\nMancano: " +
        missing.map(i => `Giorno ${slots[i].day} ${slots[i].meal}`).join(", ")
      );
      return;
    }

    let revenue = 0;
    let cost = 0;

    const days = [0, 1, 2].map(day => {
      const lunch = evaluateDish(state.slots[day * 2]);
      const dinner = evaluateDish(state.slots[day * 2 + 1]);

      // Ipotesi modificabile: 10 porzioni vendute per piatto.
      const portions = 10;
      const dayRevenue = (lunch.price + dinner.price) * portions;
      const dayCost = (lunch.cost + dinner.cost) * portions;
      const profit = dayRevenue - dayCost;

      revenue += dayRevenue;
      cost += dayCost;

      return {
        day: day + 1,
        revenue: dayRevenue,
        cost: dayCost,
        profit
      };
    });

    const profit = revenue - cost;
    state.capital += profit;

    state.lastSimulation = {
      date: new Date().toISOString(),
      revenue,
      cost,
      profit,
      days
    };

    state.history.push(state.lastSimulation);
    persist();
    render();

    alert(
      "Simulazione completata!\n\n" +
      `Ricavi: ${money(revenue)}\n` +
      `Costi: ${money(cost)}\n` +
      `Profitto: ${money(profit)}\n` +
      `Capitale: ${money(state.capital)}`
    );
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "restoration-simulator-save.json";
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const data = JSON.parse(await file.text());

        if (!Array.isArray(data.slots) || data.slots.length !== 6) {
          throw new Error("Il file non contiene i sei slot richiesti.");
        }

        if (!Number.isFinite(data.capital)) {
          throw new Error("Il capitale nel file non è valido.");
        }

        if (!confirm("Vuoi sostituire i dati attuali con quelli del file?")) {
          return;
        }

        state = {
          capital: data.capital,
          slots: data.slots,
          history: Array.isArray(data.history) ? data.history : [],
          lastSimulation: data.lastSimulation || null
        };

        persist();
        selectedSlot = 0;
        render();
      } catch (error) {
        alert("Impossibile importare il file: " + error.message);
      }
    });

    input.click();
  }

  function handleAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button || !panel.contains(button)) return;

    switch (button.dataset.action) {
      case "collapse":
        setCollapsed(true);
        break;

      case "select":
        selectedSlot = Number(button.dataset.slot);
        render();
        break;

      case "capture": {
        try {
          const dish = captureCurrentDish();

          if (state.slots[selectedSlot] && !confirm(
            "Questo slot contiene già un piatto. Vuoi sostituirlo?"
          )) return;

          dish.name = state.slots[selectedSlot]?.name || "Piatto acquisito";
          state.slots[selectedSlot] = dish;

          persist();
          render();
        } catch (error) {
          alert(error.message || String(error));
        }
        break;
      }

      case "rename": {
        const dish = state.slots[selectedSlot];
        if (!dish) return;

        const name = prompt("Nome del piatto:", dish.name || "");
        if (name === null) return;

        dish.name = name.trim() || "Piatto acquisito";
        persist();
        render();
        break;
      }

      case "remove":
        if (!confirm("Rimuovere il piatto dallo slot selezionato?")) return;
        state.slots[selectedSlot] = null;
        persist();
        render();
        break;

      case "simulate":
        simulate();
        break;

      case "export":
        exportData();
        break;

      case "import":
        importData();
        break;

      case "reset":
        if (!confirm(
          "Vuoi azzerare slot, capitale e risultati del ristorante? " +
          "Questa operazione non modifica gli ingredienti di Infinite Chef."
        )) return;

        state = {
          capital: STARTING_CAPITAL,
          slots: Array(6).fill(null),
          history: [],
          lastSimulation: null
        };
        selectedSlot = 0;
        persist();
        render();
        break;
    }
  }

  function setCollapsed(value) {
    collapsed = value;
    if (panel) panel.style.display = collapsed ? "none" : "flex";
    if (tab) tab.style.display = collapsed ? "flex" : "none";
  }

  function mount() {
    if (destroyed || document.getElementById(MOD_ID + "-panel")) return;

    style = document.createElement("style");
    style.id = MOD_ID + "-style";
    style.textContent = `
      #${MOD_ID}-panel, #${MOD_ID}-panel *,
      #${MOD_ID}-tab, #${MOD_ID}-tab * { box-sizing: border-box; }

      #${MOD_ID}-panel {
        position: fixed; z-index: 999999; left: 0; top: 0; bottom: 0;
        width: 350px; max-width: 92vw; height: 100vh;
        display: flex; flex-direction: column; overflow-y: auto;
        background: #15191f; color: #eef2f7;
        border-right: 1px solid #39414d;
        box-shadow: 8px 0 32px #0005;
        padding: 16px 14px 20px;
        font: 13px/1.45 system-ui, -apple-system, sans-serif;
        scrollbar-width: thin; scrollbar-color: #47505e #1a1e25;
      }
      #${MOD_ID}-panel button, #${MOD_ID}-tab {
        font: inherit; cursor: pointer; color: inherit;
      }
      #${MOD_ID}-panel button:focus-visible, #${MOD_ID}-tab:focus-visible {
        outline: 2px solid #83b5ff; outline-offset: 2px;
      }
      #${MOD_ID}-panel button:hover { filter: brightness(1.12); }
      #${MOD_ID}-panel h2 { margin: 0; font-size: 21px; letter-spacing: -.4px; }
      #${MOD_ID}-panel h3 { margin: 0; font-size: 14px; font-weight: 700; }
      #${MOD_ID}-panel p { margin: 9px 0 12px; }

      #${MOD_ID}-panel .rs-header {
        display: flex; align-items: center; justify-content: space-between;
        gap: 10px; margin-bottom: 15px;
      }
      #${MOD_ID}-panel .rs-brand { display: flex; align-items: center; gap: 10px; }
      #${MOD_ID}-panel .rs-logo {
        width: 42px; height: 42px; flex: 0 0 42px;
        display: grid; place-items: center; border-radius: 12px;
        color: #c0f5d0; background: #244c36; font-size: 24px; font-weight: 800;
      }
      #${MOD_ID}-panel .rs-kicker {
        font-size: 9px; color: #9caabc; letter-spacing: 1.5px;
      }
      #${MOD_ID}-panel .rs-subtitle { font-size: 11px; color: #aab4c3; }
      #${MOD_ID}-panel .rs-icon-button {
        width: 32px; height: 32px; border-radius: 8px;
        border: 1px solid #424b59; background: #252b34; font-size: 21px;
      }

      #${MOD_ID}-panel .rs-capital {
        display: flex; justify-content: space-between; align-items: center;
        padding: 15px; border-radius: 12px; margin-bottom: 20px;
        border: 1px solid #31513e; background: linear-gradient(120deg,#203b2c,#202c2a);
      }
      #${MOD_ID}-panel .rs-label {
        color: #aab7c7; font-size: 9px; letter-spacing: 1px; font-weight: 700;
      }
      #${MOD_ID}-panel .rs-capital-value {
        font-size: 26px; font-weight: 800; letter-spacing: -.6px; margin-top: 4px;
      }
      #${MOD_ID}-panel .rs-capital-note { font-size: 10px; color: #afc4b6; }
      #${MOD_ID}-panel .rs-euro {
        display: grid; place-items: center; width: 42px; height: 42px;
        border-radius: 50%; border: 1px solid #4a795a;
        color: #aaf0bc; font-size: 23px; font-weight: 800;
      }

      #${MOD_ID}-panel .rs-section { margin: 0 0 20px; }
      #${MOD_ID}-panel .rs-section-heading {
        display: flex; justify-content: space-between; align-items: center;
        gap: 8px; margin-bottom: 10px;
      }
      #${MOD_ID}-panel .rs-counter, #${MOD_ID}-panel .rs-tag {
        border-radius: 6px; padding: 3px 7px; background: #29313b;
        color: #c3cbd6; font-size: 10px; font-weight: 700;
      }
      #${MOD_ID}-panel .rs-progress {
        height: 4px; border-radius: 8px; background: #303742; overflow: hidden;
        margin-bottom: 13px;
      }
      #${MOD_ID}-panel .rs-progress > div {
        height: 100%; background: #66d78e; transition: width .2s;
      }
      #${MOD_ID}-panel .rs-day { margin: 0 0 13px; }
      #${MOD_ID}-panel .rs-day-title {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 6px; font-size: 9px; letter-spacing: 1px;
        font-weight: 800; color: #a8b4c4;
      }
      #${MOD_ID}-panel .rs-day-done { color: #82e9a2; }
      #${MOD_ID}-panel .rs-day-pending { color: #8e99aa; }
      #${MOD_ID}-panel .rs-day-slots { display: grid; gap: 5px; }
      #${MOD_ID}-panel .rs-slot {
        display: flex; align-items: center; gap: 9px; width: 100%;
        text-align: left; padding: 9px; min-width: 0;
        background: #1d232b; border: 1px solid #333c48; border-radius: 9px;
      }
      #${MOD_ID}-panel .rs-slot.active {
        border-color: #6c9ee6; background: #202d40;
        box-shadow: inset 3px 0 #79aaff;
      }
      #${MOD_ID}-panel .rs-slot-check {
        flex: 0 0 21px; width: 21px; height: 21px; display: grid;
        place-items: center; border: 1px solid #515c6a; border-radius: 50%;
        color: transparent; font-weight: 900; font-size: 13px;
      }
      #${MOD_ID}-panel .rs-slot-check.checked {
        background: #244b34; color: #80f1a0; border-color: #4a9d65;
      }
      #${MOD_ID}-panel .rs-slot-info {
        display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 1px;
      }
      #${MOD_ID}-panel .rs-slot-meal { font-weight: 700; font-size: 12px; }
      #${MOD_ID}-panel .rs-slot-name {
        color: #aab4c3; font-size: 10px; overflow-wrap: anywhere;
      }
      #${MOD_ID}-panel .rs-slot-arrow { color: #8996a8; font-size: 20px; }

      #${MOD_ID}-panel .rs-card {
        padding: 13px; margin-bottom: 20px;
        background: #1b2028; border: 1px solid #353e4a; border-radius: 12px;
      }
      #${MOD_ID}-panel .rs-card-title {
        display: flex; justify-content: space-between; align-items: flex-start;
        gap: 8px; margin-bottom: 8px;
      }
      #${MOD_ID}-panel .rs-card-title h3 { margin-top: 3px; }
      #${MOD_ID}-panel .rs-status {
        padding: 4px 7px; border-radius: 20px; font-size: 9px;
        font-weight: 800; white-space: nowrap;
      }
      #${MOD_ID}-panel .rs-status.done { background: #254832; color: #9bf0b4; }
      #${MOD_ID}-panel .rs-status.pending { background: #303640; color: #c0c8d3; }
      #${MOD_ID}-panel .rs-help { font-size: 11px; color: #aab5c4; }
      #${MOD_ID}-panel .rs-primary {
        width: 100%; padding: 11px; border-radius: 9px;
        background: #286340; border: 1px solid #3b8857;
        color: #f2fff5; font-weight: 750; margin: 4px 0;
      }
      #${MOD_ID}-panel .rs-primary span { font-size: 16px; margin-right: 5px; }
      #${MOD_ID}-panel .rs-capture-info { margin-top: 10px; }
      #${MOD_ID}-panel .rs-info-row, #${MOD_ID}-panel .rs-result-row {
        display: flex; justify-content: space-between; gap: 10px;
        padding: 7px 0; border-bottom: 1px solid #303742;
      }
      #${MOD_ID}-panel .rs-info-row span, #${MOD_ID}-panel .rs-result-row span {
        color: #aab5c4; font-size: 11px;
      }
      #${MOD_ID}-panel .rs-info-row strong, #${MOD_ID}-panel .rs-result-row strong {
        text-align: right; font-size: 11px; overflow-wrap: anywhere;
      }
      #${MOD_ID}-panel .rs-subheading {
        font-size: 11px; font-weight: 800; color: #d8e0ea; margin-bottom: 8px;
      }
      #${MOD_ID}-panel .rs-ingredients { margin-top: 14px; }
      #${MOD_ID}-panel .rs-ingredient-row {
        display: flex; align-items: center; gap: 7px;
        padding: 6px 0; border-bottom: 1px solid #2d343e;
      }
      #${MOD_ID}-panel .rs-ingredient-row > span:nth-child(2) {
        flex: 1; overflow-wrap: anywhere; text-transform: capitalize;
      }
      #${MOD_ID}-panel .rs-ingredient-row strong { color: #c6d0de; font-size: 11px; }
      #${MOD_ID}-panel .rs-ingredient-dot {
        width: 6px; height: 6px; background: #79b6ff; border-radius: 50%;
      }
      #${MOD_ID}-panel .rs-button-row { display: flex; gap: 7px; margin-top: 12px; }
      #${MOD_ID}-panel .rs-secondary, #${MOD_ID}-panel .rs-danger {
        padding: 8px 10px; border-radius: 8px; border: 1px solid #434d5a;
        background: #282e38; font-size: 11px;
      }
      #${MOD_ID}-panel .rs-danger {
        color: #ffb4b4; background: #39262a; border-color: #694047;
      }
      #${MOD_ID}-panel .rs-empty {
        display: flex; flex-direction: column; align-items: center;
        text-align: center; padding: 20px 6px 8px; gap: 5px;
      }
      #${MOD_ID}-panel .rs-empty-symbol {
        width: 35px; height: 35px; border: 1px dashed #586474;
        border-radius: 50%; display: grid; place-items: center;
        font-size: 20px; color: #9fadc0; margin-bottom: 3px;
      }
      #${MOD_ID}-panel .rs-empty strong { font-size: 12px; }
      #${MOD_ID}-panel .rs-empty span { font-size: 10px; color: #9eabba; }

      #${MOD_ID}-panel .rs-metric-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 7px;
      }
      #${MOD_ID}-panel .rs-metric {
        padding: 10px; background: #202630; border: 1px solid #303945;
        border-radius: 9px; min-width: 0;
      }
      #${MOD_ID}-panel .rs-metric > span {
        display: block; color: #aab5c4; font-size: 10px; margin-bottom: 5px;
      }
      #${MOD_ID}-panel .rs-metric > strong {
        display: block; font-size: 18px; overflow-wrap: anywhere;
      }
      #${MOD_ID}-panel .rs-metric small {
        font-size: 10px; font-weight: 500; color: #9eabba; margin-left: 3px;
      }
      #${MOD_ID}-panel .rs-rating-track {
        height: 5px; background: #303742; border-radius: 10px;
        overflow: hidden; margin-top: 9px;
      }
      #${MOD_ID}-panel .rs-rating-track > div {
        height: 100%; background: #8ad7a1; border-radius: 10px;
      }
      #${MOD_ID}-panel .rs-footnote, #${MOD_ID}-panel .rs-storage-note {
        color: #8995a5; font-size: 10px; margin-top: 9px;
      }
      #${MOD_ID}-panel .rs-muted-box {
        padding: 11px; background: #202630; border-radius: 8px;
        color: #a5b0bf; font-size: 11px; margin-top: 8px;
      }
      #${MOD_ID}-panel .rs-results { margin-top: 10px; }
      #${MOD_ID}-panel .rs-profit { margin-top: 2px; }
      #${MOD_ID}-panel .positive { color: #88e9a4 !important; }
      #${MOD_ID}-panel .negative { color: #ff9b9b !important; }
      #${MOD_ID}-panel .rs-daily-heading { margin-top: 15px; }
      #${MOD_ID}-panel .rs-daily {
        padding: 10px; background: #202630; border-radius: 8px; margin-top: 7px;
      }
      #${MOD_ID}-panel .rs-daily-top {
        display: flex; justify-content: space-between; gap: 8px; font-size: 11px;
      }
      #${MOD_ID}-panel .rs-daily-detail {
        margin-top: 5px; color: #a7b2c1; font-size: 10px;
      }
      #${MOD_ID}-panel .rs-tools { display: flex; flex-direction: column; gap: 7px; }
      #${MOD_ID}-panel .rs-full { width: 100%; text-align: left; }
      #${MOD_ID}-panel .rs-footer {
        margin-top: auto; padding-top: 15px; text-align: center;
        color: #727f91; font-size: 9px; letter-spacing: 1px;
      }

      #${MOD_ID}-tab {
        position: fixed; z-index: 999999; left: 0; top: 38%;
        display: none; flex-direction: column; align-items: center; gap: 7px;
        padding: 12px 9px; border-radius: 0 10px 10px 0;
        border: 1px solid #477356; background: #203d2c; color: #b7f3c5;
        box-shadow: 4px 4px 18px #0005; font-weight: 800;
      }
      #${MOD_ID}-tab .rs-tab-symbol { font-size: 21px; }
      #${MOD_ID}-tab .rs-tab-label {
        writing-mode: vertical-rl; transform: rotate(180deg);
        font-size: 10px; letter-spacing: 1px;
      }

      @media (max-width: 500px) {
        #${MOD_ID}-panel { width: min(350px, 94vw); }
      }
    `;
    document.head.appendChild(style);

    panel = document.createElement("aside");
    panel.id = MOD_ID + "-panel";
    panel.setAttribute("aria-label", "Restoration Simulator");
    document.body.appendChild(panel);
    panel.addEventListener("click", handleAction);

    tab = document.createElement("button");
    tab.id = MOD_ID + "-tab";
    tab.type = "button";
    tab.setAttribute("aria-label", "Apri Restoration Simulator");
    tab.innerHTML = '<span class="rs-tab-symbol">R</span><span class="rs-tab-label">RISTORANTE</span>';
    tab.addEventListener("click", () => setCollapsed(false));
    document.body.appendChild(tab);

    render();
  }

  function destroy() {
    destroyed = true;
    panel?.remove();
    tab?.remove();
    style?.remove();
  }

  window[MOD_ID] = {
    captureCurrentDish,
    getState: () => JSON.parse(JSON.stringify(state)),
    render,
    destroy,
    setCollapsed
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }

  console.log("[Restoration Simulator] Pannello laterale sinistro caricato.");
})();
