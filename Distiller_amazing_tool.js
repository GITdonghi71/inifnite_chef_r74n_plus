
/*
 * distiller.js
 * Infinite Chef R74N+
 * Version 3.0.0
 *
 * - Pulsante sempre visibile
 * - Registrazione ritardata del tool di gioco
 * - Laboratorio di formule matematiche e fisiche
 * - Unità SI e prefissi
 * - Riconoscimento di simboli, funzioni e operatori
 * - Database dinamico in localStorage
 * - Distillazione dei 3 ingredienti
 * - Esportazione JSON
 *
 * Nessun eval() o Function().
 */
(function () {
    "use strict";

    if (window.__IC_DISTILLER_V3__) return;
    window.__IC_DISTILLER_V3__ = true;

    const PREFIX = "ic-distiller";
    const DB_KEY = "ic_distiller_database_v3";
    const UNIT_KEY = "ic_distiller_units_v3";
    const VERSION = "3.0.0";

    const state = { selected: [] };
    let panel = null;
    let statusNode = null;
    let selectionNode = null;
    let databaseNode = null;
    let formulaDatabaseNode = null;
    let formulaInput = null;
    let unitInput = null;
    let apiReady = false;
    let toolRegistered = false;

    let discoveries = readDB(DB_KEY, []);
    let formulas = readDB("ic_distiller_formulas_v3", []);
    let customUnits = readDB(UNIT_KEY, []);

    function readDB(key, fallback) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "null");
            return data === null ? fallback : data;
        } catch (_) {
            return fallback;
        }
    }

    function saveDB() {
        try {
            localStorage.setItem(DB_KEY, JSON.stringify(discoveries));
            localStorage.setItem(UNIT_KEY, JSON.stringify(customUnits));
            localStorage.setItem(
                "ic_distiller_formulas_v3",
                JSON.stringify(formulas)
            );
            return true;
        } catch (error) {
            console.warn("[Distiller] Salvataggio non riuscito:", error);
            return false;
        }
    }

    function status(message) {
        console.log("[Distiller]", message);
        if (statusNode) statusNode.textContent = message;
    }

    function hash(text) {
        let h = 2166136261;
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return (h >>> 0).toString(16);
    }

    function prettyName(id) {
        return String(id || "unknown")
            .replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    // ------------------------------------------------------
    // 1. UNITÀ SI
    // Dimensioni: lunghezza, massa, tempo, corrente,
    // temperatura, quantità di sostanza, intensità luminosa.
    // ------------------------------------------------------

    const Z = [0, 0, 0, 0, 0, 0, 0];

    const SI = {
        m:   { name: "metro", factor: 1, d: [1,0,0,0,0,0,0], p: true },
        kg:  { name: "chilogrammo", factor: 1, d: [0,1,0,0,0,0,0] },
        g:   { name: "grammo", factor: 1e-3, d: [0,1,0,0,0,0,0], p: true },
        s:   { name: "secondo", factor: 1, d: [0,0,1,0,0,0,0], p: true },
        A:   { name: "ampere", factor: 1, d: [0,0,0,1,0,0,0], p: true },
        K:   { name: "kelvin", factor: 1, d: [0,0,0,0,1,0,0], p: true },
        mol: { name: "mole", factor: 1, d: [0,0,0,0,0,1,0], p: true },
        cd:  { name: "candela", factor: 1, d: [0,0,0,0,0,0,1], p: true },

        Hz:  { name: "hertz", factor: 1, d: [0,0,-1,0,0,0,0], p: true },
        N:   { name: "newton", factor: 1, d: [1,1,-2,0,0,0,0], p: true },
        Pa:  { name: "pascal", factor: 1, d: [-1,1,-2,0,0,0,0], p: true },
        J:   { name: "joule", factor: 1, d: [2,1,-2,0,0,0,0], p: true },
        W:   { name: "watt", factor: 1, d: [2,1,-3,0,0,0,0], p: true },
        C:   { name: "coulomb", factor: 1, d: [0,0,1,1,0,0,0], p: true },
        V:   { name: "volt", factor: 1, d: [2,1,-3,-1,0,0,0], p: true },
        F:   { name: "farad", factor: 1, d: [-2,-1,4,2,0,0,0], p: true },
        Ohm: { name: "ohm", factor: 1, d: [2,1,-3,-2,0,0,0], p: true },
        S:   { name: "siemens", factor: 1, d: [-2,-1,3,2,0,0,0], p: true },
        Wb:  { name: "weber", factor: 1, d: [2,1,-2,-1,0,0,0], p: true },
        T:   { name: "tesla", factor: 1, d: [0,1,-2,-1,0,0,0], p: true },
        H:   { name: "henry", factor: 1, d: [2,1,-2,-2,0,0,0], p: true },
        lm:  { name: "lumen", factor: 1, d: [0,0,0,0,0,0,1], p: true },
        lx:  { name: "lux", factor: 1, d: [-2,0,0,0,0,0,1], p: true },
        Bq:  { name: "becquerel", factor: 1, d: [0,0,-1,0,0,0,0], p: true },
        Gy:  { name: "gray", factor: 1, d: [2,0,-2,0,0,0,0], p: true },
        Sv:  { name: "sievert", factor: 1, d: [2,0,-2,0,0,0,0], p: true },
        kat: { name: "katal", factor: 1, d: [0,0,-1,0,0,1,0], p: true },

        min: { name: "minuto", factor: 60, d: [0,0,1,0,0,0,0] },
        h:   { name: "ora", factor: 3600, d: [0,0,1,0,0,0,0] },
        L:   { name: "litro", factor: 1e-3, d: [3,0,0,0,0,0,0], p: true },
        rad: { name: "radiante", factor: 1, d: Z },
        deg: { name: "grado", factor: Math.PI / 180, d: Z }
    };

    const PREFIXES = [
        ["da",1e1], ["Q",1e30], ["R",1e27], ["Y",1e24],
        ["Z",1e21], ["E",1e18], ["P",1e15], ["T",1e12],
        ["G",1e9], ["M",1e6], ["k",1e3], ["h",1e2],
        ["d",1e-1], ["c",1e-2], ["m",1e-3], ["u",1e-6],
        ["µ",1e-6], ["n",1e-9], ["p",1e-12], ["f",1e-15]
    ].sort((a, b) => b[0].length - a[0].length);

    function getUnit(symbol) {
        if (SI[symbol]) return { ...SI[symbol], symbol };

        const custom = customUnits.find(u => u.name === symbol);
        if (custom) {
            return {
                name: custom.name,
                symbol,
                factor: custom.factor,
                d: custom.d,
                p: false,
                custom: true
            };
        }

        for (const [prefix, factor] of PREFIXES) {
            if (!symbol.startsWith(prefix)) continue;

            const baseName = symbol.slice(prefix.length);
            const base = SI[baseName];

            if (!base || !base.p) continue;

            return {
                ...base,
                symbol,
                name: prefix + base.name,
                factor: factor * base.factor,
                prefixed: true
            };
        }

        return null;
    }

    function addCustomUnit() {
        const raw = prompt(
            "Definisci un'unità personalizzata.\n" +
            "Formato: simbolo = dimensione = fattore SI\n\n" +
            "Esempi:\nkmx = length = 1000\n" +
            "Dimensioni: length, mass, time, current, temperature,\n" +
            "amount, luminous, dimensionless"
        );

        if (!raw) return;

        const parts = raw.split("=").map(x => x.trim());
        if (parts.length !== 3) {
            status("Formato non valido.");
            return;
        }

        const [name, dimension, factorText] = parts;
        const factor = Number(factorText);

        const dimensions = {
            length: [1,0,0,0,0,0,0],
            mass: [0,1,0,0,0,0,0],
            time: [0,0,1,0,0,0,0],
            current: [0,0,0,1,0,0,0],
            temperature: [0,0,0,0,1,0,0],
            amount: [0,0,0,0,0,1,0],
            luminous: [0,0,0,0,0,0,1],
            dimensionless: Z
        };

        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name) ||
            !dimensions[dimension] ||
            !Number.isFinite(factor) || factor <= 0 ||
            getUnit(name)) {
            status("Unità, dimensione o fattore non valido.");
            return;
        }

        customUnits.push({
            name,
            dimension,
            factor,
            d: dimensions[dimension],
            source: "user"
        });

        saveDB();
        renderPanel();
        status("Unità personalizzata aggiunta: " + name);
    }

    // ------------------------------------------------------
    // 2. NORMALIZZAZIONE MATEMATICA E LATEX
    // ------------------------------------------------------

    function normalize(source) {
        let s = String(source).trim();

        if (!s) throw new Error("Inserisci una formula.");
        if (s.length > 4000) throw new Error("Formula troppo lunga.");

        const replacements = [
            [/\\cdot\b/g, "*"],
            [/\\times\b/g, "*"],
            [/\\div\b/g, "/"],
            [/\\sin\b/g, "sin"],
            [/\\cos\b/g, "cos"],
            [/\\tan\b/g, "tan"],
            [/\\sqrt\b/g, "sqrt"],
            [/\\pi\b/g, "pi"],
            [/\\ln\b/g, "ln"],
            [/\\log\b/g, "log"],
            [/\\exp\b/g, "exp"],
            [/×/g, "*"],
            [/·/g, "*"],
            [/÷/g, "/"],
            [/−/g, "-"],
            [/π/g, "pi"],
            [/²/g, "^2"],
            [/³/g, "^3"],
            [/°\s*C\b/g, "degC"],
            [/°\s*F\b/g, "degF"]
        ];

        for (const [pattern, replacement] of replacements) {
            s = s.replace(pattern, replacement);
        }

        // \frac{a}{b} e \sqrt{x}: conversione limitata e verificabile.
        function groupAt(text, start) {
            if (text[start] !== "{") return null;
            let depth = 1;

            for (let i = start + 1; i < text.length; i++) {
                if (text[i] === "{") depth++;
                if (text[i] === "}") depth--;

                if (depth === 0) {
                    return {
                        value: text.slice(start + 1, i),
                        end: i + 1
                    };
                }
            }

            throw new Error("Parentesi graffe LaTeX non bilanciate.");
        }

        for (let pass = 0; pass < 20; pass++) {
            let changed = false;
            let out = "";
            let i = 0;

            while (i < s.length) {
                const cmd = s.startsWith("\\frac", i) ? "\\frac" :
                    s.startsWith("\\sqrt", i) ? "\\sqrt" : null;

                if (!cmd) {
                    out += s[i++];
                    continue;
                }

                let p = i + cmd.length;
                while (/\s/.test(s[p] || "")) p++;

                const first = groupAt(s, p);
                if (!first) throw new Error("Argomento LaTeX mancante.");

                if (cmd === "\\sqrt") {
                    out += "sqrt(" + first.value + ")";
                    i = first.end;
                } else {
                    p = first.end;
                    while (/\s/.test(s[p] || "")) p++;

                    const second = groupAt(s, p);
                    if (!second) {
                        throw new Error("\\frac richiede numeratore e denominatore.");
                    }

                    out += "((" + first.value + ")/(" + second.value + "))";
                    i = second.end;
                }

                changed = true;
            }

            s = out;
            if (!changed) break;
        }

        if (/\\[A-Za-z]+/.test(s)) {
            throw new Error("Comando LaTeX non supportato: " +
                s.match(/\\[A-Za-z]+/)[0]);
        }

        return s;
    }

    // ------------------------------------------------------
    // 3. TOKENIZER E PARSER
    // ------------------------------------------------------

    function tokenize(source) {
        const tokens = [];
        const re = /\s+|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[\p{L}_][\p{L}\p{N}_]*|[()+\-*/^=,]/giu;
        let position = 0;
        let match;

        while ((match = re.exec(source)) !== null) {
            if (match.index !== position) {
                throw new Error("Simbolo non riconosciuto vicino a: " +
                    source.slice(position, position + 12));
            }

            position = re.lastIndex;
            const raw = match[0];
            if (/^\s+$/.test(raw)) continue;

            if (/^(?:\d|\.)/.test(raw)) {
                tokens.push({ type: "number", value: Number(raw), raw });
            } else if (/^[\p{L}_]/u.test(raw)) {
                tokens.push({ type: "id", value: raw, raw });
            } else {
                tokens.push({ type: raw, value: raw, raw });
            }
        }

        if (position !== source.length) {
            throw new Error("Carattere non riconosciuto: " +
                source.slice(position, position + 12));
        }

        tokens.push({ type: "EOF", value: null });
        return tokens;
    }

    function parse(source) {
        const tokens = tokenize(source);
        let i = 0;
        let nodes = 0;

        const peek = () => tokens[i];
        const take = () => tokens[i++];

        function make(type, props) {
            if (++nodes > 1000) throw new Error("Formula troppo complessa.");
            return { type, ...props };
        }

        function expect(type) {
            if (peek().type !== type) {
                throw new Error("Atteso '" + type + "'.");
            }
            return take();
        }

        function beginsPrimary(t) {
            return t.type === "number" ||
                t.type === "id" || t.type === "(";
        }

        function expression(depth = 0) {
            if (depth > 80) throw new Error("Troppe parentesi annidate.");

            let a = term(depth + 1);

            while (peek().type === "+" || peek().type === "-") {
                const op = take().type;
                a = make("binary", {
                    op, left: a, right: term(depth + 1)
                });
            }

            return a;
        }

        function term(depth) {
            let a = unary(depth + 1);

            while (true) {
                if (peek().type === "*" || peek().type === "/") {
                    const op = take().type;
                    a = make("binary", {
                        op, left: a, right: unary(depth + 1)
                    });
                } else if (beginsPrimary(peek())) {
                    a = make("binary", {
                        op: "*", left: a, right: unary(depth + 1)
                    });
                } else {
                    break;
                }
            }

            return a;
        }

        function unary(depth) {
            if (peek().type === "+" || peek().type === "-") {
                const op = take().type;
                return make("unary", { op, value: unary(depth + 1) });
            }
            return power(depth + 1);
        }

        function power(depth) {
            let a = primary(depth + 1);

            if (peek().type === "^") {
                take();
                a = make("binary", {
                    op: "^", left: a, right: unary(depth + 1)
                });
            }

            return a;
        }

        function primary(depth) {
            const t = peek();

            if (t.type === "number") {
                take();
                return make("number", { value: t.value });
            }

            if (t.type === "id") {
                take();

                if (peek().type === "(") {
                    take();
                    const args = [];

                    if (peek().type !== ")") {
                        args.push(expression(depth + 1));

                        while (peek().type === ",") {
                            take();
                            args.push(expression(depth + 1));
                        }
                    }

                    expect(")");
                    return make("call", { name: t.value, args });
                }

                return make("id", { name: t.value });
            }

            if (t.type === "(") {
                take();
                const a = expression(depth + 1);
                expect(")");
                return a;
            }

            throw new Error("Espressione incompleta.");
        }

        const left = expression();

        if (peek().type === "=") {
            take();
            const right = expression();
            if (peek().type !== "EOF") {
                throw new Error("Testo inatteso dopo l'equazione.");
            }
            return make("equation", { left, right });
        }

        if (peek().type !== "EOF") {
            throw new Error("Token inatteso: " + peek().raw);
        }

        return left;
    }

    // ------------------------------------------------------
    // 4. ANALISI SEMANTICA E DIMENSIONALE
    // ------------------------------------------------------

    const FUNCTIONS = new Set([
        "sin", "cos", "tan", "asin", "acos", "atan",
        "sqrt", "abs", "exp", "ln", "log"
    ]);

    const CONSTANTS = {
        pi: Math.PI,
        e: Math.E,
        c: 299792458,
        g0: 9.80665,
        hPlanck: 6.62607015e-34,
        kB: 1.380649e-23,
        N_A: 6.02214076e23
    };

    function dimEqual(a, b) {
        return a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
    }

    function dimAdd(a, b) {
        return a.map((v, i) => v + b[i]);
    }

    function dimSub(a, b) {
        return a.map((v, i) => v - b[i]);
    }

    function dimScale(a, n) {
        return a.map(v => v * n);
    }

    function dimLabel(d) {
        const names = ["m", "kg", "s", "A", "K", "mol", "cd"];
        const pieces = [];

        d.forEach((power, i) => {
            if (Math.abs(power) < 1e-9) return;
            pieces.push(names[i] +
                (power === 1 ? "" : "^" + power));
        });

        return pieces.length ? pieces.join("·") : "1 (adimensionale)";
    }

    function analyzeAST(ast) {
        const found = {
            units: [],
            functions: [],
            constants: [],
            variables: [],
            operators: [],
            numbers: []
        };

        function walk(n) {
            if (n.type === "number") found.numbers.push(n.value);

            if (n.type === "id") {
                const unit = getUnit(n.name);

                if (unit) found.units.push(n.name);
                else if (Object.prototype.hasOwnProperty.call(CONSTANTS, n.name)) {
                    found.constants.push(n.name);
                } else {
                    found.variables.push(n.name);
                }
            }

            if (n.type === "unary") {
                found.operators.push(n.op);
                walk(n.value);
            }

            if (n.type === "binary") {
                found.operators.push(n.op);
                walk(n.left);
                walk(n.right);
            }

            if (n.type === "call") {
                found.functions.push(n.name);
                n.args.forEach(walk);
            }

            if (n.type === "equation") {
                found.operators.push("=");
                walk(n.left);
                walk(n.right);
            }
        }

        walk(ast);

        for (const key of Object.keys(found)) {
            found[key] = [...new Set(found[key])];
        }

        return found;
    }

    function evaluate(ast) {
        switch (ast.type) {
            case "number":
                return { known: true, value: ast.value, d: [...Z] };

            case "id": {
                const unit = getUnit(ast.name);

                if (unit) {
                    return {
                        known: true,
                        value: unit.factor,
                        d: [...unit.d],
                        unit: ast.name
                    };
                }

                if (Object.prototype.hasOwnProperty.call(CONSTANTS, ast.name)) {
                    return { known: true, value: CONSTANTS[ast.name], d: [...Z] };
                }

                return { known: false, d: [...Z] };
            }

            case "unary": {
                const a = evaluate(ast.value);
                return a.known
                    ? { ...a, value: ast.op === "-" ? -a.value : a.value }
                    : a;
            }

            case "binary": {
                const a = evaluate(ast.left);
                const b = evaluate(ast.right);

                if (!a.known || !b.known) {
                    return { known: false, d: [...Z] };
                }

                if (ast.op === "+" || ast.op === "-") {
                    if (!dimEqual(a.d, b.d)) {
                        throw new Error(
                            "Somma o sottrazione tra dimensioni incompatibili: " +
                            dimLabel(a.d) + " e " + dimLabel(b.d)
                        );
                    }

                    return {
                        known: true,
                        value: ast.op === "+" ? a.value + b.value : a.value - b.value,
                        d: [...a.d]
                    };
                }

                if (ast.op === "*") {
                    return {
                        known: true,
                        value: a.value * b.value,
                        d: dimAdd(a.d, b.d)
                    };
                }

                if (ast.op === "/") {
                    if (b.value === 0) throw new Error("Divisione per zero.");

                    return {
                        known: true,
                        value: a.value / b.value,
                        d: dimSub(a.d, b.d)
                    };
                }

                if (ast.op === "^") {
                    if (!dimEqual(b.d, Z)) {
                        throw new Error("L'esponente deve essere adimensionale.");
                    }

                    if (!dimEqual(a.d, Z) && !Number.isInteger(b.value)) {
                        throw new Error(
                            "Le potenze di unità fisiche richiedono esponenti interi."
                        );
                    }

                    return {
                        known: true,
                        value: Math.pow(a.value, b.value),
                        d: dimScale(a.d, b.value)
                    };
                }

                throw new Error("Operatore non supportato.");
            }

            case "call": {
                if (!FUNCTIONS.has(ast.name)) {
                    throw new Error("Funzione non supportata: " + ast.name);
                }

                if (ast.args.length !== 1) {
                    throw new Error(ast.name + "() richiede un argomento.");
                }

                const a = evaluate(ast.args[0]);

                if (!a.known) return { known: false, d: [...Z] };

                if (ast.name === "sqrt") {
                    if (a.value < 0) throw new Error("Radice negativa non reale.");

                    if (a.d.some(v => Math.abs(v / 2 - Math.round(v / 2)) > 1e-9)) {
                        throw new Error("Dimensioni non compatibili con sqrt().");
                    }

                    return {
                        known: true,
                        value: Math.sqrt(a.value),
                        d: dimScale(a.d, 0.5)
                    };
                }

                if (!dimEqual(a.d, Z)) {
                    throw new Error(
                        ast.name + "() richiede un argomento adimensionale. " +
                        "Converti prima la quantità in un rapporto adimensionale."
                    );
                }

                const fn = {
                    sin: Math.sin,
                    cos: Math.cos,
                    tan: Math.tan,
                    asin: Math.asin,
                    acos: Math.acos,
                    atan: Math.atan,
                    abs: Math.abs,
                    exp: Math.exp,
                    ln: Math.log,
                    log: Math.log10
                }[ast.name];

                return { known: true, value: fn(a.value), d: [...Z] };
            }

            case "equation": {
                const a = evaluate(ast.left);
                const b = evaluate(ast.right);

                if (!a.known || !b.known) {
                    return { known: false, equation: true };
                }

                if (!dimEqual(a.d, b.d)) {
                    throw new Error(
                        "I due membri dell'equazione hanno dimensioni diverse."
                    );
                }

                return {
                    known: true,
                    equation: true,
                    value: { left: a.value, right: b.value },
                    d: a.d,
                    equal: Math.abs(a.value - b.value) < 1e-9
                };
            }

            default:
                throw new Error("Nodo matematico sconosciuto.");
        }
    }

    function interpretFormula(source) {
        const normalized = normalize(source);
        const ast = parse(normalized);
        const components = analyzeAST(ast);

        // Non si promuovono variabili sconosciute a unità SI.
        const result = evaluate(ast);

        return {
            original: source.trim(),
            normalized,
            components,
            result,
            status: result.known ? "calculated" : "symbolic",
            createdAt: new Date().toISOString()
        };
    }

    function saveFormula() {
        if (!formulaInput) return;

        const source = formulaInput.value.trim();

        if (!source) {
            status("Scrivi una formula da interpretare.");
            return;
        }

        try {
            const record = interpretFormula(source);
            const signature = hash(record.normalized);

            if (formulas.some(f => f.signature === signature)) {
                status("Questa formula è già presente nel database.");
                return;
            }

            record.signature = signature;
            record.id = "formula_" + signature;
            formulas.unshift(record);

            saveDB();
            renderPanel();

            const r = record.result;
            let message = "Formula riconosciuta e salvata.";

            if (r.known && r.equation) {
                message += " Membri dimensionalmente compatibili.";
            } else if (r.known) {
                message += " Risultato: " + r.value +
                    " [" + dimLabel(r.d) + "]";
            } else {
                message += " Formula simbolica salvata.";
            }

            status(message);
        } catch (error) {
            status("Errore: " + error.message);
        }
    }

    function renderFormulaResult() {
        const box = document.getElementById(PREFIX + "-formula-result");
        if (!box || !formulaInput) return;

        try {
            const record = interpretFormula(formulaInput.value);
            const r = record.result;

            box.textContent =
                "Formula: " + record.normalized + "\n" +
                "Funzioni: " + (record.components.functions.join(", ") || "nessuna") + "\n" +
                "Unità SI: " + (record.components.units.join(", ") || "nessuna") + "\n" +
                "Variabili/simboli: " +
                    (record.components.variables.join(", ") || "nessuna") + "\n" +
                "Operatori: " + (record.components.operators.join(" ") || "nessuno") + "\n" +
                "Stato: " + (r.known ? "calcolabile" : "simbolico") +
                (r.known && !r.equation
                    ? "\nRisultato: " + r.value + " [" + dimLabel(r.d) + "]"
                    : "");
        } catch (error) {
            box.textContent = "Formula non valida: " + error.message;
        }
    }

    // ------------------------------------------------------
    // 5. API DEL GIOCO E DISTILLAZIONE
    // ------------------------------------------------------

    function gameIngredients() {
        return window.ingredients || null;
    }

    function getId(placed) {
        const ingredients = gameIngredients();
        if (!ingredients) return null;

        if (typeof placed === "string" && ingredients[placed]) {
            return placed;
        }

        if (!placed || typeof placed !== "object") return null;

        const candidates = [
            placed.id,
            placed.ingredientId,
            placed.ingredient_id,
            placed.elementId,
            placed.element_id,
            placed.data && placed.data.id,
            placed.ingredient
        ];

        for (const candidate of candidates) {
            if (typeof candidate === "string" && ingredients[candidate]) {
                return candidate;
            }

            if (candidate && typeof candidate === "object" &&
                typeof candidate.id === "string" &&
                ingredients[candidate.id]) {
                return candidate.id;
            }
        }

        for (const [id, definition] of Object.entries(ingredients)) {
            if (definition === placed) return id;
        }

        return null;
    }

    function isAlcohol(id) {
        const ingredients = gameIngredients();
        const def = (ingredients && ingredients[id]) || {};

        const text = [
            id, def.name, def.type, def.category, def.description
        ].join(" ").toLowerCase();

        return /\balcohol\b|\balcool\b|\bethanol\b|\bethanolo\b|alcol|vodka|whisky|whiskey|rum\b|gin\b|brandy|wine\b|vino\b|beer\b|birra\b|liquor|liqueur|spirits/.test(text);
    }

    function addUniqueIngredient(signature, details) {
        const ingredients = gameIngredients();
        const addIngredient = window.addIngredient;

        if (!ingredients || typeof addIngredient !== "function") {
            throw new Error("API ingredienti non disponibile.");
        }

        const baseId = "distillate_" + hash(signature);
        let id = baseId;
        let suffix = 2;

        while (ingredients[id]) {
            const existing = discoveries.find(d => d.id === id);

            if (existing && existing.signature === signature) {
                return existing;
            }

            id = baseId + "_" + suffix++;
        }

        const colors = ["#8e44ad", "#2471a3", "#148f77", "#b9770e"];
        const color = colors[
            parseInt(hash(signature).slice(0, 2), 16) % colors.length
        ];

        addIngredient(id, {
            name: details.name,
            color,
            innerColor: "#d6eaf8",
            type: "liquid",
            category: "liquid",
            description:
                "Distillato sperimentale. Processo: " + details.method +
                "; temperatura: " + details.temperature + " °C."
        });

        const entry = {
            id,
            name: details.name,
            type: "liquid",
            ingredients: details.ingredients,
            method: details.method,
            temperature: details.temperature,
            equation: details.equation,
            equationValue: details.equationValue,
            signature,
            discoveredAt: new Date().toISOString()
        };

        discoveries.unshift(entry);
        saveDB();
        renderPanel();

        return entry;
    }

    function distill() {
        if (state.selected.length !== 3) {
            status("Seleziona esattamente 3 ingredienti.");
            return;
        }

        const alcohols = state.selected.filter(item => isAlcohol(item.id));

        if (!alcohols.length) {
            status("Alcol obbligatorio: seleziona un ingrediente alcolico.");
            return;
        }

        const method = prompt(
            "Tipo di distillazione:",
            "semplice"
        );

        if (!method || !method.trim()) return;

        const temperatureText = prompt("Temperatura in °C:", "78");
        if (temperatureText === null) return;

        const temperature = Number(temperatureText);

        if (!Number.isFinite(temperature) || temperature < -273.15) {
            status("Temperatura non valida.");
            return;
        }

        const equation = prompt(
            "Inserisci una formula matematica o fisica.\n" +
            "Esempi: 10*m/(2*s), sin(2*pi), kg*m/s^2",
            "10*m/(2*s)"
        );

        if (!equation) return;

        let result;

        try {
            result = interpretFormula(equation);
        } catch (error) {
            status("Formula non valida: " + error.message);
            return;
        }

        const ids = state.selected.map(item => item.id);
        const signature = JSON.stringify({
            ingredients: ids.slice().sort(),
            method: method.trim().toLowerCase(),
            temperature,
            equation: result.normalized
        });

        const existing = discoveries.find(d => d.signature === signature);

        if (existing) {
            status("Scoperta già esistente: " + existing.name);
            return;
        }

        const name = prompt(
            "Dai un nome al distillato:",
            "Distillato " + hash(signature).toUpperCase()
        );

        if (!name || !name.trim()) return;

        const entry = addUniqueIngredient(signature, {
            name: name.trim(),
            ingredients: ids,
            method: method.trim(),
            temperature,
            equation: equation.trim(),
            equationValue: result.result.known
                ? result.result.value
                : null
        });

        state.selected = [];
        renderPanel();
        status("Nuovo distillato scoperto: " + entry.name);
    }

    function selectIngredient(placed) {
        const id = getId(placed);

        if (!id) {
            status("Ingrediente non riconosciuto.");
            return;
        }

        if (state.selected.some(item => item.id === id)) {
            status("Ingrediente già selezionato.");
            return;
        }

        if (state.selected.length >= 3) {
            status("Hai già selezionato 3 ingredienti.");
            return;
        }

        state.selected.push({ id });
        renderPanel();

        if (state.selected.length === 3) {
            status(
                state.selected.some(item => isAlcohol(item.id))
                    ? "Miscela pronta. Premi Distilla."
                    : "Manca un ingrediente alcolico."
            );
        } else {
            status("Selezionato: " + prettyName(id));
        }
    }

    // ------------------------------------------------------
    // 6. INTERFACCIA
    // ------------------------------------------------------

    function makeButton(label, callback) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.style.cssText =
            "padding:8px 10px;border:0;border-radius:7px;" +
            "background:#246b68;color:white;cursor:pointer;margin:3px;";
        button.addEventListener("click", callback);
        return button;
    }

    function makeSectionTitle(text) {
        const h = document.createElement("h4");
        h.textContent = text;
        h.style.cssText = "margin:14px 0 7px;";
        return h;
    }

    function renderPanel() {
        if (!panel) return;

        selectionNode.textContent = state.selected.length
            ? state.selected.map((item, i) =>
                (i + 1) + ". " + prettyName(item.id)
            ).join(" | ")
            : "Nessun ingrediente selezionato.";

        databaseNode.replaceChildren();

        discoveries.forEach(entry => {
            const row = document.createElement("div");
            row.style.cssText =
                "padding:7px;margin:5px 0;background:#183b3b;" +
                "border-radius:6px;overflow-wrap:anywhere;";

            const title = document.createElement("strong");
            title.textContent = "🧪 " + entry.name;

            const detail = document.createElement("div");
            detail.style.cssText = "font-size:12px;margin-top:4px;";
            detail.textContent =
                entry.method + " | " + entry.temperature + " °C | " +
                (entry.equation || "");

            row.append(title, detail);
            databaseNode.appendChild(row);
        });

        if (!discoveries.length) {
            databaseNode.textContent = "Nessuna scoperta registrata.";
        }

        formulaDatabaseNode.replaceChildren();

        formulas.forEach(entry => {
            const row = document.createElement("div");
            row.style.cssText =
                "padding:7px;margin:5px 0;background:#183b3b;" +
                "border-radius:6px;overflow-wrap:anywhere;";

            const title = document.createElement("strong");
            title.textContent = "ƒ " + entry.original;

            const detail = document.createElement("div");
            detail.style.cssText = "font-size:12px;margin-top:4px;";

            const units = entry.components.units.join(", ") || "nessuna";
            const functions = entry.components.functions.join(", ") || "nessuna";

            detail.textContent =
                "Unità: " + units + " | Funzioni: " + functions;

            const loadButton = makeButton("Carica", function () {
                formulaInput.value = entry.original;
                renderFormulaResult();
                formulaInput.focus();
            });

            row.append(title, detail, loadButton);
            formulaDatabaseNode.appendChild(row);
        });

        if (!formulas.length) {
            formulaDatabaseNode.textContent = "Nessuna formula salvata.";
        }
    }

    function exportJSON() {
        const blob = new Blob([
            JSON.stringify({
                version: VERSION,
                discoveries,
                formulas,
                customUnits
            }, null, 2)
        ], { type: "application/json" });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "distiller_database.json";
        link.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function createPanel() {
        if (panel && panel.isConnected) {
            panel.style.display =
                panel.style.display === "none" ? "block" : "none";
            renderPanel();
            return;
        }

        panel = document.createElement("section");
        panel.id = PREFIX + "-panel";

        panel.style.cssText =
            "position:fixed;right:14px;bottom:70px;" +
            "width:390px;max-width:calc(100vw - 28px);" +
            "max-height:78vh;overflow:auto;z-index:2147483647;" +
            "background:#102b2b;color:#e7ffff;" +
            "border:2px solid #3c9992;border-radius:12px;padding:12px;" +
            "font:14px Arial,sans-serif;box-shadow:0 5px 25px #0009;";

        const title = document.createElement("h3");
        title.textContent = "⚗️ Distiller — Laboratorio";
        title.style.marginTop = "0";

        const help = document.createElement("p");
        help.textContent =
            "Scrivi formule matematiche e fisiche oppure seleziona " +
            "3 ingredienti nel gioco per distillare.";

        selectionNode = document.createElement("div");
        selectionNode.style.cssText =
            "margin:8px 0;overflow-wrap:anywhere;";

        // Formula editor
        const formulaTitle = makeSectionTitle("Laboratorio matematico e SI");

        formulaInput = document.createElement("textarea");
        formulaInput.id = PREFIX + "-formula";
        formulaInput.placeholder =
            "Esempio: 2*sin(Hz/cs)\n" +
            "Oppure: kg*m/s^2\n" +
            "LaTeX: \\frac{kg\\cdot m}{s^2}";

        formulaInput.value = "kg*m/s^2";
        formulaInput.rows = 3;
        formulaInput.style.cssText =
            "box-sizing:border-box;width:100%;padding:9px;" +
            "background:#071c1c;color:#e7ffff;border:1px solid #438d87;" +
            "border-radius:7px;font:13px monospace;resize:vertical;";

        const formulaResult = document.createElement("pre");
        formulaResult.id = PREFIX + "-formula-result";
        formulaResult.style.cssText =
            "white-space:pre-wrap;overflow-wrap:anywhere;" +
            "background:#071c1c;border-radius:7px;padding:9px;" +
            "font:12px monospace;";

        formulaInput.addEventListener("input", renderFormulaResult);

        const formulaButtons = document.createElement("div");
        formulaButtons.append(
            makeButton("Interpreta e salva", saveFormula),
            makeButton("Pulisci", function () {
                formulaInput.value = "";
                renderFormulaResult();
                formulaInput.focus();
            })
        );

        // Distillation and database
        const distillButtons = document.createElement("div");
        distillButtons.append(
            makeButton("Distilla 3 ingredienti", distill),
            makeButton("Annulla selezione", function () {
                state.selected = [];
                renderPanel();
                status("Selezione annullata.");
            }),
            makeButton("Aggiungi unità", addCustomUnit),
            makeButton("Esporta JSON", exportJSON),
            makeButton("Chiudi", function () {
                panel.style.display = "none";
            })
        );

        const formulaTitle2 = makeSectionTitle("Database delle formule");
        formulaDatabaseNode = document.createElement("div");

        const discoveryTitle = makeSectionTitle("Registro delle scoperte");
        databaseNode = document.createElement("div");

        statusNode = document.createElement("div");
        statusNode.style.cssText =
            "margin-top:10px;color:#8de0ce;font-size:12px;" +
            "overflow-wrap:anywhere;";

        panel.append(
            title, help,
            makeSectionTitle("Ingredienti selezionati"),
            selectionNode,
            formulaTitle, formulaInput, formulaButtons, formulaResult,
            formulaTitle2, formulaDatabaseNode,
            discoveryTitle, databaseNode,
            distillButtons, statusNode
        );

        document.body.appendChild(panel);
        renderPanel();
        renderFormulaResult();
        status("Laboratorio pronto.");
    }

    // ------------------------------------------------------
    // 7. AVVIO RESILIENTE
    // ------------------------------------------------------

    function createLauncher() {
        if (!document.body) return;

        let launcher = document.getElementById(PREFIX + "-launcher");

        if (!launcher) {
            launcher = document.createElement("button");
            launcher.id = PREFIX + "-launcher";
            launcher.type = "button";
            launcher.textContent = "⚗️ Distiller";

            launcher.style.cssText =
                "position:fixed;right:14px;bottom:14px;" +
                "z-index:2147483646;padding:11px 14px;" +
                "background:#246b68;color:white;" +
                "border:2px solid #65bcb0;border-radius:9px;" +
                "cursor:pointer;font:bold 14px Arial,sans-serif;" +
                "box-shadow:0 3px 12px #0007;";

            launcher.addEventListener("click", function () {
                createPanel();
                if (panel) panel.style.display = "block";
            });

            document.body.appendChild(launcher);
        }
    }

    function registerGameTool() {
        if (toolRegistered) return true;

        if (!window.ingredients ||
            typeof window.addIngredient !== "function" ||
            typeof window.addTool !== "function") {
            return false;
        }

        try {
            window.addTool("distiller", {
                func: selectIngredient,

                onSelect: function () {
                    createPanel();
                    if (panel) panel.style.display = "block";
                    status("Tool attivo: clicca gli ingredienti.");
                },

                onDeselect: function () {
                    status("Tool Distiller disattivato.");
                },

                shape: "liquid"
            });

            apiReady = true;
            toolRegistered = true;
            console.log("[Distiller] Tool di gioco registrato.");
            return true;
        } catch (error) {
            console.warn("[Distiller] Registrazione rinviata:", error);
            return false;
        }
    }

    function boot() {
        createLauncher();
        registerGameTool();
    }

    function start() {
        boot();

        // Il launcher è indipendente dalle API del gioco.
        // Si riprova a registrare il tool se le API arrivano dopo.
        let attempts = 0;
        const retry = setInterval(function () {
            createLauncher();

            if (registerGameTool() || ++attempts >= 80) {
                clearInterval(retry);

                if (!toolRegistered) {
                    console.warn(
                        "[Distiller] Pulsante UI attivo, ma API del gioco " +
                        "non trovate. La distillazione tramite ingredienti " +
                        "richiede addTool/addIngredient/ingredients."
                    );
                    status(
                        "UI attiva. API del gioco non ancora disponibili."
                    );
                }
            }
        }, 250);

        console.log("[Distiller] Versione", VERSION, "avviata.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();
