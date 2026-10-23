
/*
 * MathKitch.js
 * Infinite Chef R74n / R74n Plus
 * Version 4.0.0
 *
 * Features:
 * - Deterministic ingredient combinations and persistent registry
 * - Physical quantities, SI dimensions and unit conversions
 * - Mathematics, statistics, vectors, matrices and calculus
 * - Nutritional and thermodynamic simulation
 * - Recursive ingredient profiles and provenance
 * - Uncertainty propagation
 * - Extensible formula and mod adapter registries
 * - Browser UI
 *
 * CDN ecosystem:
 * https://cdn.jsdelivr.net/gh/GITdonghi71/inifnite_chef_r74n_plus@main/
 *
 * Compatibility note:
 * The native Infinite Chef ingredient/recipe API must be adapted
 * to the actual game version. No undocumented API is assumed.
 */

(() => {
  "use strict";

  // ==========================================================
  // 1. CORE AND CONFIGURATION
  // ==========================================================

  if (window.MathKitch?.version) {
    console.warn("[MathKitch] Already loaded:", window.MathKitch.version);
    return;
  }

  const MK = {
    version: "4.0.0",
    prefix: "mathkitch:",
    maxIngredients: 128,
    registry: Object.create(null),
    sources: Object.create(null),
    adapters: Object.create(null),
    formulas: Object.create(null),
    selected: [],
    config: {
      persist: true,
      showPanel: true,
      maxDisplayItems: 100,
      energyProteinKcalPerG: 4,
      energyCarbohydrateKcalPerG: 4,
      energyFatKcalPerG: 9,
      energyFiberKcalPerG: 2
    }
  };

  const STORAGE = {
    ingredients: "MathKitch.registry.v4",
    profiles: "MathKitch.profiles.v4",
    settings: "MathKitch.settings.v4"
  };

  const hasDOM = typeof document !== "undefined";
  const hasWindow = typeof window !== "undefined";

  const own = (obj, key) =>
    Object.prototype.hasOwnProperty.call(obj, key);

  const finite = (n, label = "value") => {
    if (typeof n !== "number" || !Number.isFinite(n)) {
      throw new TypeError(label + " must be a finite number.");
    }
    return n;
  };

  const clamp = (x, lo = 0, hi = 1) =>
    Math.max(lo, Math.min(hi, x));

  const safeObject = obj =>
    obj && typeof obj === "object" && !Array.isArray(obj);

  // ==========================================================
  // 2. STABLE IDENTIFIERS
  // ==========================================================

  function normalizeID(id) {
    if (id === null || id === undefined) {
      throw new TypeError("Ingredient ID cannot be empty.");
    }

    const value = String(id).trim().normalize("NFKC");

    if (!value) throw new TypeError("Ingredient ID cannot be empty.");

    return value;
  }

  function canonicalIDs(ids) {
    if (!Array.isArray(ids)) {
      throw new TypeError("An array of ingredient IDs is required.");
    }

    if (ids.length < 1) {
      throw new Error("Select at least one ingredient.");
    }

    if (ids.length > MK.maxIngredients) {
      throw new RangeError(
        "Maximum ingredient count: " + MK.maxIngredients
      );
    }

    // Sorting makes order irrelevant; duplicates are preserved.
    return ids.map(normalizeID).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0
    );
  }

  function combinationKey(ids) {
    return JSON.stringify(canonicalIDs(ids));
  }

  function hash128(text) {
    // Four independent rolling 32-bit hashes.
    // The full encoded combination is also included in the ID,
    // so hash collisions cannot cause identity collisions.
    const seeds = [
      0x811c9dc5,
      0x9e3779b9,
      0x85ebca6b,
      0xc2b2ae35
    ];

    const primes = [
      0x01000193,
      0x85ebca6b,
      0xc2b2ae35,
      0x27d4eb2f
    ];

    const out = seeds.map((seed, index) => {
      let h = seed;

      for (let i = 0; i < text.length; i++) {
        h = Math.imul(h ^ text.charCodeAt(i), primes[index]);
        h ^= h >>> (13 + index);
      }

      return (h >>> 0).toString(16).padStart(8, "0");
    });

    return out.join("");
  }

  function uniqueID(ids) {
    const key = combinationKey(ids);

    // encodeURIComponent is injective for this JSON string.
    // The readable payload guarantees identity separation even
    // if the compact hash portion collides.
    return MK.prefix + hash128(key) + ":" + encodeURIComponent(key);
  }

  MK.normalizeID = normalizeID;
  MK.canonicalIDs = canonicalIDs;
  MK.combinationKey = combinationKey;
  MK.uniqueID = uniqueID;

  // ==========================================================
  // 3. SI DIMENSION SYSTEM
  // [mass, length, time, temperature, amount,
  //  electric current, luminous intensity]
  // ==========================================================

  const DIM = {
    dimensionless: [0, 0, 0, 0, 0, 0, 0],
    mass: [1, 0, 0, 0, 0, 0, 0],
    length: [0, 1, 0, 0, 0, 0, 0],
    time: [0, 0, 1, 0, 0, 0, 0],
    area: [0, 2, 0, 0, 0, 0, 0],
    volume: [0, 3, 0, 0, 0, 0, 0],
    speed: [0, 1, -1, 0, 0, 0, 0],
    acceleration: [0, 1, -2, 0, 0, 0, 0],
    jerk: [0, 1, -3, 0, 0, 0, 0],
    density: [1, -3, 0, 0, 0, 0, 0],
    force: [1, 1, -2, 0, 0, 0, 0],
    momentum: [1, 1, -1, 0, 0, 0, 0],
    pressure: [1, -1, -2, 0, 0, 0, 0],
    energy: [1, 2, -2, 0, 0, 0, 0],
    power: [1, 2, -3, 0, 0, 0, 0],
    frequency: [0, 0, -1, 0, 0, 0, 0],
    temperature: [0, 0, 0, 1, 0, 0, 0],
    amount: [0, 0, 0, 0, 1, 0, 0],
    current: [0, 0, 0, 0, 0, 1, 0],
    luminousIntensity: [0, 0, 0, 0, 0, 0, 1],
    viscosity: [1, -1, -1, 0, 0, 0, 0],
    diffusivity: [0, 2, -1, 0, 0, 0, 0],
    surfaceTension: [1, 0, -2, 0, 0, 0, 0],
    entropy: [1, 2, -2, -1, 0, 0, 0],
    heatCapacity: [1, 2, -2, -1, 0, 0, 0],
    specificHeat: [0, 2, -2, -1, 0, 0, 0],
    thermalConductivity: [1, 1, -3, -1, 0, 0, 0],
    concentration: [0, -3, 0, 0, 1, 0, 0],
    molarMass: [1, 0, 0, 0, -1, 0, 0],
    charge: [0, 0, 1, 0, 0, 1, 0],
    voltage: [1, 2, -3, 0, 0, -1, 0],
    resistance: [1, 2, -3, 0, 0, -2, 0],
    conductance: [-1, -2, 3, 0, 0, 2, 0],
    capacitance: [-1, -2, 4, 0, 0, 2, 0],
    magneticField: [1, 0, -2, 0, 0, -1, 0],
    inductance: [1, 2, -2, 0, 0, -2, 0],
    luminousFlux: [0, 0, 0, 0, 0, 0, 1],
    illuminance: [0, -2, 0, 0, 0, 0, 1]
  };

  const dimEqual = (a, b) =>
    a.length === b.length && a.every((x, i) => x === b[i]);

  const dimAdd = (a, b) => a.map((x, i) => x + b[i]);
  const dimSub = (a, b) => a.map((x, i) => x - b[i]);
  const dimScale = (a, n) => a.map(x => x * n);

  function dimDescription(dim) {
    const symbols = ["M", "L", "T", "Θ", "N", "I", "J"];

    return dim.map((power, i) =>
      power === 0 ? null :
      symbols[i] + (power === 1 ? "" : "^" + power)
    ).filter(Boolean).join(" ") || "dimensionless";
  }

  // ==========================================================
  // 4. UNIT DATABASE
  // ==========================================================

  const UNITS = Object.create(null);

  function defineUnit(name, dimension, scale, offset = 0) {
    UNITS[name] = {
      name,
      dimension: [...dimension],
      scale,
      offset
    };
  }

  defineUnit("1", DIM.dimensionless, 1);

  defineUnit("kg", DIM.mass, 1);
  defineUnit("g", DIM.mass, 0.001);
  defineUnit("mg", DIM.mass, 1e-6);
  defineUnit("ug", DIM.mass, 1e-9);
  defineUnit("lb", DIM.mass, 0.45359237);
  defineUnit("oz", DIM.mass, 0.028349523125);

  defineUnit("m", DIM.length, 1);
  defineUnit("km", DIM.length, 1000);
  defineUnit("cm", DIM.length, 0.01);
  defineUnit("mm", DIM.length, 0.001);
  defineUnit("um", DIM.length, 1e-6);

  defineUnit("m2", DIM.area, 1);
  defineUnit("cm2", DIM.area, 1e-4);
  defineUnit("m3", DIM.volume, 1);
  defineUnit("L", DIM.volume, 1e-3);
  defineUnit("mL", DIM.volume, 1e-6);
  defineUnit("uL", DIM.volume, 1e-9);

  defineUnit("s", DIM.time, 1);
  defineUnit("min", DIM.time, 60);
  defineUnit("h", DIM.time, 3600);
  defineUnit("day", DIM.time, 86400);

  defineUnit("K", DIM.temperature, 1, 0);
  defineUnit("degC", DIM.temperature, 1, 273.15);
  defineUnit("degF", DIM.temperature, 5 / 9, 255.3722222222);

  defineUnit("mol", DIM.amount, 1);
  defineUnit("mmol", DIM.amount, 0.001);

  defineUnit("m/s", DIM.speed, 1);
  defineUnit("km/h", DIM.speed, 1 / 3.6);
  defineUnit("m/s2", DIM.acceleration, 1);
  defineUnit("kg/m3", DIM.density, 1);
  defineUnit("g/cm3", DIM.density, 1000);

  defineUnit("N", DIM.force, 1);
  defineUnit("Pa", DIM.pressure, 1);
  defineUnit("kPa", DIM.pressure, 1000);
  defineUnit("MPa", DIM.pressure, 1e6);
  defineUnit("bar", DIM.pressure, 1e5);
  defineUnit("atm", DIM.pressure, 101325);

  defineUnit("J", DIM.energy, 1);
  defineUnit("kJ", DIM.energy, 1000);
  defineUnit("MJ", DIM.energy, 1e6);
  defineUnit("cal", DIM.energy, 4.184);
  defineUnit("kcal", DIM.energy, 4184);
  defineUnit("Wh", DIM.energy, 3600);
  defineUnit("kWh", DIM.energy, 3.6e6);

  defineUnit("W", DIM.power, 1);
  defineUnit("kW", DIM.power, 1000);
  defineUnit("MW", DIM.power, 1e6);
  defineUnit("Hz", DIM.frequency, 1);

  defineUnit("J/K", DIM.entropy, 1);
  defineUnit("J/(kg*K)", DIM.specificHeat, 1);
  defineUnit("W/(m*K)", DIM.thermalConductivity, 1);
  defineUnit("Pa*s", DIM.viscosity, 1);
  defineUnit("m2/s", DIM.diffusivity, 1);
  defineUnit("N/m", DIM.surfaceTension, 1);
  defineUnit("mol/m3", DIM.concentration, 1);
  defineUnit("kg/mol", DIM.molarMass, 1);

  defineUnit("C", DIM.charge, 1);
  defineUnit("A", DIM.current, 1);
  defineUnit("V", DIM.voltage, 1);
  defineUnit("ohm", DIM.resistance, 1);
  defineUnit("S", DIM.conductance, 1);
  defineUnit("F", DIM.capacitance, 1);
  defineUnit("T", DIM.magneticField, 1);
  defineUnit("H", DIM.inductance, 1);
  defineUnit("lm", DIM.luminousFlux, 1);
  defineUnit("lx", DIM.illuminance, 1);

  function getUnit(name) {
    if (!UNITS[name]) throw new Error("Unknown unit: " + name);
    return UNITS[name];
  }

  // ==========================================================
  // 5. QUANTITIES AND UNCERTAINTY
  // ==========================================================

  function quantity(value, unitName = "1", options = {}) {
    finite(value);
    const u = getUnit(unitName);
    const uncertainty = options.uncertainty ?? 0;

    finite(uncertainty, "uncertainty");

    if (uncertainty < 0) {
      throw new RangeError("Uncertainty must be non-negative.");
    }

    return {
      value,
      unit: unitName,
      si: value * u.scale + u.offset,
      dimension: [...u.dimension],
      uncertainty,
      uncertaintySI: Math.abs(u.scale) * uncertainty,
      source: options.source || "user",
      quality: options.quality || "estimated",
      metadata: options.metadata || null
    };
  }

  function fromSI(value, dimension, unitName, sigmaSI = 0, options = {}) {
    const u = getUnit(unitName);

    if (!dimEqual(dimension, u.dimension)) {
      throw new Error("Output unit dimension mismatch.");
    }

    return quantity(
      (value - u.offset) / u.scale,
      unitName,
      {
        uncertainty: sigmaSI / Math.abs(u.scale),
        source: options.source || "calculation",
        quality: options.quality || "derived",
        metadata: options.metadata || null
      }
    );
  }

  function convert(value, from, to) {
    const a = getUnit(from);
    const b = getUnit(to);

    if (!dimEqual(a.dimension, b.dimension)) {
      throw new Error("Incompatible units: " + from + " and " + to);
    }

    return (value * a.scale + a.offset - b.offset) / b.scale;
  }

  function requireCompatible(a, b) {
    if (!dimEqual(a.dimension, b.dimension)) {
      throw new Error(
        "Dimensional mismatch: " +
        dimDescription(a.dimension) + " vs " +
        dimDescription(b.dimension)
      );
    }
  }

  function addQuantity(a, b) {
    requireCompatible(a, b);

    return fromSI(
      a.si + b.si,
      a.dimension,
      a.unit,
      Math.hypot(a.uncertaintySI, b.uncertaintySI)
    );
  }

  function subtractQuantity(a, b) {
    requireCompatible(a, b);

    return fromSI(
      a.si - b.si,
      a.dimension,
      a.unit,
      Math.hypot(a.uncertaintySI, b.uncertaintySI)
    );
  }

  function multiplyQuantity(a, b) {
    const value = a.si * b.si;

    return {
      value,
      unit: null,
      si: value,
      dimension: dimAdd(a.dimension, b.dimension),
      uncertaintySI: Math.hypot(
        b.si * a.uncertaintySI,
        a.si * b.uncertaintySI
      ),
      source: "calculation",
      quality: "derived"
    };
  }

  function divideQuantity(a, b) {
    if (b.si === 0) throw new Error("Division by zero.");

    const value = a.si / b.si;

    return {
      value,
      unit: null,
      si: value,
      dimension: dimSub(a.dimension, b.dimension),
      uncertaintySI: Math.hypot(
        a.uncertaintySI / b.si,
        a.si * b.uncertaintySI / (b.si * b.si)
      ),
      source: "calculation",
      quality: "derived"
    };
  }

  function powerQuantity(a, exponent) {
    finite(exponent, "exponent");

    if (a.si < 0 && !Number.isInteger(exponent)) {
      throw new Error("Fractional power of negative quantity.");
    }

    const value = Math.pow(a.si, exponent);

    return {
      value,
      unit: null,
      si: value,
      dimension: dimScale(a.dimension, exponent),
      uncertaintySI: Math.abs(
        exponent * Math.pow(a.si, exponent - 1) * a.uncertaintySI
      ),
      source: "calculation",
      quality: "derived"
    };
  }

  MK.quantity = quantity;
  MK.convert = convert;
  MK.dimensions = {
    base: DIM,
    equal: dimEqual,
    add: dimAdd,
    subtract: dimSub,
    scale: dimScale,
    describe: dimDescription
  };

  MK.units = {
    catalog: UNITS,
    convert,
    get: getUnit,
    define: (name, dimension, scale, offset = 0) => {
      if (!Array.isArray(dimension) || dimension.length !== 7) {
        throw new Error("Dimension must have seven SI exponents.");
      }
      finite(scale, "scale");
      if (scale <= 0) throw new Error("Scale must be positive.");
      defineUnit(name, dimension, scale, offset);
    }
  };

  MK.physical = {
    add: addQuantity,
    subtract: subtractQuantity,
    multiply: multiplyQuantity,
    divide: divideQuantity,
    power: powerQuantity,
    sqrt: a => powerQuantity(a, 0.5),
    compatible: (a, b) => dimEqual(a.dimension, b.dimension)
  };

  // ==========================================================
  // 6. PHYSICAL QUANTITY CATALOG
  // ==========================================================

  const quantityCatalog = Object.create(null);

  function registerQuantity(key, name, symbol, unitName, category, description = "") {
    const u = getUnit(unitName);

    quantityCatalog[key] = {
      key,
      name,
      symbol,
      unit: unitName,
      dimension: [...u.dimension],
      category,
      description
    };
  }

  [
    ["mass","Massa","m","kg","meccanica"],
    ["length","Lunghezza","l","m","geometria"],
    ["area","Area","A","m2","geometria"],
    ["volume","Volume","V","m3","geometria"],
    ["time","Tempo","t","s","dinamica"],
    ["speed","Velocità","v","m/s","dinamica"],
    ["acceleration","Accelerazione","a","m/s2","dinamica"],
    ["density","Densità","ρ","kg/m3","materia"],
    ["force","Forza","F","N","meccanica"],
    ["pressure","Pressione","p","Pa","fluidi"],
    ["energy","Energia","E","J","energia"],
    ["power","Potenza","P","W","energia"],
    ["frequency","Frequenza","f","Hz","onde"],
    ["temperature","Temperatura","T","K","termodinamica"],
    ["entropy","Entropia","S","J/K","termodinamica"],
    ["specificHeat","Calore specifico","c","J/(kg*K)","termodinamica"],
    ["viscosity","Viscosità dinamica","μ","Pa*s","fluidi"],
    ["diffusivity","Diffusività","D","m2/s","trasporto"],
    ["surfaceTension","Tensione superficiale","γ","N/m","interfacce"],
    ["concentration","Concentrazione molare","c","mol/m3","chimica"],
    ["molarMass","Massa molare","M","kg/mol","chimica"]
  ].forEach(row => registerQuantity(...row));

  const dimensionlessQuantities = [
    ["pH","pH","pH","chimica"],
    ["waterActivity","Attività dell'acqua","aw","alimenti"],
    ["moleFraction","Frazione molare","x","chimica"],
    ["massFraction","Frazione massica","w","chimica"],
    ["reynolds","Numero di Reynolds","Re","fluidi"],
    ["prandtl","Numero di Prandtl","Pr","termodinamica"],
    ["fourier","Numero di Fourier","Fo","termodinamica"],
    ["biot","Numero di Biot","Bi","termodinamica"],
    ["porosity","Porosità","φ","materiali"],
    ["efficiency","Efficienza","η","energia"]
  ];

  dimensionlessQuantities.forEach(([key, name, symbol, category]) => {
    quantityCatalog[key] = {
      key, name, symbol, unit: "1",
      dimension: [...DIM.dimensionless],
      category,
      description: "Grandezza adimensionale."
    };
  });

  [
    ["protein","Proteine","P","g","nutrizione"],
    ["carbohydrate","Carboidrati","C","g","nutrizione"],
    ["fat","Lipidi","F","g","nutrizione"],
    ["fiber","Fibre","Fi","g","nutrizione"],
    ["water","Acqua","W","g","nutrizione"],
    ["sugar","Zuccheri","Z","g","nutrizione"],
    ["starch","Amido","St","g","nutrizione"],
    ["sodium","Sodio","Na","mg","nutrizione"],
    ["potassium","Potassio","K","mg","nutrizione"],
    ["calcium","Calcio","Ca","mg","nutrizione"],
    ["iron","Ferro","Fe","mg","nutrizione"],
    ["magnesium","Magnesio","Mg","mg","nutrizione"],
    ["vitaminC","Vitamina C","Cvit","mg","nutrizione"],
    ["vitaminD","Vitamina D","Dvit","ug","nutrizione"]
  ].forEach(([key, name, symbol, unitName, category]) => {
    // Nutrient quantities are represented as masses.
    registerQuantity(key, name, symbol, unitName, category);
  });

  MK.quantityCatalog = quantityCatalog;
  MK.listQuantities = category =>
    Object.values(quantityCatalog).filter(q =>
      category == null || q.category === category
    );
  MK.getQuantity = key => quantityCatalog[key] || null;

  // ==========================================================
  // 7. MATHEMATICS
  // ==========================================================

  const math = {
    add: (a, b) => a + b,
    sub: (a, b) => a - b,
    mul: (a, b) => a * b,
    div: (a, b) => {
      if (b === 0) throw new Error("Division by zero.");
      return a / b;
    },
    mod: (a, b) => a % b,
    pow: (a, b) => Math.pow(a, b),
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    sign: Math.sign,
    exp: Math.exp,
    expm1: Math.expm1,
    log: Math.log,
    log10: Math.log10,
    log2: Math.log2,
    log1p: Math.log1p,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    atan2: Math.atan2,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    trunc: Math.trunc,
    min: Math.min,
    max: Math.max,
    hypot: Math.hypot,
    clamp,
    lerp: (a, b, t) => a + (b - a) * t,
    inverseLerp: (a, b, x) => {
      if (a === b) throw new Error("Zero interval.");
      return (x - a) / (b - a);
    },
    mapRange: (x, a, b, c, d) => {
      if (a === b) throw new Error("Zero input interval.");
      return c + (x - a) * (d - c) / (b - a);
    },
    smoothstep: (a, b, x) => {
      if (a === b) return x < a ? 0 : 1;
      const t = clamp((x - a) / (b - a));
      return t * t * (3 - 2 * t);
    },
    sigmoid: x => 1 / (1 + Math.exp(-x)),
    softplus: x => Math.log1p(Math.exp(x)),
    factorial: n => {
      if (!Number.isInteger(n) || n < 0 || n > 170) {
        throw new RangeError("Factorial requires an integer from 0 to 170.");
      }
      let result = 1;
      for (let i = 2; i <= n; i++) result *= i;
      return result;
    },
    gcd: (a, b) => {
      a = Math.abs(Math.trunc(a));
      b = Math.abs(Math.trunc(b));
      while (b) [a, b] = [b, a % b];
      return a;
    },
    lcm: (a, b) => (!a || !b) ? 0 :
      Math.abs(a * b) / math.gcd(a, b),
    isPrime: n => {
      if (!Number.isInteger(n) || n < 2) return false;
      if (n === 2) return true;
      if (n % 2 === 0) return false;
      for (let i = 3; i <= Math.sqrt(n); i += 2) {
        if (n % i === 0) return false;
      }
      return true;
    }
  };

  MK.math = math;

  // ==========================================================
  // 8. STATISTICS
  // ==========================================================

  const stats = {
    sum: xs => xs.reduce((s, x) => s + x, 0),
    mean: xs => xs.length ? stats.sum(xs) / xs.length : NaN,
    weightedMean: (xs, ws) => {
      if (xs.length !== ws.length) throw new Error("Length mismatch.");
      const total = stats.sum(ws);
      if (total === 0) throw new Error("Zero total weight.");
      return xs.reduce((s, x, i) => s + x * ws[i], 0) / total;
    },
    geometricMean: xs =>
      xs.length && xs.every(x => x > 0) ?
        Math.exp(stats.mean(xs.map(Math.log))) : NaN,
    harmonicMean: xs =>
      xs.length && xs.every(x => x !== 0) ?
        xs.length / stats.sum(xs.map(x => 1 / x)) : NaN,
    median: xs => {
      if (!xs.length) return NaN;
      const a = [...xs].sort((x, y) => x - y);
      const m = Math.floor(a.length / 2);
      return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    },
    variance: (xs, sample = false) => {
      const n = xs.length - (sample ? 1 : 0);
      if (n <= 0) return NaN;
      const mean = stats.mean(xs);
      return xs.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
    },
    stdDev: (xs, sample = false) =>
      Math.sqrt(stats.variance(xs, sample)),
    rms: xs => Math.sqrt(stats.mean(xs.map(x => x * x))),
    range: xs => xs.length ? Math.max(...xs) - Math.min(...xs) : NaN,
    quantile: (xs, q) => {
      if (!xs.length || q < 0 || q > 1) return NaN;
      const a = [...xs].sort((x, y) => x - y);
      const p = (a.length - 1) * q;
      const lo = Math.floor(p);
      const hi = Math.ceil(p);
      return a[lo] + (a[hi] - a[lo]) * (p - lo);
    },
    percentile: (xs, p) => stats.quantile(xs, p / 100),
    zScores: xs => {
      const m = stats.mean(xs);
      const sd = stats.stdDev(xs);
      return xs.map(x => sd ? (x - m) / sd : 0);
    },
    normalize: xs => {
      if (!xs.length) return [];
      const lo = Math.min(...xs);
      const hi = Math.max(...xs);
      return xs.map(x => hi === lo ? 0 : (x - lo) / (hi - lo));
    },
    covariance: (xs, ys, sample = false) => {
      if (xs.length !== ys.length || xs.length < 2) {
        throw new Error("Equal arrays of length >= 2 required.");
      }
      const mx = stats.mean(xs);
      const my = stats.mean(ys);
      const n = xs.length - (sample ? 1 : 0);
      return xs.reduce((s, x, i) =>
        s + (x - mx) * (ys[i] - my), 0) / n;
    },
    correlation: (xs, ys) => {
      const denom = stats.stdDev(xs) * stats.stdDev(ys);
      return denom ? stats.covariance(xs, ys) / denom : NaN;
    }
  };

  MK.stats = stats;

  // ==========================================================
  // 9. VECTORS AND MATRICES
  // ==========================================================

  const vector = {
    add: (a, b) => {
      if (a.length !== b.length) throw new Error("Vector size mismatch.");
      return a.map((x, i) => x + b[i]);
    },
    sub: (a, b) => {
      if (a.length !== b.length) throw new Error("Vector size mismatch.");
      return a.map((x, i) => x - b[i]);
    },
    scale: (a, k) => a.map(x => x * k),
    dot: (a, b) => {
      if (a.length !== b.length) throw new Error("Vector size mismatch.");
      return a.reduce((s, x, i) => s + x * b[i], 0);
    },
    norm: a => Math.sqrt(vector.dot(a, a)),
    distance: (a, b) => vector.norm(vector.sub(a, b)),
    cosine: (a, b) => {
      const denom = vector.norm(a) * vector.norm(b);
      return denom ? vector.dot(a, b) / denom : NaN;
    },
    cross: (a, b) => {
      if (a.length !== 3 || b.length !== 3) {
        throw new Error("Cross product requires 3D vectors.");
      }
      return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
      ];
    }
  };

  const matrix = {
    transpose: A => {
      if (!A.length || !A[0].length) return [];
      if (A.some(row => row.length !== A[0].length)) {
        throw new Error("Matrix must be rectangular.");
      }
      return A[0].map((_, j) => A.map(row => row[j]));
    },
    identity: n => Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)),
    multiply: (A, B) => {
      if (!A.length || !B.length || A[0].length !== B.length) {
        throw new Error("Incompatible matrix dimensions.");
      }
      const BT = matrix.transpose(B);
      return A.map(row => BT.map(col => vector.dot(row, col)));
    },
    trace: A => A.reduce((s, row, i) => s + (row[i] || 0), 0),
    determinant: A => {
      if (!A.length || A.some(row => row.length !== A.length)) {
        throw new Error("Square matrix required.");
      }
      const M = A.map(row => [...row]);
      let det = 1;

      for (let i = 0; i < M.length; i++) {
        let pivot = i;

        for (let j = i + 1; j < M.length; j++) {
          if (Math.abs(M[j][i]) > Math.abs(M[pivot][i])) pivot = j;
        }

        if (Math.abs(M[pivot][i]) < 1e-12) return 0;

        if (pivot !== i) {
          [M[i], M[pivot]] = [M[pivot], M[i]];
          det *= -1;
        }

        const p = M[i][i];
        det *= p;

        for (let j = i + 1; j < M.length; j++) {
          const factor = M[j][i] / p;
          for (let k = i + 1; k < M.length; k++) {
            M[j][k] -= factor * M[i][k];
          }
        }
      }

      return det;
    }
  };

  MK.vector = vector;
  MK.matrix = matrix;

  // ==========================================================
  // 10. CALCULUS AND NUMERICAL OPTIMIZATION
  // ==========================================================

  const calculus = {
    derivative: (f, x, h = 1e-5) =>
      (f(x + h) - f(x - h)) / (2 * h),

    secondDerivative: (f, x, h = 1e-4) =>
      (f(x + h) - 2 * f(x) + f(x - h)) / (h * h),

    integrate: (f, a, b, steps = 1000) => {
      if (!Number.isInteger(steps) || steps < 1) {
        throw new Error("Steps must be a positive integer.");
      }

      const h = (b - a) / steps;
      let sum = (f(a) + f(b)) / 2;

      for (let i = 1; i < steps; i++) sum += f(a + i * h);

      return sum * h;
    },

    simpson: (f, a, b, steps = 1000) => {
      steps = Math.max(2, Math.floor(steps));
      if (steps % 2) steps++;

      const h = (b - a) / steps;
      let sum = f(a) + f(b);

      for (let i = 1; i < steps; i++) {
        sum += (i % 2 ? 4 : 2) * f(a + i * h);
      }

      return sum * h / 3;
    },

    gradient: (f, xs, h = 1e-5) => xs.map((_, i) => {
      const a = [...xs];
      const b = [...xs];
      a[i] += h;
      b[i] -= h;
      return (f(a) - f(b)) / (2 * h);
    }),

    newton: (f, df, x, tolerance = 1e-9, maxIterations = 100) => {
      for (let i = 0; i < maxIterations; i++) {
        const slope = df(x);
        if (!Number.isFinite(slope) || Math.abs(slope) < 1e-14) break;

        const next = x - f(x) / slope;

        if (Math.abs(next - x) < tolerance) return next;

        x = next;
      }

      return x;
    },

    goldenSection: (f, a, b, tolerance = 1e-8, maxIterations = 200) => {
      const r = (Math.sqrt(5) - 1) / 2;
      let c = b - r * (b - a);
      let d = a + r * (b - a);

      for (let i = 0;
        i < maxIterations && Math.abs(b - a) > tolerance;
        i++) {
        if (f(c) < f(d)) {
          b = d;
          d = c;
          c = b - r * (b - a);
        } else {
          a = c;
          c = d;
          d = a + r * (b - a);
        }
      }

      return (a + b) / 2;
    }
  };

  MK.calculus = calculus;

  // ==========================================================
  // 11. PROBABILITY AND INFORMATION THEORY
  // ==========================================================

  const probability = {
    entropy: probabilities =>
      -probabilities.reduce((sum, p) =>
        p > 0 ? sum + p * Math.log2(p) : sum, 0),

    shannon: values => {
      const total = stats.sum(values);
      return total > 0 ?
        probability.entropy(values.map(x => x / total)) : 0;
    },

    gini: probabilities =>
      1 - probabilities.reduce((s, p) => s + p * p, 0),

    softmax: values => {
      if (!values.length) return [];
      const max = Math.max(...values);
      const exps = values.map(x => Math.exp(x - max));
      const total = stats.sum(exps);
      return exps.map(x => x / total);
    },

    klDivergence: (p, q) => {
      if (p.length !== q.length) throw new Error("Length mismatch.");
      return p.reduce((s, x, i) =>
        x > 0 ? s + x * Math.log(x / Math.max(q[i], 1e-15)) : s, 0);
    }
  };

  MK.probability = probability;

  // ==========================================================
  // 12. NUTRITION AND THERMODYNAMICS
  // ==========================================================

  const food = {
    energyKcal: ({
      protein = 0,
      carbohydrate = 0,
      fat = 0,
      fiber = 0
    }) =>
      protein * MK.config.energyProteinKcalPerG +
      carbohydrate * MK.config.energyCarbohydrateKcalPerG +
      fat * MK.config.energyFatKcalPerG +
      fiber * MK.config.energyFiberKcalPerG,

    energyKJ: macros => food.energyKcal(macros) * 4.184,

    massFraction: (componentMass, totalMass) =>
      totalMass > 0 ? componentMass / totalMass : NaN,

    massPercent: (componentMass, totalMass) =>
      100 * food.massFraction(componentMass, totalMass),

    hydrationRatio: (waterMass, flourMass) =>
      flourMass > 0 ? 100 * waterMass / flourMass : NaN,

    energyDensity: (kcal, massKg) =>
      massKg > 0 ? kcal / massKg : NaN,

    waterActivityIdeal: (soluteMoles, waterMoles) =>
      waterMoles > 0 ? waterMoles / (soluteMoles + waterMoles) : NaN,

    mixingEntropy: fractions => probability.shannon(fractions),

    mixtureDensity: components => {
      let totalMass = 0;
      let totalVolume = 0;

      for (const c of components) {
        if (!(c.massKg >= 0) || !(c.densityKgM3 > 0)) {
          throw new Error("Invalid mass or density.");
        }

        totalMass += c.massKg;
        totalVolume += c.massKg / c.densityKgM3;
      }

      return totalVolume > 0 ? totalMass / totalVolume : NaN;
    },

    mixtureTemperature: components => {
      let numerator = 0;
      let denominator = 0;

      for (const c of components) {
        if (c.massKg < 0 || c.specificHeat <= 0 || c.temperatureK < 0) {
          throw new Error("Invalid thermal input.");
        }

        const capacity = c.massKg * c.specificHeat;
        numerator += capacity * c.temperatureK;
        denominator += capacity;
      }

      return denominator > 0 ? numerator / denominator : NaN;
    },

    heatTransfer: (massKg, specificHeat, deltaTemperatureK) =>
      massKg * specificHeat * deltaTemperatureK,

    latentHeatEnergy: (massKg, latentHeatJkg) =>
      massKg * latentHeatJkg,

    idealGasPressure: (moles, temperatureK, volumeM3) =>
      volumeM3 > 0 ?
        moles * 8.314462618 * temperatureK / volumeM3 : NaN,

    reynolds: (density, speed, length, viscosity) =>
      viscosity > 0 ? density * speed * length / viscosity : NaN,

    fourier: (diffusivity, time, length) =>
      length > 0 ? diffusivity * time / (length * length) : NaN,

    biot: (heatTransferCoefficient, length, conductivity) =>
      conductivity > 0 ?
        heatTransferCoefficient * length / conductivity : NaN,

    thermalDiffusionLength: (diffusivity, time) =>
      Math.sqrt(Math.max(0, 4 * diffusivity * time)),

    mixFractions: components => {
      const totalMass = components.reduce((s, c) => s + c.massKg, 0);

      if (!(totalMass > 0)) throw new Error("Positive total mass required.");

      const keys = new Set();

      components.forEach(c =>
        Object.keys(c.fractions || {}).forEach(k => keys.add(k)));

      const result = {};

      for (const key of keys) {
        result[key] = components.reduce((sum, c) =>
          sum + c.massKg * (c.fractions?.[key] || 0), 0) / totalMass;
      }

      return result;
    }
  };

  MK.food = food;

  // ==========================================================
  // 13. FORMULA REGISTRY
  // ==========================================================

  function registerFormula(name, spec) {
    if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(name)) {
      throw new Error("Invalid formula name.");
    }

    if (!safeObject(spec) || typeof spec.fn !== "function") {
      throw new TypeError("Formula requires a function.");
    }

    if (!safeObject(spec.inputs) || !spec.output) {
      throw new Error("Formula requires inputs and output unit.");
    }

    const outputUnit = getUnit(spec.output);

    if (spec.dimension &&
        !dimEqual(spec.dimension, outputUnit.dimension)) {
      throw new Error("Formula output dimension mismatch.");
    }

    for (const expectedUnit of Object.values(spec.inputs)) {
      getUnit(expectedUnit);
    }

    MK.formulas[name] = {
      name,
      description: spec.description || name,
      inputs: { ...spec.inputs },
      output: spec.output,
      dimension: [...outputUnit.dimension],
      fn: spec.fn,
      author: spec.author || "unknown",
      version: spec.version || "1.0.0"
    };

    return {
      name,
      description: MK.formulas[name].description,
      inputs: { ...spec.inputs },
      output: spec.output,
      dimension: [...outputUnit.dimension]
    };
  }

  function runFormula(name, inputs) {
    const formula = MK.formulas[name];

    if (!formula) throw new Error("Unknown formula: " + name);

    const numeric = {};

    for (const [key, expectedUnit] of Object.entries(formula.inputs)) {
      const q = inputs[key];

      if (!q || !Array.isArray(q.dimension)) {
        throw new Error("Missing quantity input: " + key);
      }

      if (!dimEqual(q.dimension, getUnit(expectedUnit).dimension)) {
        throw new Error("Incompatible input dimension: " + key);
      }

      numeric[key] = q.si;
    }

    const valueSI = formula.fn(numeric);
    finite(valueSI, "formula result");

    let variance = 0;

    for (const [key, expectedUnit] of Object.entries(formula.inputs)) {
      const q = inputs[key];
      const sigma = q.uncertaintySI || 0;

      if (!sigma) continue;

      const h = Math.max(Math.abs(q.si) * 1e-6, 1e-9);
      const plus = { ...numeric, [key]: q.si + h };
      const minus = { ...numeric, [key]: q.si - h };

      const derivative =
        (formula.fn(plus) - formula.fn(minus)) / (2 * h);

      variance += derivative * derivative * sigma * sigma;
    }

    return fromSI(
      valueSI,
      formula.dimension,
      formula.output,
      Math.sqrt(variance),
      {
        source: "formula:" + name,
        quality: "derived",
        metadata: { formula: name }
      }
    );
  }

  MK.registerFormula = registerFormula;
  MK.runFormula = runFormula;

  // Built-in formulas use SI-valued input parameters.
  registerFormula("density", {
    description: "ρ = m / V",
    inputs: { mass: "kg", volume: "m3" },
    output: "kg/m3",
    fn: ({ mass, volume }) => {
      if (volume <= 0) throw new Error("Volume must be positive.");
      return mass / volume;
    }
  });

  registerFormula("speed", {
    description: "v = distance / time",
    inputs: { distance: "m", time: "s" },
    output: "m/s",
    fn: ({ distance, time }) => {
      if (time === 0) throw new Error("Time cannot be zero.");
      return distance / time;
    }
  });

  registerFormula("force", {
    description: "F = m a",
    inputs: { mass: "kg", acceleration: "m/s2" },
    output: "N",
    fn: ({ mass, acceleration }) => mass * acceleration
  });

  registerFormula("kineticEnergy", {
    description: "Ek = 1/2 m v²",
    inputs: { mass: "kg", speed: "m/s" },
    output: "J",
    fn: ({ mass, speed }) => 0.5 * mass * speed * speed
  });

  registerFormula("pressure", {
    description: "p = F / A",
    inputs: { force: "N", area: "m2" },
    output: "Pa",
    fn: ({ force, area }) => {
      if (area <= 0) throw new Error("Area must be positive.");
      return force / area;
    }
  });

  registerFormula("power", {
    description: "P = E / t",
    inputs: { energy: "J", time: "s" },
    output: "W",
    fn: ({ energy, time }) => {
      if (time === 0) throw new Error("Time cannot be zero.");
      return energy / time;
    }
  });

  registerFormula("heat", {
    description: "Q = m c ΔT",
    inputs: {
      mass: "kg",
      specificHeat: "J/(kg*K)",
      deltaTemperature: "K"
    },
    output: "J",
    fn: ({ mass, specificHeat, deltaTemperature }) =>
      mass * specificHeat * deltaTemperature
  });

  // ==========================================================
  // 14. REGISTRY PERSISTENCE
  // ==========================================================

  function loadJSON(key, fallback) {
    try {
      if (typeof localStorage === "undefined") return fallback;
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn("[MathKitch] Storage read failed:", error);
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      if (!MK.config.persist || typeof localStorage === "undefined") return false;
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("[MathKitch] Storage write failed:", error);
      return false;
    }
  }

  function loadRegistry() {
    const saved = loadJSON(STORAGE.ingredients, {});

    if (safeObject(saved)) {
      for (const [id, item] of Object.entries(saved)) {
        if (safeObject(item) && item.id === id) {
          MK.registry[id] = item;
        }
      }
    }

    const settings = loadJSON(STORAGE.settings, null);

    if (safeObject(settings)) {
      MK.config = { ...MK.config, ...settings };
    }
  }

  function saveRegistry() {
    saveJSON(STORAGE.ingredients, MK.registry);
  }

  // ==========================================================
  // 15. CROSS-MOD DISCOVERY AND ADAPTERS
  // ==========================================================

  function discoverRegistries() {
    const candidates = [
      ["ingredients", window.ingredients],
      ["INGREDIENTS", window.INGREDIENTS],
      ["ingredientList", window.ingredientList],
      ["elements", window.elements],
      ["foods", window.foods]
    ];

    for (const [name, registry] of candidates) {
      if (registry && typeof registry === "object") {
        MK.sources[name] = registry;
      }
    }

    return Object.keys(MK.sources);
  }

  function getSourceIngredient(id) {
    const target = normalizeID(id);

    for (const [sourceName, source] of Object.entries(MK.sources)) {
      let item = null;

      if (Array.isArray(source)) {
        item = source.find(x =>
          normalizeID(x?.id ?? x?.key ?? x?.name) === target);
      } else if (own(source, target)) {
        item = source[target];
      }

      if (item != null) return { sourceName, item };
    }

    return null;
  }

  function ingredientName(id) {
    const generated = MK.registry[id];
    if (generated) return generated.name;

    const result = getSourceIngredient(id);
    if (!result) return id;

    const item = result.item;

    if (typeof item === "string") return item;

    return String(item.name ?? item.label ?? item.title ?? id);
  }

  MK.discover = discoverRegistries;

  MK.registerAdapter = (name, adapter) => {
    if (!name || !safeObject(adapter)) {
      throw new Error("Adapter name and object required.");
    }

    MK.adapters[name] = adapter;

    return () => {
      delete MK.adapters[name];
    };
  };

  // ==========================================================
  // 16. INGREDIENT PROFILES AND PROVENANCE
  // ==========================================================

  const profiles = Object.create(null);

  const defaultAggregationRules = {
    proteinG: "sum",
    carbohydrateG: "sum",
    fatG: "sum",
    fiberG: "sum",
    waterG: "sum",
    sugarG: "sum",
    starchG: "sum",
    sodiumMg: "sum",
    potassiumMg: "sum",
    calciumMg: "sum",
    ironMg: "sum",
    vitaminCMg: "sum",
    massKg: "sum",
    volumeM3: "sum",
    densityKgM3: "weightedMean",
    temperatureK: "weightedMean",
    pH: "weightedMean",
    viscosityPaS: "weightedMean"
  };

  function registerIngredient(id, spec = {}) {
    id = normalizeID(id);

    const properties = safeObject(spec.properties) ? spec.properties : {};

    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === "number" && !Number.isFinite(value)) {
        throw new Error("Invalid property value: " + key);
      }
    }

    profiles[id] = {
      id,
      name: String(spec.name || id),
      properties: { ...properties },
      source: spec.source || "external",
      quality: spec.quality || "unknown",
      provenance: {
        type: "source",
        source: spec.source || "external",
        timestamp: new Date().toISOString()
      }
    };

    saveJSON(STORAGE.profiles, profiles);

    return profiles[id];
  }

  function getProfile(id) {
    id = normalizeID(id);

    if (profiles[id]) return profiles[id];

    const item = MK.registry[id];

    if (item?.profile) return item.profile;

    if (item?.mathkitchProfile) return item.mathkitchProfile;

    return null;
  }

  function aggregateProperties(components, rules = defaultAggregationRules) {
    const result = {};
    const keys = new Set();

    components.forEach(component =>
      Object.keys(component.properties || {}).forEach(key => keys.add(key)));

    for (const key of keys) {
      const entries = components
        .filter(component => component.properties?.[key] != null)
        .map(component => ({
          value: component.properties[key],
          mass: Number(component.properties.massKg ?? 1)
        }))
        .filter(entry => typeof entry.value === "number" &&
          Number.isFinite(entry.value));

      if (!entries.length) continue;

      const values = entries.map(entry => entry.value);
      const rule = rules[key] || "mean";

      if (rule === "sum") {
        result[key] = stats.sum(values);
      } else if (rule === "min") {
        result[key] = Math.min(...values);
      } else if (rule === "max") {
        result[key] = Math.max(...values);
      } else if (rule === "first") {
        result[key] = values[0];
      } else if (rule === "weightedMean") {
        const totalWeight = stats.sum(entries.map(entry => entry.mass));

        result[key] = totalWeight > 0 ?
          stats.sum(entries.map(entry => entry.value * entry.mass)) /
          totalWeight : null;
      } else {
        result[key] = stats.mean(values);
      }
    }

    return result;
  }

  function createProfile(ingredient, sourceProfiles, options = {}) {
    const components = sourceProfiles.filter(Boolean);

    const profile = {
      id: ingredient.id,
      name: ingredient.name,
      combinationKey: ingredient.combinationKey,
      ingredientIDs: [...ingredient.ingredients],
      properties: aggregateProperties(
        components,
        options.aggregationRules || defaultAggregationRules
      ),
      provenance: {
        engine: "MathKitch",
        version: MK.version,
        method: "recursive-aggregation",
        sourceIDs: [...ingredient.ingredients],
        missingSources: ingredient.ingredients.filter(id =>
          !getProfile(id) && !MK.registry[id]),
        quality: components.length === sourceProfiles.length ?
          "derived" : "partial",
        timestamp: new Date().toISOString()
      }
    };

    ingredient.profile = profile;
    profiles[ingredient.id] = profile;

    saveJSON(STORAGE.profiles, profiles);
    saveRegistry();

    if (typeof CustomEvent !== "undefined") {
      window.dispatchEvent(new CustomEvent("mathkitch:profile", {
        detail: profile
      }));
    }

    return profile;
  }

  MK.registerIngredient = registerIngredient;
  MK.getProfile = getProfile;
  MK.aggregateProperties = aggregateProperties;
  MK.aggregationRules = defaultAggregationRules;

  // ==========================================================
  // 17. RECIPE / GAME INTEGRATION
  // ==========================================================

  function tryRegisterInGame(ingredient) {
    const results = [];

    for (const [name, adapter] of Object.entries(MK.adapters)) {
      if (typeof adapter.registerIngredient === "function") {
        try {
          const result = adapter.registerIngredient(ingredient);
          results.push({ adapter: name, ok: true, result: result ?? null });
        } catch (error) {
          results.push({ adapter: name, ok: false, error: String(error) });
        }
      }
    }

    // Compatibility attempt only: addRecipe is not assumed to
    // register a new ingredient, because its signature is game-specific.
    if (typeof window.addRecipe === "function") {
      results.push({
        adapter: "addRecipe",
        ok: false,
        reason: "Recipe API detected; native signature not assumed."
      });
    }

    return results;
  }

  // ==========================================================
  // 18. INGREDIENT SYNTHESIS
  // ==========================================================

  function combine(...ids) {
    discoverRegistries();

    const canonical = canonicalIDs(ids);
    const key = JSON.stringify(canonical);
    const id = uniqueID(canonical);

    if (MK.registry[id]) return MK.registry[id];

    const ingredient = {
      id,
      name: "MathKitch [" + canonical.map(ingredientName).join(" + ") + "]",
      ingredients: canonical,
      combinationKey: key,
      createdAt: new Date().toISOString(),
      engineVersion: MK.version,
      nutrition: null,
      profile: null,
      registration: {
        status: "local",
        adapters: []
      }
    };

    MK.registry[id] = ingredient;
    saveRegistry();

    const sourceProfiles = canonical.map(sourceID => {
      const profile = getProfile(sourceID);

      if (profile) return profile;

      const nested = MK.registry[sourceID];

      if (nested) {
        return nested.profile || {
          id: nested.id,
          name: nested.name,
          properties: {},
          quality: "unknown"
        };
      }

      const external = getSourceIngredient(sourceID);

      if (external) {
        const item = external.item;

        // No nutrition values are invented if the source schema
        // is unknown. Mods can register a proper profile explicitly.
        return {
          id: sourceID,
          name: ingredientName(sourceID),
          properties: {},
          source: external.sourceName,
          quality: "unknown"
        };
      }

      return null;
    });

    const profile = createProfile(ingredient, sourceProfiles);

    const p = profile.properties;

    if (["proteinG", "carbohydrateG", "fatG", "fiberG"]
      .some(k => typeof p[k] === "number")) {
      ingredient.nutrition = {
        protein: p.proteinG || 0,
        carbohydrate: p.carbohydrateG || 0,
        fat: p.fatG || 0,
        fiber: p.fiberG || 0,
        energyKcal: food.energyKcal({
          protein: p.proteinG || 0,
          carbohydrate: p.carbohydrateG || 0,
          fat: p.fatG || 0,
          fiber: p.fiberG || 0
        }),
        quality: profile.provenance.quality
      };
    }

    ingredient.registration.adapters = tryRegisterInGame(ingredient);

    window.dispatchEvent(new CustomEvent("mathkitch:created", {
      detail: ingredient
    }));

    saveRegistry();

    return ingredient;
  }

  MK.combine = combine;
  MK.combineAdvanced = combine;
  MK.get = id => MK.registry[id] || null;
  MK.getAll = () => Object.values(MK.registry);
  MK.getNutrition = id => MK.registry[id]?.nutrition || null;

  MK.onCreate = callback => {
    const listener = event => callback(event.detail);
    window.addEventListener("mathkitch:created", listener);

    return () => window.removeEventListener("mathkitch:created", listener);
  };

  MK.onProfile = callback => {
    const listener = event => callback(event.detail);
    window.addEventListener("mathkitch:profile", listener);

    return () => window.removeEventListener("mathkitch:profile", listener);
  };

  // ==========================================================
  // 19. IMPORT / EXPORT
  // ==========================================================

  MK.exportDatabase = () => JSON.stringify({
    format: "MathKitch",
    version: MK.version,
    exportedAt: new Date().toISOString(),
    ingredients: MK.registry,
    profiles
  }, null, 2);

  MK.importDatabase = json => {
    const data = typeof json === "string" ? JSON.parse(json) : json;

    if (!safeObject(data) || data.format !== "MathKitch") {
      throw new Error("Invalid MathKitch database.");
    }

    if (safeObject(data.ingredients)) {
      for (const [id, ingredient] of Object.entries(data.ingredients)) {
        if (safeObject(ingredient) &&
            ingredient.id === id &&
            Array.isArray(ingredient.ingredients)) {
          MK.registry[id] = ingredient;
        }
      }
    }

    if (safeObject(data.profiles)) {
      for (const [id, profile] of Object.entries(data.profiles)) {
        if (safeObject(profile) && profile.id === id) {
          profiles[id] = profile;
        }
      }
    }

    saveRegistry();
    saveJSON(STORAGE.profiles, profiles);

    return {
      ingredients: Object.keys(MK.registry).length,
      profiles: Object.keys(profiles).length
    };
  };

  MK.clearDatabase = () => {
    MK.registry = Object.create(null);

    for (const key of Object.keys(profiles)) delete profiles[key];

    saveRegistry();
    saveJSON(STORAGE.profiles, profiles);
  };

  // ==========================================================
  // 20. USER INTERFACE
  // ==========================================================

  function createPanel() {
    if (!hasDOM || document.getElementById("mathkitch-panel")) return;

    const style = document.createElement("style");

    style.textContent = `
      #mathkitch-panel {
        position: fixed;
        right: 14px;
        bottom: 14px;
        z-index: 999999;
        width: min(410px, calc(100vw - 28px));
        max-height: min(80vh, 740px);
        overflow: auto;
        padding: 14px;
        border-radius: 12px;
        background: #20252c;
        color: #f4f6f8;
        font: 13px/1.5 system-ui, sans-serif;
        box-shadow: 0 6px 30px #0007;
      }
      #mathkitch-panel input,
      #mathkitch-panel select,
      #mathkitch-panel button,
      #mathkitch-panel textarea {
        box-sizing: border-box;
        width: 100%;
        padding: 9px;
        margin-top: 7px;
        border-radius: 6px;
        border: 1px solid #56616d;
      }
      #mathkitch-panel input,
      #mathkitch-panel select,
      #mathkitch-panel textarea {
        background: #111820;
        color: white;
      }
      #mathkitch-panel button {
        cursor: pointer;
        background: #e8b85d;
        color: #171717;
        font-weight: 700;
      }
      #mathkitch-panel .mk-secondary {
        background: #343b44;
        color: white;
      }
      #mathkitch-panel pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        max-height: 240px;
        overflow: auto;
        padding: 8px;
        background: #111820;
        border-radius: 6px;
      }
      #mathkitch-panel .mk-muted {
        color: #bdc6d0;
      }
      #mathkitch-panel .mk-row {
        display: flex;
        gap: 8px;
      }
      #mathkitch-panel .mk-row button {
        flex: 1;
      }
    `;

    document.head.appendChild(style);

    const panel = document.createElement("section");
    panel.id = "mathkitch-panel";

    panel.innerHTML = `
      <strong>MathKitch.js <span class="mk-muted">v${MK.version}</span></strong>
      <p class="mk-muted">
        Combina ingredienti usando i loro ID. I dati non disponibili
        nelle mod sorgenti restano sconosciuti, non vengono inventati.
      </p>
      <label for="mk-ids">Ingredient IDs</label>
      <input id="mk-ids" placeholder="apple, milk, bread">
      <button id="mk-create">Crea / recupera ingrediente</button>
      <div class="mk-row">
        <button class="mk-secondary" id="mk-list">Archivio</button>
        <button class="mk-secondary" id="mk-units">Unità</button>
      </div>
      <div class="mk-row">
        <button class="mk-secondary" id="mk-export">Esporta JSON</button>
        <button class="mk-secondary" id="mk-close">Chiudi</button>
      </div>
      <pre id="mk-output">MathKitch pronto.</pre>
    `;

    document.body.appendChild(panel);

    const output = panel.querySelector("#mk-output");

    panel.querySelector("#mk-create").addEventListener("click", () => {
      try {
        const ids = panel.querySelector("#mk-ids").value
          .split(",")
          .map(x => x.trim())
          .filter(Boolean);

        const ingredient = combine(...ids);

        output.textContent = JSON.stringify({
          id: ingredient.id,
          name: ingredient.name,
          ingredients: ingredient.ingredients,
          nutrition: ingredient.nutrition,
          profile: ingredient.profile,
          registration: ingredient.registration
        }, null, 2);
      } catch (error) {
        output.textContent = "Errore: " + error.message;
      }
    });

    panel.querySelector("#mk-list").addEventListener("click", () => {
      output.textContent = JSON.stringify(
        MK.getAll().slice(0, MK.config.maxDisplayItems),
        null,
        2
      );
    });

    panel.querySelector("#mk-units").addEventListener("click", () => {
      output.textContent = JSON.stringify({
        quantities: Object.keys(quantityCatalog).length,
        units: Object.keys(UNITS),
        formulas: Object.keys(MK.formulas)
      }, null, 2);
    });

    panel.querySelector("#mk-export").addEventListener("click", () => {
      const json = MK.exportDatabase();

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(json)
          .then(() => {
            output.textContent = "Database JSON copiato negli appunti.";
          })
          .catch(() => {
            output.textContent = json;
          });
      } else {
        output.textContent = json;
      }
    });

    panel.querySelector("#mk-close").addEventListener("click", () => {
      panel.remove();
    });
  }

  // ==========================================================
  // 21. BOOT
  // ==========================================================

  loadRegistry();

  const savedProfiles = loadJSON(STORAGE.profiles, {});

  if (safeObject(savedProfiles)) {
    for (const [id, profile] of Object.entries(savedProfiles)) {
      if (safeObject(profile) && profile.id === id) {
        profiles[id] = profile;
      }
    }
  }

  discoverRegistries();

  // Expose API before creating the panel.
  window.MathKitch = MK;

  if (hasDOM && MK.config.showPanel) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", createPanel, {
        once: true
      });
    } else {
      createPanel();
    }
  }

  console.info("[MathKitch] Loaded", MK.version);
  console.info("[MathKitch] Units:", Object.keys(UNITS).length);
  console.info("[MathKitch] Quantities:", Object.keys(quantityCatalog).length);
  console.info("[MathKitch] Formulas:", Object.keys(MK.formulas).length);
  console.info("[MathKitch] Ingredient registries discovered:", Object.keys(MK.sources));
})();
