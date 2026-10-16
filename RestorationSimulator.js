
(() => {
  "use strict";

  // Restoration Simulator — Infinite Chef R74n Plus
  // 3 giorni, 2 piatti al giorno, acquisizione non distruttiva.

  const MOD_ID = "restoration-simulator-v2";
  const SAVE_KEY = "restorationSimulatorSave_v2";
  const STARTING_CAPITAL = 1000;

  if (window[MOD_ID]?.destroy) {
    window[MOD_ID].destroy();
  }

  let selectedSlot = 0;
  let state = loadState();
  let panel;
  let style;
  let destroyed = false;

  const slots = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    day: Math.floor(i / 2) + 1,
    meal: i % 2 === 0 ? "Pranzo" : "Cena"
  }));

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (saved && Array.isArray(saved.slots) &&
          saved.slots.length === 6) {
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
      console.error("[Restoration Simulator] Impossibile salvare:", e);
      alert("Salvataggio non riuscito. Controlla lo spazio disponibile nel browser.");
    }
  }

  function money(value) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2
    }).format(value);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[ch]);
  }

  // Copia solo dati semplici: mai riferimenti agli oggetti originali.
  function captureCurrentDish() {
    const view = window.currentView;
    const viewData = window.viewData;
    const total = viewData?.[view]?.total;

    if (!Array.isArray(total)) {
      throw new Error(
        "Non riesco a leggere il piano di lavoro. " +
        "Assicurati che Infinite Chef sia aperto normalmente."
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

    if (items.length === 0) {
      throw new Error(
        "Il piano di lavoro non contiene ingredienti visibili da acquisire."
      );
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
      recipeURL:
        typeof window.generateRecipeURL === "function"
          ? window.generateRecipeURL()
          : null
    };
  }

  function ingredientCost(id) {
    const name = String(id).toLowerCase();

    const expensive = [
      "lobster", "crab", "caviar", "truffle", "saffron",
      "wagyu", "gold", "ruby", "uni", "oyster"
    ];

    const premium = [
      "salmon", "steak", "beef", "pork", "lamb", "shrimp",
      "prawn", "cheese", "chocolate", "mozzarella", "tuna"
    ];

    const staples = [
      "flour", "water", "salt", "sugar", "rice", "bread",
      "dough", "oil", "egg", "potato", "onion"
    ];

    if (expensive.some(word => name.includes(word))) return 8;
    if (premium.some(word => name.includes(word))) return 4;
    if (staples.some(word => name.includes(word))) return 0.6;
    if (/fruit|vegetable|tomato|lettuce|bean|pea/.test(name)) return 1.2;

    return 1.8;
  }

  function evaluateDish(dish) {
    const items = dish?.items || [];
    const counts = dish?.counts || {};
    const ingredientNames = Object.keys(counts);
    const quantity = items.length;

    const ingredientCostTotal = items.reduce(
      (sum, item) => sum + ingredientCost(item.id),
      0
    );

    const variety = ingredientNames.length;
    const complexity = Math.min(10, variety * 1.2 + quantity * 0.3);
    const balance = quantity >= 2 && variety >= 2
      ? Math.min(10, 5 + variety * 0.45)
      : 3;

    // Stima indicativa, non prezzi ufficiali del gioco.
    const price = Math.max(
      5,
      Math.round((ingredientCostTotal * 2.7 + variety * 2.5 + 4) * 100) / 100
    );

    const estimatedRating = Math.max(1, Math.min(5,
      Math.round((balance * 0.55 + complexity * 0.45) / 2 * 10) / 10
    ));

    return {
      quantity,
      variety,
      ingredientCost: ingredientCostTotal,
      price,
      rating: estimatedRating,
      balance,
      complexity
    };
  }

  function getDishName(dish) {
    if (!dish) return "Slot vuoto";

    const names = Object.keys(dish.counts || {});
    if (names.length === 0) return "Piatto acquisito";

    const shown = names.slice(0, 3).join(" + ");
    return names.length > 3 ? shown + " +" : shown;
  }

  function render() {
    if (!panel || destroyed) return;

    const current = state.slots[selectedSlot];
    const currentStats = current ? evaluateDish(current) : null;
    const simulation = state.lastSimulation;

    panel.innerHTML = `
      <div class="rs-header">
        <div>
          <div class="rs-eyebrow">INFINITE CHEF · RISTORANTE</div>
          <h2>Restoration Simulator</h2>
          <div class="rs-muted">3 giorni · 6 piatti · acquisizione manuale</div>
        </div>
        <button class="rs-close" data-action="close" title="Chiudi">×</button>
      </div>

      <div class="rs-capital">
        <div>
          <div class="rs-muted">Capitale disponibile</div>
          <strong>${money(state.capital)}</strong>
        </div>
        <div class="rs-capital-icon">€</div>
      </div>

      <h3>Menu del ristorante</h3>
      <div class="rs-slots">
        ${slots.map(slot => {
          const dish = state.slots[slot.id];
          return `
            <button class="rs-slot ${selectedSlot === slot.id ? "selected" : ""}"
              data-action="select" data-slot="${slot.id}">
              <span class="rs-slot-top">
                <span>Giorno ${slot.day}</span>
                <span class="${dish ? "rs-check" : "rs-empty"}">
                  ${dish ? "✓" : "○"}
                </span>
              </span>
              <strong>${slot.meal}</strong>
              <span class="rs-slot-name">${escapeHTML(getDishName(dish))}</span>
              <span class="rs-slot-status">${dish ? "Acquisito" : "Da acquisire"}</span>
            </button>`;
        }).join("")}
      </div>

      <div class="rs-card">
        <div class="rs-card-heading">
          <div>
            <div class="rs-muted">Slot selezionato</div>
            <h3>Giorno ${slots[selectedSlot].day} · ${slots[selectedSlot].meal}</h3>
          </div>
          <span class="${current ? "rs-badge-done" : "rs-badge-pending"}">
            ${current ? "✓ Confermato" : "Da completare"}
          </span>
        </div>

        <p class="rs-muted">
          Prepara il piatto nel gioco, poi acquisiscilo. L'acquisizione
          copia i dati e non sposta gli ingredienti originali.
        </p>

        <button class="rs-primary" data-action="capture">
          ⊕ Acquisisci piatto corrente
        </button>

        ${current ? `
          <div class="rs-dish-details">
            <div class="rs-detail-row">
              <span>Ingredienti acquisiti</span>
              <strong>${current.items.length}</strong>
            </div>
            <div class="rs-detail-row">
              <span>Ingredienti distinti</span>
              <strong>${currentStats.variety}</strong>
            </div>
            <div class="rs-detail-row">
              <span>Vista di gioco</span>
              <strong>${escapeHTML(current.view)}</strong>
            </div>
            <div class="rs-detail-row">
              <span>Costo stimato per porzione</span>
              <strong>${money(currentStats.ingredientCost)}</strong>
            </div>
            <div class="rs-detail-row">
              <span>Prezzo suggerito</span>
              <strong>${money(currentStats.price)}</strong>
            </div>
            <div class="rs-detail-row">
              <span>Valutazione stimata</span>
              <strong>${currentStats.rating.toFixed(1)} / 5</strong>
            </div>
            <div class="rs-ingredients">
              <strong>Ingredienti del piatto</strong>
              <ul>
                ${Object.entries(current.counts || {}).map(([name, count]) =>
                  `<li>${escapeHTML(name)}${count > 1 ? ` × ${count}` : ""}</li>`
                ).join("")}
              </ul>
            </div>
            <div class="rs-actions">
              <button class="rs-secondary" data-action="rename">
                Rinomina piatto
              </button>
              <button class="rs-danger" data-action="remove">
                Rimuovi dallo slot
              </button>
            </div>
          </div>
        ` : `
          <div class="rs-empty-state">
            <span>＋</span>
            <strong>Nessun piatto acquisito</strong>
            <p>Seleziona questo slot e acquisisci il piatto dal piano di lavoro.</p>
          </div>
        `}
      </div>

      <div class="rs-card">
        <h3>Simulazione economica</h3>
        <p class="rs-muted">
          Le cifre sono stime del simulatore, non dati economici ufficiali di Infinite Chef.
          La simulazione considera due piatti per giorno.
        </p>

        <div class="rs-metrics">
          <div class="rs-metric">
            <span>Slot completati</span>
            <strong>${state.slots.filter(Boolean).length} / 6</strong>
          </div>
          <div class="rs-metric">
            <span>Giorni pronti</span>
            <strong>${[0, 1, 2].filter(d =>
              state.slots[d * 2] && state.slots[d * 2 + 1]
            ).length} / 3</strong>
          </div>
        </div>

        <button class="rs-primary" data-action="simulate">
          ▶ Simula i 3 giorni
        </button>

        ${simulation ? `
          <div class="rs-results">
            <h3>Ultimo risultato</h3>
            <div class="rs-detail-row">
              <span>Ricavi totali</span>
              <strong>${money(simulation.revenue)}</strong>
            </div>
            <div class="rs-detail-row">
              <span>Costi totali</span>
              <strong>${money(simulation.cost)}</strong>
            </div>
            <div class="rs-detail-row">
              <span>Profitto netto</span>
              <strong class="${simulation.profit >= 0 ? "rs-positive" : "rs-negative"}">
                ${money(simulation.profit)}
              </strong>
            </div>
            <div class="rs-detail-row">
              <span>Capitale dopo la simulazione</span>
              <strong>${money(state.capital)}</strong>
            </div>
            ${simulation.days.map(day => `
              <div class="rs-day-result">
                <strong>Giorno ${day.day}</strong>
                <span>Ricavi ${money(day.revenue)} · Costi ${money(day.cost)}</span>
                <span>Profitto ${money(day.profit)}</span>
              </div>
            `).join("")}
          </div>
        ` : ""}

        <div class="rs-actions">
          <button class="rs-secondary" data-action="export">Esporta dati JSON</button>
          <button class="rs-secondary" data-action="reset">Nuovo ristorante</button>
        </div>
      </div>

      <div class="rs-footer">
        I piatti acquisiti e il capitale vengono salvati in questo browser.
      </div>
    `;
  }

  function simulate() {
    const missing = state.slots
      .map((dish, i) => dish ? null : i)
      .filter(i => i !== null);

    if (missing.length) {
      alert(
        "Completa tutti e sei gli slot prima di simulare.\n" +
        "Slot mancanti: " +
        missing.map(i => `G${slots[i].day} ${slots[i].meal}`).join(", ")
      );
      return;
    }

    let revenue = 0;
    let cost = 0;

    const days = [0, 1, 2].map(day => {
      const lunch = evaluateDish(state.slots[day * 2]);
      const dinner = evaluateDish(state.slots[day * 2 + 1]);

      // Stima di 10 porzioni vendute per piatto.
      const portionsPerDish = 10;
      const dayRevenue = (lunch.price + dinner.price) * portionsPerDish;
      const dayCost = (
        lunch.ingredientCost + dinner.ingredientCost
      ) * portionsPerDish;

      const dayProfit = dayRevenue - dayCost;
      revenue += dayRevenue;
      cost += dayCost;

      return {
        day: day + 1,
        revenue: dayRevenue,
        cost: dayCost,
        profit: dayProfit
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
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "restoration-simulator-save.json";
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button || !panel.contains(button)) return;

    const action = button.dataset.action;

    if (action === "close") {
      panel.style.display = "none";
      return;
    }

    if (action === "select") {
      selectedSlot = Number(button.dataset.slot);
      render();
      return;
    }

    if (action === "capture") {
      try {
        const dish = captureCurrentDish();
        const previous = state.slots[selectedSlot];

        if (previous && !confirm(
          "Questo slot contiene già un piatto. Vuoi sostituirlo?"
        )) return;

        dish.name = previous?.name || "Piatto acquisito";
        state.slots[selectedSlot] = dish;
        persist();
        render();
      } catch (error) {
        alert(error.message || String(error));
      }
      return;
    }

    if (action === "rename") {
      const dish = state.slots[selectedSlot];
      if (!dish) return;

      const name = prompt("Nome del piatto:", dish.name || "");
      if (name === null) return;

      dish.name = name.trim() || "Piatto acquisito";
      persist();
      render();
      return;
    }

    if (action === "remove") {
      if (!confirm("Vuoi rimuovere il piatto da questo slot?")) return;

      state.slots[selectedSlot] = null;
      persist();
      render();
      return;
    }

    if (action === "simulate") {
      simulate();
      return;
    }

    if (action === "export") {
      exportData();
      return;
    }

    if (action === "reset") {
      if (!confirm(
        "Vuoi iniziare un nuovo ristorante? " +
        "Gli slot, il capitale e lo storico di questa mod verranno azzerati."
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
    }
  }

  function mount() {
    if (destroyed || document.getElementById(MOD_ID + "-panel")) return;

    style = document.createElement("style");
    style.id = MOD_ID + "-style";
    style.textContent = `
      #${MOD_ID}-panel {
        position: fixed; right: 16px; bottom: 16px; z-index: 999999;
        width: min(440px, calc(100vw - 24px));
        max-height: min(88vh, 900px); overflow-y: auto;
        background: #171a20; color: #f2f4f8;
        border: 1px solid #454b57; border-radius: 16px;
        box-shadow: 0 12px 48px #0009;
        padding: 16px; font: 14px/1.45 system-ui, sans-serif;
      }
      #${MOD_ID}-panel * { box-sizing: border-box; }
      #${MOD_ID}-panel h2 { font-size: 21px; margin: 2px 0 3px; }
      #${MOD_ID}-panel h3 { font-size: 16px; margin: 0 0 10px; }
      #${MOD_ID}-panel p { margin: 9px 0 12px; }
      #${MOD_ID}-panel button {
        cursor: pointer; font: inherit; border-radius: 9px;
        padding: 9px 11px; border: 1px solid #505866;
        color: #f6f7fa; background: #292e38;
      }
      #${MOD_ID}-panel button:hover { filter: brightness(1.13); }
      #${MOD_ID}-panel button:focus-visible {
        outline: 2px solid #85b8ff; outline-offset: 2px;
      }
      #${MOD_ID}-panel .rs-header {
        display: flex; justify-content: space-between; gap: 12px;
        align-items: flex-start; margin-bottom: 14px;
      }
      #${MOD_ID}-panel .rs-eyebrow {
        font-size: 10px; letter-spacing: 1.2px; color: #a7b3c8;
      }
      #${MOD_ID}-panel .rs-muted { color: #b0b8c6; font-size: 12px; }
      #${MOD_ID}-panel .rs-close {
        font-size: 23px; line-height: 1; padding: 5px 10px;
      }
      #${MOD_ID}-panel .rs-capital {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px; background: #222831; border-radius: 12px;
        margin-bottom: 17px;
      }
      #${MOD_ID}-panel .rs-capital strong {
        display: block; font-size: 25px; margin-top: 3px;
      }
      #${MOD_ID}-panel .rs-capital-icon {
        width: 42px; height: 42px; display: grid; place-items: center;
        border-radius: 50%; background: #314b3d; color: #a9efbd;
        font-size: 23px; font-weight: 700;
      }
      #${MOD_ID}-panel .rs-slots {
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px; margin: 10px 0 15px;
      }
      #${MOD_ID}-panel .rs-slot {
        display: flex; flex-direction: column; align-items: stretch;
        text-align: left; min-width: 0; gap: 3px; padding: 10px;
      }
      #${MOD_ID}-panel .rs-slot.selected {
        border-color: #82b2ff; box-shadow: inset 0 0 0 1px #82b2ff;
      }
      #${MOD_ID}-panel .rs-slot-top {
        display: flex; justify-content: space-between;
        font-size: 11px; color: #bdc6d5;
      }
      #${MOD_ID}-panel .rs-slot-name {
        overflow-wrap: anywhere; font-size: 12px;
      }
      #${MOD_ID}-panel .rs-slot-status { color: #aab3c2; font-size: 11px; }
      #${MOD_ID}-panel .rs-check {
        color: #73e59a; font-weight: 800; font-size: 16px;
      }
      #${MOD_ID}-panel .rs-empty { color: #9098a7; font-size: 16px; }
      #${MOD_ID}-panel .rs-card {
        border: 1px solid #383f4b; border-radius: 12px;
        padding: 13px; margin: 13px 0;
      }
      #${MOD_ID}-panel .rs-card-heading {
        display: flex; justify-content: space-between; align-items: flex-start;
        gap: 8px; margin-bottom: 8px;
      }
      #${MOD_ID}-panel .rs-badge-done,
      #${MOD_ID}-panel .rs-badge-pending {
        font-size: 11px; white-space: nowrap; border-radius: 20px;
        padding: 4px 7px;
      }
      #${MOD_ID}-panel .rs-badge-done {
        background: #244633; color: #9df0b5;
      }
      #${MOD_ID}-panel .rs-badge-pending {
        background: #393d46; color: #c7cbd3;
      }
      #${MOD_ID}-panel .rs-primary {
        width: 100%; background: #24583b; border-color: #3d8059;
        font-weight: 700; margin: 5px 0;
      }
      #${MOD_ID}-panel .rs-secondary { background: #292e38; }
      #${MOD_ID}-panel .rs-danger {
        background: #49282d; border-color: #75434a;
      }
      #${MOD_ID}-panel .rs-actions {
        display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px;
      }
      #${MOD_ID}-panel .rs-detail-row {
        display: flex; justify-content: space-between; gap: 10px;
        padding: 7px 0; border-bottom: 1px solid #343a45;
      }
      #${MOD_ID}-panel .rs-detail-row span { color: #bac2cf; }
      #${MOD_ID}-panel .rs-detail-row strong { text-align: right; }
      #${MOD_ID}-panel .rs-ingredients { margin-top: 12px; }
      #${MOD_ID}-panel .rs-ingredients ul {
        padding-left: 20px; margin-bottom: 0; overflow-wrap: anywhere;
      }
      #${MOD_ID}-panel .rs-empty-state {
        display: grid; place-items: center; text-align: center;
        padding: 20px 10px; color: #bac2cf;
      }
      #${MOD_ID}-panel .rs-empty-state > span {
        font-size: 26px; margin-bottom: 5px;
      }
      #${MOD_ID}-panel .rs-empty-state p { font-size: 12px; }
      #${MOD_ID}-panel .rs-metrics {
        display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
        margin: 12px 0;
      }
      #${MOD_ID}-panel .rs-metric {
        background: #222831; border-radius: 9px; padding: 10px;
      }
      #${MOD_ID}-panel .rs-metric span {
        display: block; color: #b0b8c6; font-size: 11px;
      }
      #${MOD_ID}-panel .rs-metric strong { display: block; font-size: 19px; }
      #${MOD_ID}-panel .rs-results { margin-top: 14px; }
      #${MOD_ID}-panel .rs-positive { color: #8de6a7; }
      #${MOD_ID}-panel .rs-negative { color: #ff9a9a; }
      #${MOD_ID}-panel .rs-day-result {
        display: flex; flex-direction: column; gap: 3px;
        padding: 9px; margin-top: 8px; border-radius: 8px;
        background: #222831; font-size: 12px;
      }
      #${MOD_ID}-panel .rs-footer {
        color: #8f98a8; font-size: 10px; text-align: center;
        padding: 5px 0 0;
      }
      @media (max-width: 520px) {
        #${MOD_ID}-panel {
          right: 6px; bottom: 6px;
          width: calc(100vw - 12px); max-height: 91vh; padding: 12px;
        }
      }
    `;

    document.head.appendChild(style);

    panel = document.createElement("section");
    panel.id = MOD_ID + "-panel";
    panel.setAttribute("aria-label", "Restoration Simulator");
    document.body.appendChild(panel);
    panel.addEventListener("click", handleAction);

    render();
  }

  function destroy() {
    destroyed = true;
    panel?.remove();
    style?.remove();
  }

  window[MOD_ID] = {
    captureCurrentDish,
    getState: () => JSON.parse(JSON.stringify(state)),
    render,
    destroy
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }

  console.log("[Restoration Simulator] Mod caricata.");
})();
