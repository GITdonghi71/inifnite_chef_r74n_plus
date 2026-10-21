
/*
 * Infinite Chef R74N+ — Scientific Distiller
 * Versione 4.0.0
 *
 * - Pulsante UI indipendente dal caricamento delle API del gioco
 * - Un solo campo per le formule
 * - Riconoscimento matematico e LaTeX
 * - Unità SI, prefissi e simboli personalizzati appresi
 * - Database dinamico di formule e simboli
 * - Distillazione di tre ingredienti, con almeno un alcolico
 * - Salvataggio persistente tramite localStorage
 * - Esportazione JSON
 *
 * Nota: il parser supporta un sottoinsieme di LaTeX.
 * Le espressioni non valutabili vengono conservate simbolicamente.
 * Nessun eval() o Function().
 */
(function () {
    "use strict";

    if (window.__IC_DISTILLER_V4__) return;
    window.__IC_DISTILLER_V4__ = true;

    const VERSION = "4.0.0";
    const PREFIX = "ic-distiller";

    const KEYS = {
        formulas: "ic_distiller_formulas_v4",
        symbols: "ic_distiller_symbols_v4",
        units: "ic_distiller_units_v4",
        discoveries: "ic_distiller_discoveries_v4"
    };

    let formulas = readDB(KEYS.formulas, []);
    let symbols = readDB(KEYS.symbols, []);
    let customUnits = readDB(KEYS.units, []);
    let discoveries = readDB(KEYS.discoveries, []);

    let panel = null;
    let launcher = null;
    let statusNode = null;
    let formulaInput = null;
    let resultNode = null;
    let formulaList = null;
    let symbolList = null;
    let discoveryList = null;

    let selected = [];
    let gameToolRegistered = false;

    // --------------------------------------------------
    // DATABASE
    // --------------------------------------------------

    function readDB(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "null");
            return value === null ? fallback : value;
        } catch (_) {
            return fallback;
        }
    }

    function writeDB() {
        const values = [
            [KEYS.formulas, formulas],
            [KEYS.symbols, symbols],
            [KEYS.units, customUnits],
            [KEYS.discoveries, discoveries]
        ];

        try {
            for (const [key, value] of values) {
                localStorage.setItem(key, JSON.stringify(value));
            }
            return true;
        } catch (error) {
            console.error("[Distiller] Errore database:", error);
            setStatus("Impossibile salvare: archivio pieno o non disponibile.");
            return false;
        }
    }

    function fingerprint(value) {
        let h = 2166136261;
        const s = String(value);

        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }

        return (h >>> 0).toString(16);
    }

    function setStatus(message) {
        console.log("[Distiller]", message);
        if (statusNode) statusNode.textContent = message;
    }

    function unique(values) {
        return [...new Set(values)];
    }

    function rememberSymbol(name, kind, formula) {
        if (!name) return;

        const existing = symbols.find(
            item => item.name === name && item.kind === kind
        );

        if (existing) {
            existing.lastSeen = new Date().toISOString();
            existing.occurrences = (existing.occurrences || 1) + 1;
            return;
        }

        symbols.unshift({
            name,
            kind,
            example: formula,
            createdAt: new Date().toISOString(),
            occurrences: 1
        });
    }

    // --------------------------------------------------
    // UNITÀ SI E PREFISSI
    // Dimensioni fondamentali:
    // m, kg, s, A, K, mol, cd
    // --------------------------------------------------

    const ZERO = [0, 0, 0, 0, 0, 0, 0];

    const SI = {
        m:   { factor: 1, d: [1,0,0,0,0,0,0], name: "metro", prefix: true },
        kg:  { factor: 1, d: [0,1,0,0,0,0,0], name: "chilogrammo" },
        g:   { factor: 1e-3, d: [0,1,0,0,0,0,0], name: "grammo", prefix: true },
        s:   { factor: 1, d: [0,0,1,0,0,0,0], name: "secondo", prefix: true },
        A:   { factor: 1, d: [0,0,0,1,0,0,0], name: "ampere", prefix: true },
        K:   { factor: 1, d: [0,0,0,0,1,0,0], name: "kelvin", prefix: true },
        mol: { factor: 1, d: [0,0,0,0,0,1,0], name: "mole", prefix: true },
        cd:  { factor: 1, d: [0,0,0,0,0,0,1], name: "candela", prefix: true },

        Hz:  { factor: 1, d: [0,0,-1,0,0,0,0], name: "hertz", prefix: true },
        N:   { factor: 1, d: [1,1,-2,0,0,0,0], name: "newton", prefix: true },
        Pa:  { factor: 1, d: [-1,1,-2,0,0,0,0], name: "pascal", prefix: true },
        J:   { factor: 1, d: [2,1,-2,0,0,0,0], name: "joule", prefix: true },
        W:   { factor: 1, d: [2,1,-3,0,0,0,0], name: "watt", prefix: true },
        C:   { factor: 1, d: [0,0,1,1,0,0,0], name: "coulomb", prefix: true },
        V:   { factor: 1, d: [2,1,-3,-1,0,0,0], name: "volt", prefix: true },
        F:   { factor: 1, d: [-2,-1,4,2,0,0,0], name: "farad", prefix: true },
        Ohm: { factor: 1, d: [2,1,-3,-2,0,0,0], name: "ohm", prefix: true },
        S:   { factor: 1, d: [-2,-1,3,2,0,0,0], name: "siemens", prefix: true },
        Wb:  { factor: 1, d: [2,1,-2,-1,0,0,0], name: "weber", prefix: true },
        T:   { factor: 1, d: [0,1,-2,-1,0,0,0], name: "tesla", prefix: true },
        H:   { factor: 1, d: [2,1,-2,-2,0,0,0], name: "henry", prefix: true },
        lm:  { factor: 1, d: [0,0,0,0,0,0,1], name: "lumen", prefix: true },
        lx:  { factor: 1, d: [-2,0,0,0,0,0,1], name: "lux", prefix: true },
        Bq:  { factor: 1, d: [0,0,-1,0,0,0,0], name: "becquerel", prefix: true },
        Gy:  { factor: 1, d: [2,0,-2,0,0,0,0], name: "gray", prefix: true },
        Sv:  { factor: 1, d: [2,0,-2,0,0,0,0], name: "sievert", prefix: true },
        kat: { factor: 1, d: [0,0,-1,0,0,1,0], name: "katal", prefix: true },

        min: { factor: 60, d: [0,0,1,0,0,0,0], name: "minuto" },
        h:   { factor: 3600, d: [0,0,1,0,0,0,0], name: "ora" },
        L:   { factor: 1e-3, d: [3,0,0,0,0,0,0], name: "litro", prefix: true },
        rad: { factor: 1, d: ZERO, name: "radiante" },
        deg: { factor: Math.PI / 180, d: ZERO, name: "grado" }
    };

    const PREFIXES = [
        ["da", 1e1], ["Q", 1e30], ["R", 1e27],
        ["Y", 1e24], ["Z", 1e21], ["E", 1e18],
        ["P", 1e15], ["T", 1e12], ["G", 1e9],
        ["M", 1e6], ["k", 1e3], ["h", 1e2],
        ["d", 1e-1], ["c", 1e-2], ["m", 1e-3],
        ["u", 1e-6], ["µ", 1e-6], ["n", 1e-9],
        ["p", 1e-12], ["f", 1e-15]
    ].sort((a, b) => b[0].length - a[0].length);

    function getUnit(name) {
        if (SI[name]) {
            return { ...SI[name], d: [...SI[name].d], symbol: name };
        }

        const custom = customUnits.find(unit => unit.name === name);

        if (custom) {
            return {
                factor: custom.factor,
                d: [...custom.d],
                name: custom.name,
                symbol: name,
                custom: true
            };
        }

        for (const [prefix, factor] of PREFIXES) {
            if (!name.startsWith(prefix)) continue;

            const baseName = name.slice(prefix.length);
            const base = SI[baseName];

            if (!base || !base.prefix) continue;

            return {
                ...base,
                factor: factor * base.factor,
                d: [...base.d],
                symbol: name,
                prefixed: true
            };
        }

        return null;
    }

    function dimensionName(d) {
        const labels = ["m", "kg", "s", "A", "K", "mol", "cd"];
        const parts = [];

        d.forEach((power, index) => {
            if (Math.abs(power) < 1e-9) return;

            parts.push(
                labels[index] +
                (Math.abs(power - 1) < 1e-9 ? "" : "^" + power)
            );
        });

        return parts.length ? parts.join("·") : "adimensionale";
    }

    function sameDimension(a, b) {
        return a.every((value, index) =>
            Math.abs(value - b[index]) < 1e-9
        );
    }

    function addDimension(a, b) {
        return a.map((value, index) => value + b[index]);
    }

    function subtractDimension(a, b) {
        return a.map((value, index) => value - b[index]);
    }

    function scaleDimension(a, factor) {
        return a.map(value => value * factor);
    }

    // --------------------------------------------------
    // NORMALIZZAZIONE LATEX
    // --------------------------------------------------

    function normalizeLatex(input) {
        let source = String(input).trim();

        if (!source) throw new Error("Inserisci un'equazione.");
        if (source.length > 10000) {
            throw new Error("La formula supera il limite di 10000 caratteri.");
        }

        const replacements = [
            [/\\cdot\b/g, "*"],
            [/\\times\b/g, "*"],
            [/\\div\b/g, "/"],
            [/\\pi\b/g, "pi"],
            [/\\sin\b/g, "sin"],
            [/\\cos\b/g, "cos"],
            [/\\tan\b/g, "tan"],
            [/\\arcsin\b/g, "asin"],
            [/\\arccos\b/g, "acos"],
            [/\\arctan\b/g, "atan"],
            [/\\ln\b/g, "ln"],
            [/\\log\b/g, "log"],
            [/\\exp\b/g, "exp"],
            [/\\sqrt\b/g, "sqrt"],
            [/\\left\b/g, ""],
            [/\\right\b/g, ""],
            [/\\mathrm\{([^{}]*)\}/g, "$1"],
            [/\\text\{([^{}]*)\}/g, "$1"],
            [/×/g, "*"],
            [/·/g, "*"],
            [/÷/g, "/"],
            [/−/g, "-"],
            [/π/g, "pi"],
            [/²/g, "^2"],
            [/³/g, "^3"],
            [/⁴/g, "^4"],
            [/√/g, "sqrt"],
            [/∞/g, "inf"]
        ];

        for (const [pattern, replacement] of replacements) {
            source = source.replace(pattern, replacement);
        }

        function readBrace(text, start) {
            if (text[start] !== "{") return null;

            let depth = 1;

            for (let index = start + 1; index < text.length; index++) {
                if (text[index] === "{") depth++;
                if (text[index] === "}") depth--;

                if (depth === 0) {
                    return {
                        value: text.slice(start + 1, index),
                        end: index + 1
                    };
                }
            }

            throw new Error("Graffe LaTeX non bilanciate.");
        }

        // Espande ricorsivamente \frac{numeratore}{denominatore}
        // e \sqrt{argomento}, senza valutare codice arbitrario.
        for (let pass = 0; pass < 50; pass++) {
            let changed = false;
            let output = "";
            let index = 0;

            while (index < source.length) {
                const command = source.startsWith("\\frac", index)
                    ? "\\frac"
                    : source.startsWith("\\sqrt", index)
                        ? "\\sqrt"
                        : null;

                if (!command) {
                    output += source[index++];
                    continue;
                }

                let cursor = index + command.length;

                while (/\s/.test(source[cursor] || "")) cursor++;

                const first = readBrace(source, cursor);

                if (!first) {
                    throw new Error("Argomento LaTeX mancante.");
                }

                if (command === "\\sqrt") {
                    output += "sqrt(" + first.value + ")";
                    index = first.end;
                } else {
                    cursor = first.end;

                    while (/\s/.test(source[cursor] || "")) cursor++;

                    const second = readBrace(source, cursor);

                    if (!second) {
                        throw new Error("\\frac richiede due argomenti.");
                    }

                    output += "((" + first.value + ")/(" + second.value + "))";
                    index = second.end;
                }

                changed = true;
            }

            source = output;

            if (!changed) break;
        }

        // Gli apici LaTeX comuni: x_{i} e x^{2}.
        source = source.replace(
            /_\{([A-Za-z0-9]+)\}/g,
            "_$1"
        );

        source = source.replace(
            /\^\{(-?\d+(?:\.\d+)?)\}/g,
            "^$1"
        );

        // Conserva comandi non supportati come simboli non riconosciuti,
        // invece di fingere che siano stati interpretati.
        return source;
    }

    // --------------------------------------------------
    // TOKENIZER
    // --------------------------------------------------

    function tokenize(source) {
        const tokens = [];
        const pattern =
            /\s+|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[\p{L}_][\p{L}\p{N}_]*|[()+\-*/^=,{}[\]]/giu;

        let position = 0;
        let match;

        while ((match = pattern.exec(source)) !== null) {
            if (match.index !== position) {
                throw new Error(
                    "Simbolo non riconosciuto vicino a «" +
                    source.slice(position, position + 16) + "»."
                );
            }

            position = pattern.lastIndex;

            const raw = match[0];

            if (/^\s+$/.test(raw)) continue;

            if (/^(?:\d|\.)/.test(raw)) {
                tokens.push({
                    type: "number",
                    value: Number(raw),
                    raw
                });
            } else if (/^[\p{L}_]/u.test(raw)) {
                tokens.push({ type: "id", value: raw, raw });
            } else {
                tokens.push({ type: raw, value: raw, raw });
            }
        }

        if (position !== source.length) {
            throw new Error(
                "Carattere non riconosciuto: «" +
                source.slice(position, position + 16) + "»."
            );
        }

        tokens.push({ type: "EOF", value: null });
        return tokens;
    }

    // --------------------------------------------------
    // PARSER MATEMATICO
    // --------------------------------------------------

    function parse(source) {
        const tokens = tokenize(source);
        let cursor = 0;
        let nodeCount = 0;

        const peek = () => tokens[cursor];
        const take = () => tokens[cursor++];

        function node(type, properties) {
            if (++nodeCount > 5000) {
                throw new Error("La formula contiene troppi elementi.");
            }

            return { type, ...properties };
        }

        function expect(type) {
            if (peek().type !== type) {
                throw new Error("Atteso «" + type + "».");
            }

            return take();
        }

        function startsPrimary(token) {
            return token.type === "number" ||
                token.type === "id" ||
                token.type === "(";
        }

        function expression(depth = 0) {
            if (depth > 100) {
                throw new Error("Annidamento eccessivo.");
            }

            let left = term(depth + 1);

            while (peek().type === "+" || peek().type === "-") {
                const op = take().type;

                left = node("binary", {
                    op,
                    left,
                    right: term(depth + 1)
                });
            }

            return left;
        }

        function term(depth) {
            let left = unary(depth + 1);

            while (true) {
                if (peek().type === "*" || peek().type === "/") {
                    const op = take().type;

                    left = node("binary", {
                        op,
                        left,
                        right: unary(depth + 1)
                    });
                } else if (startsPrimary(peek())) {
                    // Moltiplicazione implicita: 2x, 3m, 2(x+1).
                    left = node("binary", {
                        op: "*",
                        left,
                        right: unary(depth + 1)
                    });
                } else {
                    break;
                }
            }

            return left;
        }

        function unary(depth) {
            if (peek().type === "+" || peek().type === "-") {
                const op = take().type;

                return node("unary", {
                    op,
                    value: unary(depth + 1)
                });
            }

            return power(depth + 1);
        }

        function power(depth) {
            const left = primary(depth + 1);

            if (peek().type === "^") {
                take();

                return node("binary", {
                    op: "^",
                    left,
                    right: unary(depth + 1)
                });
            }

            return left;
        }

        function primary(depth) {
            const token = peek();

            if (token.type === "number") {
                take();
                return node("number", { value: token.value });
            }

            if (token.type === "id") {
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

                    return node("call", {
                        name: token.value,
                        args
                    });
                }

                return node("id", { name: token.value });
            }

            if (token.type === "(") {
                take();
                const value = expression(depth + 1);
                expect(")");
                return value;
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

            return node("equation", { left, right });
        }

        if (peek().type !== "EOF") {
            throw new Error("Token inatteso: " + peek().raw);
        }

        return left;
    }

    // --------------------------------------------------
    // ANALISI DEI COMPONENTI
    // --------------------------------------------------

    const KNOWN_FUNCTIONS = new Set([
        "sin", "cos", "tan", "asin", "acos", "atan",
        "sinh", "cosh", "tanh", "sqrt", "abs", "exp",
        "ln", "log", "log10", "floor", "ceil", "round",
        "min", "max", "pow"
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

    function inspectAST(ast) {
        const found = {
            units: [],
            functions: [],
            constants: [],
            variables: [],
            operators: [],
            numbers: []
        };

        function walk(n) {
            if (n.type === "number") {
                found.numbers.push(n.value);
                return;
            }

            if (n.type === "id") {
                if (getUnit(n.name)) {
                    found.units.push(n.name);
                } else if (
                    Object.prototype.hasOwnProperty.call(CONSTANTS, n.name)
                ) {
                    found.constants.push(n.name);
                } else {
                    found.variables.push(n.name);
                }

                return;
            }

            if (n.type === "unary") {
                found.operators.push(n.op);
                walk(n.value);
                return;
            }

            if (n.type === "binary") {
                found.operators.push(n.op);
                walk(n.left);
                walk(n.right);
                return;
            }

            if (n.type === "call") {
                found.functions.push(n.name);
                n.args.forEach(walk);
                return;
            }

            if (n.type === "equation") {
                found.operators.push("=");
                walk(n.left);
                walk(n.right);
            }
        }

        walk(ast);

        for (const key of Object.keys(found)) {
            found[key] = unique(found[key]);
        }

        return found;
    }

    // --------------------------------------------------
    // VALUTAZIONE SIMBOLICA E DIMENSIONALE
    // --------------------------------------------------

    function symbolic(reason, dimension) {
        return {
            known: false,
            symbolic: true,
            reason: reason || "Richiede ulteriori informazioni.",
            d: dimension ? [...dimension] : [...ZERO]
        };
    }

    function evaluate(ast) {
        switch (ast.type) {
            case "number":
                return {
                    known: true,
                    value: ast.value,
                    d: [...ZERO]
                };

            case "id": {
                const unit = getUnit(ast.name);

                if (unit) {
                    return {
                        known: true,
                        value: unit.factor,
                        d: [...unit.d]
                    };
                }

                if (Object.prototype.hasOwnProperty.call(CONSTANTS, ast.name)) {
                    return {
                        known: true,
                        value: CONSTANTS[ast.name],
                        d: [...ZERO]
                    };
                }

                return symbolic("Simbolo non definito: " + ast.name);
            }

            case "unary": {
                const value = evaluate(ast.value);

                if (!value.known) return value;

                return {
                    ...value,
                    value: ast.op === "-" ? -value.value : value.value
                };
            }

            case "binary": {
                const a = evaluate(ast.left);
                const b = evaluate(ast.right);

                if (!a.known || !b.known) {
                    return symbolic(
                        a.reason || b.reason || "Espressione simbolica."
                    );
                }

                if (ast.op === "+" || ast.op === "-") {
                    if (!sameDimension(a.d, b.d)) {
                        return symbolic(
                            "Somma/sottrazione tra dimensioni incompatibili: " +
                            dimensionName(a.d) + " e " + dimensionName(b.d)
                        );
                    }

                    return {
                        known: true,
                        value: ast.op === "+"
                            ? a.value + b.value
                            : a.value - b.value,
                        d: [...a.d]
                    };
                }

                if (ast.op === "*") {
                    return {
                        known: true,
                        value: a.value * b.value,
                        d: addDimension(a.d, b.d)
                    };
                }

                if (ast.op === "/") {
                    if (b.value === 0) {
                        return symbolic("Divisione per zero.");
                    }

                    return {
                        known: true,
                        value: a.value / b.value,
                        d: subtractDimension(a.d, b.d)
                    };
                }

                if (ast.op === "^") {
                    if (!sameDimension(b.d, ZERO)) {
                        return symbolic("Esponente dimensionale non valido.");
                    }

                    if (!sameDimension(a.d, ZERO) &&
                        !Number.isInteger(b.value)) {
                        return symbolic(
                            "Esponente non intero su una quantità dimensionale."
                        );
                    }

                    const value = Math.pow(a.value, b.value);

                    if (!Number.isFinite(value)) {
                        return symbolic("Risultato non finito.");
                    }

                    return {
                        known: true,
                        value,
                        d: scaleDimension(a.d, b.value)
                    };
                }

                return symbolic("Operatore non supportato.");
            }

            case "call": {
                const args = ast.args.map(evaluate);

                // Funzione nuova o con argomenti simbolici:
                // la formula rimane registrabile, ma non calcolabile.
                if (!KNOWN_FUNCTIONS.has(ast.name)) {
                    return symbolic("Funzione non definita: " + ast.name);
                }

                if (args.some(arg => !arg.known)) {
                    return symbolic(
                        "Argomenti simbolici nella funzione " + ast.name + "."
                    );
                }

                const unaryFunctions = {
                    sin: Math.sin,
                    cos: Math.cos,
                    tan: Math.tan,
                    asin: Math.asin,
                    acos: Math.acos,
                    atan: Math.atan,
                    sinh: Math.sinh,
                    cosh: Math.cosh,
                    tanh: Math.tanh,
                    abs: Math.abs,
                    exp: Math.exp,
                    ln: Math.log,
                    log: Math.log10,
                    log10: Math.log10,
                    floor: Math.floor,
                    ceil: Math.ceil,
                    round: Math.round
                };

                if (ast.name === "sqrt") {
                    if (args.length !== 1) {
                        return symbolic("sqrt richiede un argomento.");
                    }

                    const a = args[0];

                    if (a.value < 0) {
                        return symbolic("Radice negativa non reale.");
                    }

                    if (a.d.some(v =>
                        Math.abs(v / 2 - Math.round(v / 2)) > 1e-9
                    )) {
                        return symbolic("Dimensioni non compatibili con sqrt.");
                    }

                    return {
                        known: true,
                        value: Math.sqrt(a.value),
                        d: scaleDimension(a.d, 0.5)
                    };
                }

                if (ast.name === "min" || ast.name === "max") {
                    if (!args.length) {
                        return symbolic("min/max richiedono argomenti.");
                    }

                    if (!args.every(a => sameDimension(a.d, args[0].d))) {
                        return symbolic("Dimensioni incompatibili in min/max.");
                    }

                    const values = args.map(a => a.value);

                    return {
                        known: true,
                        value: ast.name === "min"
                            ? Math.min(...values)
                            : Math.max(...values),
                        d: [...args[0].d]
                    };
                }

                if (ast.name === "pow") {
                    if (args.length !== 2) {
                        return symbolic("pow richiede due argomenti.");
                    }

                    if (!sameDimension(args[1].d, ZERO)) {
                        return symbolic("L'esponente deve essere adimensionale.");
                    }

                    if (!sameDimension(args[0].d, ZERO) &&
                        !Number.isInteger(args[1].value)) {
                        return symbolic("Esponente non intero non valido.");
                    }

                    return {
                        known: true,
                        value: Math.pow(args[0].value, args[1].value),
                        d: scaleDimension(args[0].d, args[1].value)
                    };
                }

                if (args.length !== 1) {
                    return symbolic(ast.name + " richiede un argomento.");
                }

                const a = args[0];

                if (!sameDimension(a.d, ZERO)) {
                    return symbolic(
                        ast.name + " richiede un argomento adimensionale."
                    );
                }

                const fn = unaryFunctions[ast.name];

                if (!fn) {
                    return symbolic("Funzione non ancora calcolabile.");
                }

                const value = fn(a.value);

                if (!Number.isFinite(value)) {
                    return symbolic("Risultato non reale o non finito.");
                }

                return {
                    known: true,
                    value,
                    d: [...ZERO]
                };
            }

            case "equation": {
                const left = evaluate(ast.left);
                const right = evaluate(ast.right);

                if (!left.known || !right.known) {
                    return symbolic(
                        "Equazione conservata simbolicamente; " +
                        "non tutti i simboli sono definiti."
                    );
                }

                if (!sameDimension(left.d, right.d)) {
                    return symbolic(
                        "I due membri hanno dimensioni incompatibili."
                    );
                }

                return {
                    known: true,
                    equation: true,
                    equal: Math.abs(left.value - right.value) < 1e-9,
                    value: {
                        left: left.value,
                        right: right.value
                    },
                    d: [...left.d]
                };
            }

            default:
                return symbolic("Nodo matematico non supportato.");
        }
    }

    // --------------------------------------------------
    // INTERPRETAZIONE E REGISTRAZIONE DINAMICA
    // --------------------------------------------------

    function interpretFormula(input) {
        const normalized = normalizeLatex(input);
        const ast = parse(normalized);
        const components = inspectAST(ast);
        const result = evaluate(ast);

        return {
            original: String(input).trim(),
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
            setStatus("Inserisci una formula.");
            return;
        }

        try {
            const record = interpretFormula(source);
            const signature = fingerprint(record.normalized);

            const existing = formulas.find(
                formula => formula.signature === signature
            );

            if (existing) {
                setStatus("Formula già presente nel database.");
                renderPanel();
                return;
            }

            record.id = "formula_" + signature;
            record.signature = signature;

            formulas.unshift(record);

            for (const name of record.components.units) {
                rememberSymbol(name, "unit", record.normalized);
            }

            for (const name of record.components.functions) {
                rememberSymbol(name, "function", record.normalized);
            }

            for (const name of record.components.constants) {
                rememberSymbol(name, "constant", record.normalized);
            }

            for (const name of record.components.variables) {
                if (!getUnit(name)) {
                    rememberSymbol(name, "variable", record.normalized);
                }
            }

            writeDB();
            renderPanel();
            renderFormulaResult();

            if (record.result.known) {
                if (record.result.equation) {
                    setStatus(
                        "Equazione salvata. Membri dimensionalmente compatibili."
                    );
                } else {
                    setStatus(
                        "Formula salvata. Risultato: " +
                        record.result.value + " [" +
                        dimensionName(record.result.d) + "]."
                    );
                }
            } else {
                setStatus(
                    "Formula salvata come espressione simbolica. " +
                    record.result.reason
                );
            }
        } catch (error) {
            setStatus("Errore di sintassi: " + error.message);
        }
    }

    function renderFormulaResult() {
        if (!resultNode || !formulaInput) return;

        const source = formulaInput.value.trim();

        if (!source) {
            resultNode.textContent =
                "Inserisci una formula per visualizzare l'analisi.";
            return;
        }

        try {
            const record = interpretFormula(source);
            const result = record.result;
            const c = record.components;

            resultNode.textContent = [
                "Formula normalizzata: " + record.normalized,
                "Stato: " + (
                    result.known
                        ? "calcolabile"
                        : "simbolico — " + result.reason
                ),
                "Unità riconosciute: " + (c.units.join(", ") || "nessuna"),
                "Funzioni: " + (c.functions.join(", ") || "nessuna"),
                "Costanti: " + (c.constants.join(", ") || "nessuna"),
                "Simboli/variabili: " + (c.variables.join(", ") || "nessuna"),
                "Operatori: " + (c.operators.join(" ") || "nessuno"),
                result.known && !result.equation
                    ? "Risultato: " + result.value +
                      " [" + dimensionName(result.d) + "]"
                    : "",
                result.known && result.equation
                    ? "Uguaglianza numerica: " + result.equal
                    : ""
            ].filter(Boolean).join("\n");
        } catch (error) {
            resultNode.textContent =
                "La formula verrà analizzata al salvataggio.\n" +
                "Problema di sintassi: " + error.message;
        }
    }

    // --------------------------------------------------
    // INTEGRAZIONE CON INFINITE CHEF
    // --------------------------------------------------

    function getIngredients() {
        return window.ingredients || null;
    }

    function resolveIngredientId(item) {
        const ingredients = getIngredients();

        if (!ingredients) return null;

        if (typeof item === "string" && ingredients[item]) {
            return item;
        }

        if (!item || typeof item !== "object") return null;

        const candidates = [
            item.id,
            item.ingredientId,
            item.ingredient_id,
            item.elementId,
            item.element_id,
            item.data && item.data.id,
            item.ingredient
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
            if (definition === item) return id;
        }

        return null;
    }

    function isAlcohol(id) {
        const ingredients = getIngredients();
        const def = (ingredients && ingredients[id]) || {};

        const text = [
            id,
            def.name,
            def.type,
            def.category,
            def.description
        ].join(" ").toLowerCase();

        return /\balcohol\b|\balcool\b|\bethanol\b|\bethanolo\b|alcol|vodka|whisky|whiskey|rum\b|gin\b|brandy|wine\b|vino\b|beer\b|birra\b|liquor|liqueur|spirits/.test(text);
    }

    function registerDistilledIngredient(signature, details) {
        const ingredients = getIngredients();

        if (!ingredients || typeof window.addIngredient !== "function") {
            throw new Error("API ingredienti non disponibile.");
        }

        const baseId = "distillate_" + fingerprint(signature);
        let id = baseId;
        let suffix = 2;

        while (ingredients[id]) {
            const previous = discoveries.find(item => item.id === id);

            if (previous && previous.signature === signature) {
                return previous;
            }

            id = baseId + "_" + suffix++;
        }

        const colors = ["#8e44ad", "#2471a3", "#148f77", "#b9770e"];
        const colorIndex = parseInt(fingerprint(signature).slice(0, 2), 16) %
            colors.length;

        window.addIngredient(id, {
            name: details.name,
            color: colors[colorIndex],
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
            ingredients: details.ingredients,
            method: details.method,
            temperature: details.temperature,
            equation: details.equation,
            signature,
            discoveredAt: new Date().toISOString()
        };

        discoveries.unshift(entry);
        writeDB();

        return entry;
    }

    function distill() {
        if (selected.length !== 3) {
            setStatus("Seleziona esattamente 3 ingredienti con il tool.");
            return;
        }

        if (!selected.some(isAlcohol)) {
            setStatus("La distillazione richiede almeno un ingrediente alcolico.");
            return;
        }

        const method = prompt("Metodo di distillazione:", "semplice");

        if (!method) return;

        const temperatureInput = prompt("Temperatura in °C:", "78");

        if (temperatureInput === null) return;

        const temperature = Number(temperatureInput);

        if (!Number.isFinite(temperature) || temperature < -273.15) {
            setStatus("Temperatura non valida.");
            return;
        }

        const equation = prompt(
            "Equazione matematica o fisica:",
            "kg*m/s^2"
        );

        if (!equation) return;

        let parsed;

        try {
            parsed = interpretFormula(equation);
        } catch (error) {
            setStatus("Equazione non valida: " + error.message);
            return;
        }

        const signature = JSON.stringify({
            ingredients: selected.slice().sort(),
            method: method.trim().toLowerCase(),
            temperature,
            equation: parsed.normalized
        });

        if (discoveries.some(item => item.signature === signature)) {
            setStatus("Questa distillazione è già stata scoperta.");
            return;
        }

        const name = prompt(
            "Nome del nuovo distillato:",
            "Distillato " + fingerprint(signature).toUpperCase()
        );

        if (!name || !name.trim()) return;

        try {
            const entry = registerDistilledIngredient(signature, {
                name: name.trim(),
                ingredients: selected.slice(),
                method: method.trim(),
                temperature,
                equation: equation.trim()
            });

            selected = [];
            renderPanel();

            setStatus("Nuovo distillato registrato: " + entry.name);
        } catch (error) {
            setStatus("Distillazione non riuscita: " + error.message);
        }
    }

    function selectIngredient(item) {
        const id = resolveIngredientId(item);

        if (!id) {
            setStatus("Impossibile identificare l'ingrediente selezionato.");
            return;
        }

        if (selected.includes(id)) {
            setStatus("Ingrediente già selezionato.");
            return;
        }

        if (selected.length >= 3) {
            setStatus("Hai già selezionato tre ingredienti.");
            return;
        }

        selected.push(id);
        renderPanel();

        setStatus(
            selected.length === 3
                ? "Tre ingredienti selezionati. Premi Distilla."
                : "Ingrediente aggiunto (" + selected.length + "/3)."
        );
    }

    // --------------------------------------------------
    // INTERFACCIA
    // --------------------------------------------------

    function button(label, callback) {
        const element = document.createElement("button");

        element.type = "button";
        element.textContent = label;

        element.style.cssText =
            "padding:8px 10px;margin:3px;" +
            "border:0;border-radius:7px;" +
            "background:#246b68;color:white;cursor:pointer;";

        element.addEventListener("click", callback);

        return element;
    }

    function heading(text) {
        const element = document.createElement("h4");
        element.textContent = text;
        element.style.margin = "14px 0 7px";
        return element;
    }

    function renderRecords(container, records, formatter) {
        container.replaceChildren();

        if (!records.length) {
            container.textContent = "Archivio vuoto.";
            return;
        }

        for (const record of records) {
            const row = document.createElement("div");

            row.style.cssText =
                "padding:7px;margin:5px 0;" +
                "background:#183b3b;border-radius:6px;" +
                "overflow-wrap:anywhere;";

            const title = document.createElement("strong");
            title.textContent = formatter.title(record);

            const detail = document.createElement("div");
            detail.style.cssText =
                "font-size:12px;margin-top:4px;white-space:pre-wrap;";
            detail.textContent = formatter.detail(record);

            row.append(title, detail);
            container.appendChild(row);
        }
    }

    function renderPanel() {
        if (!panel) return;

        renderRecords(formulaList, formulas, {
            title: record => record.original,
            detail: record =>
                "Stato: " + record.status +
                "\nUnità: " + (record.components.units.join(", ") || "nessuna") +
                "\nFunzioni: " +
                (record.components.functions.join(", ") || "nessuna")
        });

        renderRecords(symbolList, symbols, {
            title: record => record.name,
            detail: record =>
                "Tipo: " + record.kind +
                "\nEsempio: " + (record.example || "—") +
                "\nOccorrenze: " + (record.occurrences || 1)
        });

        renderRecords(discoveryList, discoveries, {
            title: record => "🧪 " + record.name,
            detail: record =>
                "Metodo: " + record.method +
                "\nTemperatura: " + record.temperature + " °C" +
                "\nFormula: " + (record.equation || "—")
        });

        const selectionNode = document.getElementById(PREFIX + "-selection");

        if (selectionNode) {
            selectionNode.textContent = selected.length
                ? selected.map((id, index) =>
                    (index + 1) + ". " + id
                ).join(" | ")
                : "Nessun ingrediente selezionato.";
        }
    }

    function exportDatabase() {
        const data = {
            version: VERSION,
            exportedAt: new Date().toISOString(),
            formulas,
            symbols,
            units: customUnits,
            discoveries
        };

        const blob = new Blob(
            [JSON.stringify(data, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "infinite-chef-scientific-database.json";
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
            "position:fixed;right:14px;bottom:68px;" +
            "width:410px;max-width:calc(100vw - 28px);" +
            "max-height:78vh;overflow:auto;" +
            "z-index:2147483647;background:#102b2b;color:#e7ffff;" +
            "border:2px solid #3c9992;border-radius:12px;padding:12px;" +
            "box-sizing:border-box;font:14px Arial,sans-serif;" +
            "box-shadow:0 5px 25px #0009;";

        const title = document.createElement("h3");
        title.textContent = "⚗️ Distiller — Laboratorio scientifico";
        title.style.marginTop = "0";

        const intro = document.createElement("p");
        intro.textContent =
            "Inserisci liberamente formule matematiche, simboli e unità fisiche.";

        const formulaTitle = heading("Equazione");

        formulaInput = document.createElement("textarea");
        formulaInput.id = PREFIX + "-formula";
        formulaInput.placeholder =
            "Scrivi qui la tua equazione...\n" +
            "Esempi: 2*sin(Hz/cs), \\frac{kg\\cdot m}{s^2}, λ=c/f";

        formulaInput.rows = 4;

        formulaInput.style.cssText =
            "box-sizing:border-box;width:100%;padding:9px;" +
            "background:#071c1c;color:#e7ffff;" +
            "border:1px solid #438d87;border-radius:7px;" +
            "font:13px monospace;resize:vertical;";

        formulaInput.addEventListener("input", renderFormulaResult);

        resultNode = document.createElement("pre");
        resultNode.id = PREFIX + "-result";

        resultNode.style.cssText =
            "white-space:pre-wrap;overflow-wrap:anywhere;" +
            "background:#071c1c;border-radius:7px;padding:9px;" +
            "font:12px monospace;";

        const formulaButtons = document.createElement("div");

        formulaButtons.append(
            button("Interpreta e salva", saveFormula),
            button("Pulisci", function () {
                formulaInput.value = "";
                renderFormulaResult();
                formulaInput.focus();
            })
        );

        const selectionTitle = heading("Ingredienti selezionati");

        const selectionNode = document.createElement("div");
        selectionNode.id = PREFIX + "-selection";

        const actions = document.createElement("div");

        actions.append(
            button("Distilla 3 ingredienti", distill),
            button("Annulla selezione", function () {
                selected = [];
                renderPanel();
                setStatus("Selezione annullata.");
            }),
            button("Esporta database", exportDatabase),
            button("Chiudi", function () {
                panel.style.display = "none";
            })
        );

        formulaList = document.createElement("div");
        symbolList = document.createElement("div");
        discoveryList = document.createElement("div");

        statusNode = document.createElement("div");
        statusNode.style.cssText =
            "margin-top:10px;color:#8de0ce;font-size:12px;" +
            "overflow-wrap:anywhere;";

        panel.append(
            title,
            intro,
            formulaTitle,
            formulaInput,
            formulaButtons,
            resultNode,
            selectionTitle,
            selectionNode,
            actions,
            heading("Database dinamico delle formule"),
            formulaList,
            heading("Simboli riconosciuti"),
            symbolList,
            heading("Distillati scoperti"),
            discoveryList,
            statusNode
        );

        document.body.appendChild(panel);

        renderPanel();
        renderFormulaResult();
        setStatus("Laboratorio pronto.");
    }

    // --------------------------------------------------
    // PULSANTE E INIZIALIZZAZIONE
    // --------------------------------------------------

    function createLauncher() {
        if (!document.body) return;

        if (document.getElementById(PREFIX + "-launcher")) return;

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

    function registerGameTool() {
        if (gameToolRegistered) return true;

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
                    setStatus("Tool attivo: seleziona gli ingredienti.");
                },
                onDeselect: function () {
                    setStatus("Tool disattivato.");
                },
                shape: "liquid"
            });

            gameToolRegistered = true;
            console.log("[Distiller] Tool registrato nel gioco.");

            return true;
        } catch (error) {
            console.warn("[Distiller] Registrazione non riuscita:", error);
            return false;
        }
    }

    function start() {
        createLauncher();

        // Il pulsante UI non dipende dalle API del gioco.
        // La registrazione del tool viene ritentata separatamente.
        let attempts = 0;

        const timer = setInterval(function () {
            createLauncher();

            if (registerGameTool()) {
                clearInterval(timer);
                return;
            }

            attempts++;

            if (attempts >= 120) {
                clearInterval(timer);

                console.warn(
                    "[Distiller] Il launcher è disponibile, ma le API del " +
                    "gioco non sono state individuate."
                );
            }
        }, 500);

        console.log("[Distiller] Versione " + VERSION + " avviata.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();
