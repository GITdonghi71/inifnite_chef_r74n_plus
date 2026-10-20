
/*
 * MasterchefSimulator.js
 * Infinite Chef R74n Plus
 *
 * Torneo MasterChef:
 * - 5 concorrenti iniziali
 * - 4 manche da 3 giornate
 * - 6 piatti per concorrente a ogni manche
 * - 1 eliminazione nelle prime 3 manche
 * - Finale tra i 2 concorrenti rimasti
 *
 * Dipendenza: restoration_sim.js caricato nella stessa pagina.
 *
 * IMPORTANTE:
 * I concorrenti virtuali usano esclusivamente piatti acquisiti nei
 * 6 slot di Restoration Simulator. Gli ID degli ingredienti non vengono
 * filtrati per nome, tipo o provenienza: sono conservati anche quelli
 * derivati e aggiunti da altre mod.
 *
 * Questo modulo non inventa ricette e non modifica i piatti salvati.
 * I punteggi virtuali sono simulazioni d'intrattenimento, non risultati
 * ufficiali o profitti reali.
 */

(() => {
  "use strict";

  const MOD_ID = "masterchef-simulator";
  const SAVE_KEY = "masterchefSimulatorSave_v2";
  const RESTORATION_ID = "restoration-simulator-v3";

  if (window[MOD_ID]?.destroy) {
    window[MOD_ID].destroy();
  }

  const CHEFS = [
    { id: "player", name: "Tu", human: true, skill: 0 },
    { id: "chef_amelia", name: "Amelia Rossi", skill: 0.18 },
    { id: "chef_marco", name: "Marco Bellini", skill: 0.08 },
    { id: "chef_sofia", name: "Sofia Moretti", skill: 0.14 },
    { id: "chef_luca", name: "Luca Ferri", skill: 0.04 }
  ];

  let panel = null;
  let style = null;
  let destroyed = false;
  let state = loadState();

  // ------------------------------------------------------------
  // Stato e salvataggio
  // ------------------------------------------------------------

  function newTournament() {
    return {
      round: 1,
      finished: false,
      winner: null,
      lastProcessedSimulation: null,
      rounds: [],
      contestants: CHEFS.map(chef => ({
        ...chef,
        active: true,
        totalScore: 0,
        eliminatedRound: null,
        history: []
      }))
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));

      if (
        saved &&
        Array.isArray(saved.rounds) &&
        Array.isArray(saved.contestants) &&
        saved.contestants.length === 5
      ) {
        return saved;
      }
    } catch (error) {
      console.warn("[MasterChef] Salvataggio non leggibile.", error);
    }

    return newTournament();
  }

  function saveState() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("[MasterChef] Errore nel salvataggio.", error);
    }
  }

  // ------------------------------------------------------------
  // Utilità
  // ------------------------------------------------------------

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function money(value) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2
    }).format(Number(value) || 0);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomBetween(min, max) {
    return Math.round((min + Math.random() * (max - min)) * 100) / 100;
  }

  function getRestoration() {
    const api = window[RESTORATION_ID];

    if (!api || typeof api.getState !== "function") {
      throw new Error(
        "Restoration Simulator non trovato. " +
        "Carica prima restoration_sim.js."
      );
    }

    return api.getState();
  }

  // ------------------------------------------------------------
  // Ingredienti e piatti reali
  // ------------------------------------------------------------

  /*
   * Questa funzione legge il contenuto acquisito da Restoration.
   * Non confronta gli ID con una lista di ingredienti conosciuti:
   * ogni ID presente in counts viene conservato.
   */
  function getDishIngredients(dish) {
    if (!dish || typeof dish !== "object") {
      return [];
    }

    const ids = new Set();

    if (dish.counts && typeof dish.counts === "object") {
      for (const id of Object.keys(dish.counts)) {
        if (id) ids.add(String(id));
      }
    }

    if (Array.isArray(dish.items)) {
      for (const item of dish.items) {
        if (item && item.id) {
          ids.add(String(item.id));
        }
      }
    }

    return [...ids];
  }

  /*
   * Valutazione indicativa d'intrattenimento basata sulla varietà
   * e sulla quantità dei componenti del piatto acquisito.
   *
   * Non dichiara che una combinazione sia una ricetta valida:
   * il piatto deve essere già presente in Restoration Simulator.
   */
  function scoreDish(dish) {
    const items = Array.isArray(dish?.items) ? dish.items : [];
    const ingredients = getDishIngredients(dish);
    const variety = ingredients.length;
    const quantity = items.length;

    if (variety === 0 || quantity === 0) {
      return 1;
    }

    const complexity = Math.min(
      10,
      variety * 1.2 + quantity * 0.3
    );

    const balance = quantity >= 2 && variety >= 2
      ? Math.min(10, 5 + variety * 0.45)
      : 3;

    return clamp(
      Math.round(
        ((balance * 0.55 + complexity * 0.45) / 2) * 10
      ) / 10,
      1,
      5
    );
  }

  function dishDisplayName(dish, index) {
    if (dish?.name && dish.name !== "Piatto acquisito") {
      return String(dish.name);
    }

    const ingredients = getDishIngredients(dish);

    if (ingredients.length) {
      return ingredients.slice(0, 3).join(" + ");
    }

    return `Piatto acquisito ${index + 1}`;
  }

  function validateRestorationSlots(restorationState) {
    const slots = restorationState?.slots;

    if (
      !Array.isArray(slots) ||
      slots.length !== 6 ||
      slots.some(slot =>
        !slot ||
        !Array.isArray(slot.items) ||
        !slot.counts ||
        getDishIngredients(slot).length === 0
      )
    ) {
      throw new Error(
        "Per svolgere una manche servono 6 piatti validi nei sei slot " +
        "di Restoration Simulator. Acquisisci i piatti e controlla che " +
        "ciascuno contenga ingredienti."
      );
    }

    return slots;
  }

  function averageRecipeScore(slots) {
    const ratings = slots.map(scoreDish);

    return ratings.reduce((sum, score) => sum + score, 0) /
      ratings.length;
  }

  // ------------------------------------------------------------
  // Punteggio del giocatore
  // ------------------------------------------------------------

  function scoreHuman(restorationState) {
    const slots = validateRestorationSlots(restorationState);
    const simulation = restorationState.lastSimulation;

    if (
      !simulation ||
      !simulation.date ||
      simulation.date === state.lastProcessedSimulation
    ) {
      throw new Error(
        "Non trovo una nuova simulazione di Restoration Simulator. " +
        "Completa i sei piatti e premi «Simula il ristorante» prima " +
        "di registrare la manche."
      );
    }

    const average = averageRecipeScore(slots);
    const profit = Number(simulation.profit) || 0;
    const capital = Number(restorationState.capital) || 0;

    const qualityPoints = (average / 5) * 65;
    const economyPoints = clamp(15 + profit / 1000 * 15, 0, 35);

    const score = Math.round(
      clamp(qualityPoints + economyPoints, 0, 100) * 100
    ) / 100;

    const dishes = slots.map((dish, index) => ({
      name: dishDisplayName(dish, index),
      rating: scoreDish(dish),
      ingredients: getDishIngredients(dish)
    }));

    return {
      score,
      averageRating: Math.round(average * 100) / 100,
      profit,
      capital,
      dishes,
      simulationDate: simulation.date
    };
  }

  // ------------------------------------------------------------
  // Concorrenti virtuali
  // ------------------------------------------------------------

  /*
   * I menu virtuali sono costruiti scegliendo tra i sei piatti reali
   * acquisiti in Restoration Simulator.
   *
   * Non vengono creati nomi di ricette inventati, ingredienti fittizi
   * o combinazioni arbitrarie di ID.
   *
   * Un piatto può essere selezionato più di una volta: ogni concorrente
   * simula il proprio menu usando i piatti disponibili.
   */
  function virtualMenu(restorationState, chef) {
    const slots = validateRestorationSlots(restorationState);
    const menu = [];

    for (let i = 0; i < 6; i++) {
      const index = Math.floor(Math.random() * slots.length);
      const source = slots[index];

      // Copia i dati usati dal simulatore; non modifica lo stato originale.
      const copiedDish = {
        name: dishDisplayName(source, index),
        items: source.items.map(item => ({ ...item })),
        counts: { ...source.counts }
      };

      const baseRating = scoreDish(copiedDish);
      const rating = clamp(
        baseRating + chef.skill + randomBetween(-0.25, 0.25),
        1,
        5
      );

      menu.push({
        name: copiedDish.name,
        ingredients: getDishIngredients(copiedDish),
        rating: Math.round(rating * 100) / 100
      });
    }

    return menu;
  }

  function scoreVirtualChef(chef, restorationState) {
    const dishes = virtualMenu(restorationState, chef);

    const average = dishes.reduce(
      (sum, dish) => sum + dish.rating,
      0
    ) / dishes.length;

    /*
     * Economia virtuale: è solo un valore simulato per il torneo.
     * Non viene scritto in Restoration Simulator e non ne modifica
     * il capitale, lo storico o le simulazioni.
     */
    const profit = Math.round(randomBetween(250, 1800));
    const capital = 1000 + profit;
    const economyPoints = clamp(15 + profit / 1000 * 15, 0, 35);

    const score = Math.round(
      clamp((average / 5) * 65 + economyPoints, 0, 100) * 100
    ) / 100;

    return {
      score,
      averageRating: Math.round(average * 100) / 100,
      profit,
      capital,
      dishes
    };
  }

  // ------------------------------------------------------------
  // Gestione delle manche e delle eliminazioni
  // ------------------------------------------------------------

  function registerRound() {
    if (state.finished) {
      alert(
        "Il torneo è già terminato. Avvia un nuovo torneo per ricominciare."
      );
      return;
    }

    if (state.round > 4) {
      return;
    }

    const player = state.contestants.find(
      chef => chef.id === "player"
    );

    const activeVirtuals = state.contestants.some(
      chef => chef.active && !chef.human
    );

    let restorationState = null;
    let playerResult = null;

    /*
     * Se è ancora in gara, il giocatore deve avere una nuova
     * simulazione Restoration per ogni manche.
     *
     * I virtual chef usano invece i sei piatti già acquisiti.
     */
    if ((player?.active) || activeVirtuals) {
      try {
        restorationState = getRestoration();

        if (activeVirtuals) {
          validateRestorationSlots(restorationState);
        }

        if (player?.active) {
          playerResult = scoreHuman(restorationState);
        }
      } catch (error) {
        alert(error.message || String(error));
        return;
      }
    }

    const roundNumber = state.round;
    const results = [];

    for (const chef of state.contestants) {
      if (!chef.active) continue;

      const result = chef.human
        ? playerResult
        : scoreVirtualChef(chef, restorationState);

      if (!result) continue;

      chef.totalScore = Math.round(
        (chef.totalScore + result.score) * 100
      ) / 100;

      chef.history.push({
        round: roundNumber,
        ...result
      });

      results.push({
        id: chef.id,
        name: chef.name,
        score: result.score,
        totalScore: chef.totalScore,
        averageRating: result.averageRating,
        profit: result.profit,
        capital: result.capital,
        dishes: result.dishes
      });
    }

    if (playerResult) {
      state.lastProcessedSimulation = playerResult.simulationDate;
    }

    results.sort((a, b) => b.totalScore - a.totalScore);

    let eliminated = null;
    let winner = null;

    if (roundNumber < 4) {
      const active = state.contestants
        .filter(chef => chef.active)
        .sort((a, b) => a.totalScore - b.totalScore);

      // Elimina un concorrente nelle prime tre manche.
      if (active.length > 2) {
        eliminated = active[0];
        eliminated.active = false;
        eliminated.eliminatedRound = roundNumber;
      }
    } else {
      // La quarta manche è la finale tra i due rimasti.
      const finalists = state.contestants
        .filter(chef => chef.active)
        .sort((a, b) => b.totalScore - a.totalScore);

      winner = finalists[0] || null;
      state.finished = true;
      state.winner = winner?.id || null;
    }

    state.rounds.push({
      round: roundNumber,
      results,
      eliminated: eliminated
        ? { id: eliminated.id, name: eliminated.name }
        : null,
      winner: winner
        ? { id: winner.id, name: winner.name }
        : null,
      date: new Date().toISOString()
    });

    if (!state.finished) {
      state.round = roundNumber + 1;
    }

    saveState();
    render();

    if (eliminated) {
      alert(
        `Manche ${roundNumber} completata!\n\n` +
        `Eliminato: ${eliminated.name}\n` +
        `Concorrenti rimasti: ` +
        `${state.contestants.filter(c => c.active).length}`
      );
    } else if (winner) {
      alert(
        `FINALE MASTERCHEF!\n\n` +
        `Vincitore: ${winner.name}\n` +
        `Punteggio totale: ${winner.totalScore.toFixed(2)}\n\n` +
        "Risultato simulato a scopo d'intrattenimento."
      );
    } else {
      alert(`Manche ${roundNumber} registrata!`);
    }
  }

  function resetTournament() {
    if (!confirm(
      "Vuoi cancellare il torneo e tutti i risultati salvati?"
    )) {
      return;
    }

    state = newTournament();
    saveState();
    render();
  }

  // ------------------------------------------------------------
  // Interfaccia
  // ------------------------------------------------------------

  function render() {
    if (!panel || destroyed) return;

    const active = state.contestants
      .filter(chef => chef.active)
      .sort((a, b) => b.totalScore - a.totalScore);

    const lastRound = state.rounds[state.rounds.length - 1];
    const player = state.contestants.find(
      chef => chef.id === "player"
    );

    const winner = state.contestants.find(
      chef => chef.id === state.winner
    );

    panel.innerHTML = `
      <header class="mc-header">
        <div>
          <div class="mc-kicker">INFINITE CHEF · R74N PLUS</div>
          <h2>MasterChef Simulator</h2>
          <p>Torneo culinario virtuale</p>
        </div>
        <button class="mc-close" data-action="close"
          title="Chiudi pannello" aria-label="Chiudi pannello">×</button>
      </header>

      <section class="mc-card mc-round">
        <div class="mc-label">STATO DEL TORNEO</div>
        <strong>
          ${state.finished
            ? "TORNEO CONCLUSO"
            : `MANCHE ${state.round} / 4`}
        </strong>
        <p>
          ${state.finished
            ? "Il vincitore è stato decretato."
            : "Ogni manche rappresenta tre giornate e sei piatti."}
        </p>
        <div class="mc-progress">
          <div style="width:${
            state.finished ? 100 : ((state.round - 1) / 4) * 100
          }%"></div>
        </div>
        <p class="mc-muted">
          Concorrenti in gara: ${active.length} su 5
        </p>
      </section>

      ${winner ? `
        <section class="mc-card mc-winner">
          <div class="mc-label">🏆 VINCITORE</div>
          <h3>${escapeHTML(winner.name)}</h3>
          <p>
            Punteggio totale: ${winner.totalScore.toFixed(2)}
          </p>
          <p>Risultato esclusivamente d'intrattenimento.</p>
        </section>
      ` : ""}

      <section class="mc-section">
        <h3>Classifica attuale</h3>
        ${state.contestants
          .slice()
          .sort((a, b) => b.totalScore - a.totalScore)
          .map((chef, index) => `
            <div class="mc-chef ${
              chef.active ? "" : "mc-eliminated"
            }">
              <div class="mc-rank">${index + 1}</div>
              <div class="mc-chef-info">
                <strong>${escapeHTML(chef.name)}</strong>
                <span>
                  ${chef.active
                    ? "In gara"
                    : `Eliminato alla manche ${chef.eliminatedRound}`}
                </span>
              </div>
              <div class="mc-points">
                ${chef.totalScore.toFixed(2)}
              </div>
            </div>
          `).join("")}
      </section>

      <section class="mc-section">
        <h3>Ultima manche</h3>
        ${lastRound ? `
          <p class="mc-muted">Manche ${lastRound.round}</p>
          ${lastRound.results
            .slice()
            .sort((a, b) => b.score - a.score)
            .map((result, index) => `
              <div class="mc-result">
                <span>${index + 1}. ${escapeHTML(result.name)}</span>
                <strong>${result.score.toFixed(2)} pt</strong>
              </div>
              ${result.id === "player" ? `
                <div class="mc-details">
                  Media dei sei piatti:
                  ${result.averageRating.toFixed(2)}/5
                  <br>
                  Profitto della simulazione:
                  ${money(result.profit)}
                  <br>
                  Capitale Restoration:
                  ${money(result.capital)}
                </div>
              ` : ""}
            `).join("")}

          ${lastRound.eliminated ? `
            <p class="mc-elimination">
              Eliminato: ${escapeHTML(lastRound.eliminated.name)}
            </p>
          ` : ""}

          ${lastRound.winner ? `
            <p class="mc-champion">
              🏆 Vincitore: ${escapeHTML(lastRound.winner.name)}
            </p>
          ` : ""}
        ` : `
          <p class="mc-muted">Nessuna manche ancora registrata.</p>
        `}
      </section>

      ${!state.finished ? `
        <button class="mc-primary" data-action="register">
          ${player?.active
            ? `Registra manche ${state.round}`
            : `Continua torneo virtuale · Manche ${state.round}`}
        </button>
        <p class="mc-hint">
          ${player?.active
            ? "Prima completa i sei slot e premi «Simula il ristorante» in Restoration Simulator."
            : "Sei stato eliminato: il torneo continua tra i concorrenti virtuali."}
        </p>
      ` : ""}

      <button class="mc-secondary" data-action="reset">
        Nuovo torneo
      </button>

      <footer class="mc-footer">
        I concorrenti virtuali usano piatti acquisiti in Restoration
        Simulator. I loro profitti e punteggi sono simulati e non
        modificano il capitale reale.
      </footer>
    `;
  }

  function handleClick(event) {
    const button = event.target.closest("[data-action]");

    if (!button || !panel.contains(button)) return;

    switch (button.dataset.action) {
      case "register":
        registerRound();
        break;

      case "reset":
        resetTournament();
        break;

      case "close":
        panel.style.display = "none";
        break;
    }
  }

  // ------------------------------------------------------------
  // Montaggio e rimozione
  // ------------------------------------------------------------

  function mount() {
    if (destroyed) return;

    const existing = document.getElementById(MOD_ID + "-panel");

    if (existing) {
      existing.remove();
    }

    const existingStyle = document.getElementById(MOD_ID + "-style");

    if (existingStyle) {
      existingStyle.remove();
    }

    style = document.createElement("style");
    style.id = MOD_ID + "-style";

    style.textContent = `
      #${MOD_ID}-panel {
        position: fixed;
        z-index: 999998;
        top: 12px;
        right: 12px;
        width: min(390px, calc(100vw - 24px));
        max-height: 94vh;
        overflow-y: auto;
        padding: 16px;
        border-radius: 14px;
        background: #171923;
        color: #f4f4f5;
        border: 1px solid #44465a;
        box-shadow: 0 8px 32px #0007;
        font: 14px/1.45 system-ui, sans-serif;
      }

      #${MOD_ID}-panel * {
        box-sizing: border-box;
      }

      #${MOD_ID}-panel h2 {
        margin: 3px 0;
        font-size: 21px;
      }

      #${MOD_ID}-panel h3 {
        margin: 0 0 10px;
        font-size: 16px;
      }

      #${MOD_ID}-panel p {
        margin: 5px 0;
      }

      #${MOD_ID}-panel .mc-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
        margin-bottom: 14px;
      }

      #${MOD_ID}-panel .mc-kicker,
      #${MOD_ID}-panel .mc-label {
        color: #f5a7ce;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1px;
      }

      #${MOD_ID}-panel .mc-close {
        border: 0;
        color: white;
        background: #343747;
        border-radius: 8px;
        width: 30px;
        height: 30px;
        font-size: 22px;
        cursor: pointer;
      }

      #${MOD_ID}-panel .mc-card {
        border: 1px solid #414356;
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 14px;
        background: #222431;
      }

      #${MOD_ID}-panel .mc-round strong {
        display: block;
        margin-top: 5px;
      }

      #${MOD_ID}-panel .mc-progress {
        height: 6px;
        border-radius: 6px;
        background: #3b3e4d;
        overflow: hidden;
        margin-top: 12px;
      }

      #${MOD_ID}-panel .mc-progress div {
        height: 100%;
        background: #f472b6;
        transition: width .2s;
      }

      #${MOD_ID}-panel .mc-winner {
        border-color: #eabf63;
      }

      #${MOD_ID}-panel .mc-winner h3 {
        color: #f6d889;
        margin-top: 6px;
      }

      #${MOD_ID}-panel .mc-section {
        margin: 16px 0;
      }

      #${MOD_ID}-panel .mc-chef {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 9px 0;
        border-bottom: 1px solid #383a49;
      }

      #${MOD_ID}-panel .mc-rank {
        display: grid;
        place-items: center;
        width: 27px;
        height: 27px;
        background: #343747;
        border-radius: 7px;
        font-weight: 800;
      }

      #${MOD_ID}-panel .mc-chef-info {
        flex: 1;
        min-width: 0;
      }

      #${MOD_ID}-panel .mc-chef-info strong,
      #${MOD_ID}-panel .mc-chef-info span {
        display: block;
      }

      #${MOD_ID}-panel .mc-chef-info span,
      #${MOD_ID}-panel .mc-muted,
      #${MOD_ID}-panel .mc-hint,
      #${MOD_ID}-panel .mc-footer {
        color: #b3b5c3;
        font-size: 12px;
      }

      #${MOD_ID}-panel .mc-points {
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }

      #${MOD_ID}-panel .mc-eliminated {
        opacity: .5;
      }

      #${MOD_ID}-panel .mc-result {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 5px 0;
      }

      #${MOD_ID}-panel .mc-details {
        margin: 3px 0 10px;
        padding: 9px;
        border-radius: 7px;
        background: #303242;
        color: #e5e7eb;
        font-size: 12px;
      }

      #${MOD_ID}-panel .mc-elimination {
        color: #fda4af;
        font-weight: 800;
        margin-top: 12px;
      }

      #${MOD_ID}-panel .mc-champion {
        color: #f6d889;
        font-weight: 800;
      }

      #${MOD_ID}-panel .mc-primary,
      #${MOD_ID}-panel .mc-secondary {
        width: 100%;
        padding: 11px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 800;
        margin-top: 8px;
      }

      #${MOD_ID}-panel .mc-primary {
        border: 0;
        color: #241522;
        background: #f5a7ce;
      }

      #${MOD_ID}-panel .mc-secondary {
        border: 1px solid #505265;
        color: #f4f4f5;
        background: #292b39;
      }

      #${MOD_ID}-panel .mc-hint {
        margin-top: 8px;
      }

      #${MOD_ID}-panel .mc-footer {
        border-top: 1px solid #383a49;
        margin-top: 14px;
        padding-top: 10px;
      }
    `;

    document.head.appendChild(style);

    panel = document.createElement("aside");
    panel.id = MOD_ID + "-panel";
    panel.setAttribute("aria-label", "MasterChef Simulator");

    document.body.appendChild(panel);
    panel.addEventListener("click", handleClick);

    render();
  }

  function destroy() {
    destroyed = true;

    if (panel) {
      panel.removeEventListener("click", handleClick);
      panel.remove();
      panel = null;
    }

    if (style) {
      style.remove();
      style = null;
    }
  }

  window[MOD_ID] = {
    getState: () => JSON.parse(JSON.stringify(state)),
    render,
    destroy,
    reset: resetTournament
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }

  console.log("[MasterChef Simulator] Caricato.");
})();
