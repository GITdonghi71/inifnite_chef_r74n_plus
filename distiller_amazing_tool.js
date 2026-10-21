
"use strict";

/*
 * Infinite Chef R74N Plus
 * Mathematical / Physical Distiller
 * Version: 2.0.0
 *
 * Features:
 * - Safe recursive-descent parser (no eval / Function)
 * - SI base and derived units, prefixes and dimensions
 * - Common LaTeX and Unicode normalization
 * - Symbolic formulas and numeric evaluation
 * - Dimensional validation
 * - Explicit handling of affine temperature units
 * - Dynamic, versioned JSON database
 * - localStorage persistence where available
 *
 * This is a standalone module. Integrate its API with the
 * original game's distill() and ingredient-recording functions.
 */

const ScientificDistiller = (() => {
    const VERSION = "2.0.0";
    const DB_KEY = "infinite_chef_scientific_db_v2";
    const MAX_INPUT_LENGTH = 4000;
    const MAX_NODES = 1000;
    const MAX_DEPTH = 100;

    const DIMENSIONS = [
        "L", "M", "T", "I", "Theta", "N", "J"
    ];

    const zeroDim = () => [0, 0, 0, 0, 0, 0, 0];

    const dimAdd = (a, b) => a.map((v, i) => v + b[i]);
    const dimSub = (a, b) => a.map((v, i) => v - b[i]);
    const dimScale = (a, n) => a.map(v => v * n);

    const dimEqual = (a, b) =>
        a.every((v, i) => Math.abs(v - b[i]) < 1e-10);

    const dimZero = a => dimEqual(a, zeroDim());

    function dimensionObject(dim) {
        const out = {};
        DIMENSIONS.forEach((name, i) => {
            if (Math.abs(dim[i]) > 1e-10) out[name] = dim[i];
        });
        return out;
    }

    function fail(message, code = "INVALID_EXPRESSION") {
        const error = new Error(message);
        error.code = code;
        throw error;
    }

    // -------------------------------------------------------
    // 1. UNIT CATALOG
    // -------------------------------------------------------

    const units = Object.create(null);

    function addUnit(symbol, name, factor, dim, options = {}) {
        units[symbol] = Object.freeze({
            symbol,
            name,
            factor,
            dim: [...dim],
            offset: options.offset || 0,
            affine: Boolean(options.affine),
            prefixable: Boolean(options.prefixable),
            source: options.source || "SI",
            custom: Boolean(options.custom)
        });
    }

    const L  = [1, 0, 0, 0, 0, 0, 0];
    const M  = [0, 1, 0, 0, 0, 0, 0];
    const T  = [0, 0, 1, 0, 0, 0, 0];
    const I  = [0, 0, 0, 1, 0, 0, 0];
    const TH = [0, 0, 0, 0, 1, 0, 0];
    const N  = [0, 0, 0, 0, 0, 1, 0];
    const J  = [0, 0, 0, 0, 0, 0, 1];

    addUnit("m", "metre", 1, L, { prefixable: true });
    addUnit("kg", "kilogram", 1, M);
    addUnit("g", "gram", 1e-3, M, { prefixable: true });
    addUnit("s", "second", 1, T, { prefixable: true });
    addUnit("A", "ampere", 1, I, { prefixable: true });
    addUnit("K", "kelvin", 1, TH, { prefixable: true });
    addUnit("mol", "mole", 1, N, { prefixable: true });
    addUnit("cd", "candela", 1, J, { prefixable: true });

    addUnit("rad", "radian", 1, zeroDim(), { prefixable: false });
    addUnit("sr", "steradian", 1, zeroDim(), { prefixable: false });

    addUnit("Hz", "hertz", 1, [0, 0, -1, 0, 0, 0, 0], {
        prefixable: true
    });
    addUnit("N", "newton", 1, [1, 1, -2, 0, 0, 0, 0], {
        prefixable: true
    });
    addUnit("Pa", "pascal", 1, [-1, 1, -2, 0, 0, 0, 0], {
        prefixable: true
    });
    addUnit("J", "joule", 1, [2, 1, -2, 0, 0, 0, 0], {
        prefixable: true
    });
    addUnit("W", "watt", 1, [2, 1, -3, 0, 0, 0, 0], {
        prefixable: true
    });
    addUnit("C", "coulomb", 1, [0, 0, 1, 1, 0, 0, 0], {
        prefixable: true
    });
    addUnit("V", "volt", 1, [2, 1, -3, -1, 0, 0, 0], {
        prefixable: true
    });
    addUnit("F", "farad", 1, [-2, -1, 4, 2, 0, 0, 0], {
        prefixable: true
    });
    addUnit("Ohm", "ohm", 1, [2, 1, -3, -2, 0, 0, 0], {
        prefixable: true
    });
    addUnit("S", "siemens", 1, [-2, -1, 3, 2, 0, 0, 0], {
        prefixable: true
    });
    addUnit("Wb", "weber", 1, [2, 1, -2, -1, 0, 0, 0], {
        prefixable: true
    });
    addUnit("T", "tesla", 1, [0, 1, -2, -1, 0, 0, 0], {
        prefixable: true
    });
    addUnit("H", "henry", 1, [2, 1, -2, -2, 0, 0, 0], {
        prefixable: true
    });
    addUnit("lm", "lumen", 1, J, { prefixable: true });
    addUnit("lx", "lux", 1, [-2, 0, 0, 0, 0, 0, 1], {
        prefixable: true
    });
    addUnit("Bq", "becquerel", 1, [0, 0, -1, 0, 0, 0, 0], {
        prefixable: true
    });
    addUnit("Gy", "gray", 1, [2, 0, -2, 0, 0, 0, 0], {
        prefixable: true
    });
    addUnit("Sv", "sievert", 1, [2, 0, -2, 0, 0, 0, 0], {
        prefixable: true
    });
    addUnit("kat", "katal", 1, [0, 0, -1, 0, 0, 1, 0], {
        prefixable: true
    });

    // SI derived units with special names and exact factors.
    addUnit("min", "minute", 60, T);
    addUnit("h", "hour", 3600, T);
    addUnit("d", "day", 86400, T);
    addUnit("L", "litre", 1e-3, [3, 0, 0, 0, 0, 0, 0], {
        prefixable: true
    });
    addUnit("bar", "bar", 1e5, units.Pa.dim);
    addUnit("eV", "electronvolt", 1.602176634e-19, units.J.dim, {
        prefixable: true
    });
    addUnit("deg", "degree", Math.PI / 180, zeroDim());
    addUnit("degC", "degree Celsius", 1, TH, {
        affine: true,
        offset: 273.15
    });
    addUnit("degF", "degree Fahrenheit", 5 / 9, TH, {
        affine: true,
        offset: 255.3722222222222
    });

    const prefixes = [
        ["da", 1e1], ["Q", 1e30], ["R", 1e27],
        ["Y", 1e24], ["Z", 1e21], ["E", 1e18],
        ["P", 1e15], ["T", 1e12], ["G", 1e9],
        ["M", 1e6], ["k", 1e3], ["h", 1e2],
        ["d", 1e-1], ["c", 1e-2], ["m", 1e-3],
        ["u", 1e-6], ["n", 1e-9], ["p", 1e-12],
        ["f", 1e-15], ["a", 1e-18], ["z", 1e-21],
        ["y", 1e-24], ["r", 1e-27], ["q", 1e-30]
    ].sort((a, b) => b[0].length - a[0].length);

    function getUnit(symbol) {
        if (Object.hasOwn(units, symbol)) return units[symbol];

        // The prefix is case-sensitive. Exact symbols are tried first.
        for (const [prefix, factor] of prefixes) {
            if (!symbol.startsWith(prefix)) continue;

            const baseSymbol = symbol.slice(prefix.length);
            if (!baseSymbol || !Object.hasOwn(units, baseSymbol)) continue;

            const base = units[baseSymbol];

            if (!base.prefixable || base.affine) continue;

            // The kilogram is already a prefixed SI base unit.
            if (baseSymbol === "kg") continue;

            return {
                ...base,
                symbol,
                name: prefix + base.name,
                factor: factor * base.factor,
                custom: false,
                prefixed: true
            };
        }

        // Centisecond, millisecond, microsecond, etc.
        return null;
    }

    // -------------------------------------------------------
    // 2. DYNAMIC DATABASE
    // -------------------------------------------------------

    function freshDB() {
        return {
            schemaVersion: 2,
            engineVersion: VERSION,
            units: {},
            symbols: {},
            expressions: {},
            history: []
        };
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    let db = freshDB();

    function persist() {
        try {
            if (typeof localStorage !== "undefined") {
                localStorage.setItem(DB_KEY, JSON.stringify(db));
            }
            return true;
        } catch (error) {
            // Quota restrictions or unavailable storage.
            return false;
        }
    }

    function load() {
        try {
            if (typeof localStorage === "undefined") return;

            const raw = localStorage.getItem(DB_KEY);
            if (!raw) return;

            const parsed = JSON.parse(raw);

            if (!parsed || parsed.schemaVersion !== 2 ||
                typeof parsed.expressions !== "object") {
                return;
            }

            db = { ...freshDB(), ...parsed };
        } catch {
            db = freshDB();
        }
    }

    load();

    function hash(text) {
        let h = 2166136261;

        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }

        return (h >>> 0).toString(16);
    }

    function registerUnit(symbol, definition) {
        if (typeof symbol !== "string" || !symbol.trim()) {
            fail("Invalid unit symbol.");
        }

        if (!definition || !Array.isArray(definition.dim) ||
            definition.dim.length !== 7 ||
            !definition.dim.every(Number.isFinite)) {
            fail("Unit dimensions must contain seven finite exponents.");
        }

        if (!Number.isFinite(definition.factor) || definition.factor <= 0) {
            fail("Unit factor must be positive and finite.");
        }

        const unit = {
            symbol,
            name: definition.name || symbol,
            factor: definition.factor,
            dim: [...definition.dim],
            offset: definition.offset || 0,
            affine: Boolean(definition.affine),
            prefixable: Boolean(definition.prefixable),
            source: definition.source || "user-defined",
            verified: false,
            custom: true
        };

        db.units[symbol] = unit;
        persist();

        return clone(unit);
    }

    function registerSymbol(name, value, options = {}) {
        if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test(name)) {
            fail("Invalid symbol name.");
        }

        if (typeof value !== "number" && typeof value !== "object") {
            fail("Symbol value must be numeric or a quantity.");
        }

        db.symbols[name] = {
            name,
            value,
            dimensions: options.dimensions || null,
            description: options.description || "",
            source: options.source || "user-defined"
        };

        persist();
        return clone(db.symbols[name]);
    }

    function saveExpression(record) {
        const id = "expr_" + hash(record.original);
        const entry = {
            id,
            createdAt: new Date().toISOString(),
            ...record
        };

        db.expressions[id] = entry;
        db.history = [
            id,
            ...db.history.filter(existing => existing !== id)
        ].slice(0, 10000);

        // Unknown units are deliberately NOT added to the SI catalog.
        // Custom unit definitions must be registered explicitly.
        persist();

        return clone(entry);
    }

    // -------------------------------------------------------
    // 3. LATEX / UNICODE NORMALIZATION
    // -------------------------------------------------------

    const GREEK = {
        "\\alpha": "alpha", "\\beta": "beta",
        "\\gamma": "gamma", "\\delta": "delta",
        "\\epsilon": "epsilon", "\\theta": "theta",
        "\\lambda": "lambda", "\\mu": "mu",
        "\\pi": "pi", "\\rho": "rho",
        "\\sigma": "sigma", "\\tau": "tau",
        "\\phi": "phi", "\\omega": "omega",
        "\\Omega": "Omega", "\\Delta": "Delta",
        "\\Gamma": "Gamma", "\\Lambda": "Lambda",
        "\\Sigma": "Sigma", "\\Phi": "Phi"
    };

    function normalize(input) {
        let s = String(input).trim();

        if (!s) fail("Expression is empty.");
        if (s.length > MAX_INPUT_LENGTH) fail("Expression too long.");

        // Reject control characters.
        if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(s)) {
            fail("Control characters are not allowed.");
        }

        for (const [from, to] of Object.entries(GREEK)) {
            s = s.split(from).join(to);
        }

        // Convert supported LaTeX structures.
        s = s
            .replace(/\\left\b/g, "")
            .replace(/\\right\b/g, "")
            .replace(/\\cdot\b/g, "*")
            .replace(/\\times\b/g, "*")
            .replace(/\\div\b/g, "/")
            .replace(/\\,/g, " ")
            .replace(/\\;/g, " ")
            .replace(/\\!/g, "")
            .replace(/\\quad\b/g, " ")
            .replace(/\\qquad\b/g, " ")
            .replace(/\\sin\b/g, "sin")
            .replace(/\\cos\b/g, "cos")
            .replace(/\\tan\b/g, "tan")
            .replace(/\\arcsin\b/g, "asin")
            .replace(/\\arccos\b/g, "acos")
            .replace(/\\arctan\b/g, "atan")
            .replace(/\\sqrt\b/g, "sqrt")
            .replace(/\\exp\b/g, "exp")
            .replace(/\\ln\b/g, "ln")
            .replace(/\\log\b/g, "log")
            .replace(/\\pi\b/g, "pi");

        // Convert nested fractions and square roots.
        // Braced expressions may nest; a small scanner handles braces.
        function replaceBracedCommand(text, command, replacement) {
            let output = "";
            let cursor = 0;

            while (cursor < text.length) {
                const start = text.indexOf(command, cursor);

                if (start < 0) {
                    output += text.slice(cursor);
                    break;
                }

                output += text.slice(cursor, start);
                let p = start + command.length;

                while (/\s/.test(text[p] || "")) p++;

                function readGroup(index) {
                    if (text[index] !== "{") return null;

                    let depth = 1;
                    let j = index + 1;

                    for (; j < text.length && depth > 0; j++) {
                        if (text[j] === "{") depth++;
                        if (text[j] === "}") depth--;
                    }

                    if (depth !== 0) fail("Unbalanced LaTeX braces.");

                    return {
                        content: text.slice(index + 1, j - 1),
                        next: j
                    };
                }

                const first = readGroup(p);

                if (!first) {
                    output += command;
                    cursor = p;
                    continue;
                }

                if (command === "\\frac") {
                    let q = first.next;

                    while (/\s/.test(text[q] || "")) q++;

                    const second = readGroup(q);

                    if (!second) fail("\\frac requires two braced arguments.");

                    output += "((" + first.content + ")/(" +
                        second.content + "))";

                    cursor = second.next;
                } else {
                    output += "sqrt(" + first.content + ")";
                    cursor = first.next;
                }
            }

            return output;
        }

        for (let i = 0; i < 20; i++) {
            const previous = s;

            s = replaceBracedCommand(s, "\\frac", true);
            s = replaceBracedCommand(s, "\\sqrt", true);

            if (s === previous) break;
        }

        // Unsupported commands must never silently disappear.
        if (/\\[A-Za-z]+/.test(s)) {
            fail("Unsupported LaTeX command: " +
                (s.match(/\\[A-Za-z]+/) || [""])[0],
                "UNSUPPORTED_LATEX");
        }

        s = s
            .replace(/×/g, "*")
            .replace(/[·⋅]/g, "*")
            .replace(/÷/g, "/")
            .replace(/[−–]/g, "-")
            .replace(/π/g, "pi")
            .replace(/λ/g, "lambda")
            .replace(/θ/g, "theta")
            .replace(/μ/g, "mu")
            .replace(/ω/g, "omega")
            .replace(/Ω/g, "Omega")
            .replace(/Δ/g, "Delta")
            .replace(/²/g, "^2")
            .replace(/³/g, "^3")
            .replace(/⁴/g, "^4")
            .replace(/⁵/g, "^5")
            .replace(/[{}]/g, ch => ch === "{" ? "(" : ")")
            .replace(/\s+/g, " ")
            .trim();

        // The degree sign is normalized only in known temperature forms.
        s = s.replace(/°\s*C\b/g, "degC")
             .replace(/°\s*F\b/g, "degF");

        return s;
    }

    // -------------------------------------------------------
    // 4. TOKENIZER
    // -------------------------------------------------------

    function tokenize(source) {
        const out = [];
        let i = 0;

        while (i < source.length) {
            const ch = source[i];

            if (/\s/.test(ch)) {
                i++;
                continue;
            }

            const num = source.slice(i).match(
                /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/
            );

            if (num) {
                const value = Number(num[0]);

                if (!Number.isFinite(value)) {
                    fail("Invalid numeric literal.");
                }

                out.push({ type: "number", value, raw: num[0] });
                i += num[0].length;
                continue;
            }

            const id = source.slice(i).match(
                /^[\p{L}_][\p{L}\p{N}_]*/u
            );

            if (id) {
                out.push({ type: "id", value: id[0], raw: id[0] });
                i += id[0].length;
                continue;
            }

            if ("+-*/^()=,".includes(ch)) {
                out.push({ type: ch, value: ch, raw: ch });
                i++;
                continue;
            }

            fail("Unsupported character '" + ch + "' at position " + i);
        }

        out.push({ type: "EOF", value: null, raw: "" });
        return out;
    }

    // -------------------------------------------------------
    // 5. RECURSIVE-DESCENT PARSER
    // -------------------------------------------------------

    function parse(source) {
        const tokens = tokenize(source);
        let pos = 0;
        let nodeCount = 0;

        const peek = () => tokens[pos];
        const take = () => tokens[pos++];

        function node(type, props) {
            nodeCount++;

            if (nodeCount > MAX_NODES) {
                fail("Expression contains too many syntax nodes.");
            }

            return { type, ...props };
        }

        function expect(type) {
            if (peek().type !== type) {
                fail("Expected '" + type + "', found '" +
                    (peek().raw || peek().type) + "'.");
            }

            return take();
        }

        function primaryStart(t) {
            return t.type === "number" ||
                t.type === "id" ||
                t.type === "(";
        }

        function expression(depth = 0) {
            if (depth > MAX_DEPTH) fail("Expression nesting too deep.");

            let left = term(depth + 1);

            while (peek().type === "+" || peek().type === "-") {
                const op = take().type;
                left = node("binary", {
                    op, left, right: term(depth + 1)
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
                        op, left, right: unary(depth + 1)
                    });

                    continue;
                }

                // Implicit multiplication: 2x, 2(x+1), 3 sin(x).
                if (primaryStart(peek())) {
                    left = node("binary", {
                        op: "*", left, right: unary(depth + 1)
                    });

                    continue;
                }

                break;
            }

            return left;
        }

        function unary(depth) {
            if (peek().type === "+" || peek().type === "-") {
                const op = take().type;

                return node("unary", {
                    op, value: unary(depth + 1)
                });
            }

            return power(depth + 1);
        }

        function power(depth) {
            let left = primary(depth + 1);

            if (peek().type === "^") {
                take();

                left = node("binary", {
                    op: "^",
                    left,
                    right: unary(depth + 1)
                });
            }

            return left;
        }

        function primary(depth) {
            if (depth > MAX_DEPTH) fail("Expression nesting too deep.");

            const t = peek();

            if (t.type === "number") {
                take();
                return node("number", { value: t.value });
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

                    return node("call", { name: t.value, args });
                }

                return node("identifier", { name: t.value });
            }

            if (t.type === "(") {
                take();
                const result = expression(depth + 1);
                expect(")");
                return result;
            }

            fail("Unexpected token '" + (t.raw || t.type) + "'.");
        }

        const left = expression();

        let result = left;

        if (peek().type === "=") {
            take();

            result = node("equation", {
                left,
                right: expression()
            });
        }

        if (peek().type !== "EOF") {
            fail("Unexpected token '" + peek().raw + "'.");
        }

        return result;
    }

    // -------------------------------------------------------
    // 6. QUANTITIES, CONSTANTS AND EVALUATION
    // -------------------------------------------------------

    function quantity(value, dim = zeroDim(), options = {}) {
        return {
            value,
            dim: [...dim],
            known: options.known !== false,
            affine: Boolean(options.affine),
            absoluteTemperature: Boolean(options.absoluteTemperature),
            unitSymbol: options.unitSymbol || null
        };
    }

    const CONSTANTS = {
        pi: { value: Math.PI, dim: zeroDim() },
        e: { value: Math.E, dim: zeroDim() },
        c: { value: 299792458, dim: [1, 0, -1, 0, 0, 0, 0] },
        g0: { value: 9.80665, dim: [1, 0, -2, 0, 0, 0, 0] },
        hPlanck: {
            value: 6.62607015e-34,
            dim: [2, 1, -1, 0, 0, 0, 0]
        },
        kB: {
            value: 1.380649e-23,
            dim: [2, 1, -2, 0, -1, 0, 0]
        },
        N_A: {
            value: 6.02214076e23,
            dim: [0, 0, 0, 0, 0, -1, 0]
        }
    };

    function resolveIdentifier(name, variables = {}) {
        if (Object.hasOwn(variables, name)) {
            const v = variables[name];

            if (typeof v === "number") return quantity(v);

            if (v && typeof v.value === "number") {
                return quantity(v.value, v.dim || zeroDim());
            }

            fail("Invalid value supplied for variable '" + name + "'.");
        }

        if (Object.hasOwn(db.symbols, name)) {
            const v = db.symbols[name];

            if (typeof v.value === "number") {
                return quantity(v.value, v.dimensions || zeroDim());
            }

            if (v.value && typeof v.value.value === "number") {
                return quantity(
                    v.value.value,
                    v.value.dim || zeroDim()
                );
            }
        }

        if (Object.hasOwn(CONSTANTS, name)) {
            return quantity(
                CONSTANTS[name].value,
                CONSTANTS[name].dim
            );
        }

        const u = getUnit(name);

        if (u) {
            return quantity(u.factor, u.dim, {
                affine: u.affine,
                absoluteTemperature: u.affine,
                unitSymbol: u.symbol
            });
        }

        // A previously unknown identifier is symbolic, not an SI unit.
        return quantity(null, zeroDim(), { known: false });
    }

    const FUNCTIONS = {
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        asin: Math.asin,
        acos: Math.acos,
        atan: Math.atan,
        exp: Math.exp,
        ln: Math.log,
        log: Math.log10,
        abs: Math.abs,
        floor: Math.floor,
        ceil: Math.ceil
    };

    function evalAst(ast, variables = {}) {
        switch (ast.type) {
            case "number":
                return quantity(ast.value);

            case "identifier":
                return resolveIdentifier(ast.name, variables);

            case "unary": {
                const a = evalAst(ast.value, variables);

                if (!a.known) return a;
                if (a.affine) {
                    fail("An affine temperature cannot be negated as a unit.");
                }

                return quantity(
                    ast.op === "-" ? -a.value : a.value,
                    a.dim
                );
            }

            case "binary": {
                const a = evalAst(ast.left, variables);
                const b = evalAst(ast.right, variables);

                if (!a.known || !b.known) {
                    return quantity(null, zeroDim(), { known: false });
                }

                if (ast.op !== "*" && ast.op !== "/" &&
                    (a.affine || b.affine)) {
                    fail("Affine temperature units require explicit conversion.");
                }

                if (ast.op === "+" || ast.op === "-") {
                    if (!dimEqual(a.dim, b.dim)) {
                        fail("Addition/subtraction of incompatible dimensions.");
                    }

                    return quantity(
                        ast.op === "+" ? a.value + b.value : a.value - b.value,
                        a.dim
                    );
                }

                if (ast.op === "*") {
                    // Affine units must first be converted to absolute K.
                    if (a.affine || b.affine) {
                        fail("Cannot multiply an affine temperature unit.");
                    }

                    return quantity(
                        a.value * b.value,
                        dimAdd(a.dim, b.dim)
                    );
                }

                if (ast.op === "/") {
                    if (b.value === 0) fail("Division by zero.");

                    if (a.affine || b.affine) {
                        fail("Cannot divide an affine temperature unit.");
                    }

                    return quantity(
                        a.value / b.value,
                        dimSub(a.dim, b.dim)
                    );
                }

                if (ast.op === "^") {
                    if (!dimZero(b.dim)) {
                        fail("Exponent must be dimensionless.");
                    }

                    if (!dimZero(a.dim) && !Number.isInteger(b.value)) {
                        fail("Dimensioned quantities require integer powers.");
                    }

                    if (a.affine) fail("Cannot exponentiate an affine unit.");

                    return quantity(
                        Math.pow(a.value, b.value),
                        dimScale(a.dim, b.value)
                    );
                }

                fail("Unknown operator.");
            }

            case "call": {
                if (ast.args.length !== 1) {
                    fail(ast.name + "() requires exactly one argument.");
                }

                const arg = evalAst(ast.args[0], variables);

                if (!arg.known) {
                    return quantity(null, zeroDim(), { known: false });
                }

                if (arg.affine) {
                    fail("Convert affine temperatures to kelvin first.");
                }

                if (Object.hasOwn(FUNCTIONS, ast.name)) {
                    if (!dimZero(arg.dim)) {
                        fail(ast.name + "() requires a dimensionless argument.");
                    }

                    return quantity(FUNCTIONS[ast.name](arg.value));
                }

                if (ast.name === "sqrt") {
                    if (arg.dim.some(v => Math.abs(v % 2) > 1e-10)) {
                        fail("sqrt() requires even dimension exponents.");
                    }

                    if (arg.value < 0) {
                        fail("sqrt() of a negative real value is not supported.");
                    }

                    return quantity(
                        Math.sqrt(arg.value),
                        dimScale(arg.dim, 0.5)
                    );
                }

                fail("Unsupported function: " + ast.name, "UNKNOWN_FUNCTION");
            }

            case "equation": {
                const left = evalAst(ast.left, variables);
                const right = evalAst(ast.right, variables);

                if (!left.known || !right.known) {
                    return {
                        equation: true,
                        left,
                        right,
                        known: false,
                        consistent: null
                    };
                }

                return {
                    equation: true,
                    left,
                    right,
                    known: true,
                    consistent: dimEqual(left.dim, right.dim)
                };
            }

            default:
                fail("Unknown AST node.");
        }
    }

    // -------------------------------------------------------
    // 7. COMPONENT EXTRACTION
    // -------------------------------------------------------

    function collectComponents(ast) {
        const found = {
            functions: [],
            units: [],
            variables: [],
            constants: [],
            operators: [],
            numbers: []
        };

        function walk(n) {
            if (!n) return;

            if (n.type === "number") found.numbers.push(n.value);

            if (n.type === "identifier") {
                const name = n.name;

                if (getUnit(name)) found.units.push(name);
                else if (Object.hasOwn(CONSTANTS, name)) {
                    found.constants.push(name);
                } else {
                    found.variables.push(name);
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

    // -------------------------------------------------------
    // 8. PUBLIC INTERPRETER
    // -------------------------------------------------------

    function interpret(input, options = {}) {
        const original = String(input).trim();
        const normalized = normalize(original);
        const ast = parse(normalized);
        const components = collectComponents(ast);

        let evaluation = null;
        let evaluationError = null;

        try {
            evaluation = evalAst(ast, options.variables || {});
        } catch (error) {
            evaluationError = {
                code: error.code || "EVALUATION_ERROR",
                message: error.message
            };
        }

        let status;
        let value = null;
        let dimensions = null;
        let dimensionalValidation = "undetermined";

        if (evaluationError) {
            status = "recognized_invalid";
            dimensionalValidation = "invalid";
        } else if (evaluation && evaluation.equation) {
            if (!evaluation.known) {
                status = "symbolic";
            } else if (!evaluation.consistent) {
                status = "dimensionally_invalid";
                dimensionalValidation = "invalid";
            } else {
                status = "calculated";
                dimensionalValidation = "valid";
                value = {
                    left: evaluation.left.value,
                    right: evaluation.right.value
                };
                dimensions = dimensionObject(evaluation.left.dim);
            }
        } else if (evaluation && evaluation.known) {
            status = "calculated";
            value = evaluation.value;
            dimensions = dimensionObject(evaluation.dim);
            dimensionalValidation = "valid";
        } else {
            status = "symbolic";
        }

        const record = {
            original,
            normalized,
            ast,
            components,
            status,
            value,
            dimensions,
            validation: {
                syntax: "valid",
                dimensional: dimensionalValidation,
                error: evaluationError
            },
            metadata: {
                engineVersion: VERSION,
                schemaVersion: 2,
                variablesProvided: Object.keys(options.variables || {})
            }
        };

        return saveExpression(record);
    }

    function listExpressions() {
        return db.history
            .map(id => db.expressions[id])
            .filter(Boolean)
            .map(clone);
    }

    function searchExpressions(query) {
        const q = String(query).toLowerCase();

        return listExpressions().filter(record =>
            record.original.toLowerCase().includes(q) ||
            record.normalized.toLowerCase().includes(q) ||
            record.components.units.some(x => x.toLowerCase().includes(q)) ||
            record.components.functions.some(x => x.toLowerCase().includes(q))
        );
    }

    function getDatabase() {
        return clone(db);
    }

    function exportJSON() {
        return JSON.stringify(db, null, 2);
    }

    function importJSON(json) {
        const incoming = JSON.parse(json);

        if (!incoming || incoming.schemaVersion !== 2 ||
            !incoming.expressions || !incoming.units ||
            !incoming.symbols || !Array.isArray(incoming.history)) {
            fail("Invalid or incompatible database schema.");
        }

        // Validate custom unit definitions before accepting the import.
        for (const [symbol, unit] of Object.entries(incoming.units)) {
            if (!symbol || !Array.isArray(unit.dim) ||
                unit.dim.length !== 7 ||
                !unit.dim.every(Number.isFinite) ||
                !Number.isFinite(unit.factor) ||
                unit.factor <= 0) {
                fail("Invalid unit definition in imported database.");
            }
        }

        db = clone(incoming);
        persist();

        return true;
    }

    function clearDatabase() {
        db = freshDB();
        persist();
    }

    return Object.freeze({
        version: VERSION,
        interpret,
        normalize,
        getUnit,
        registerUnit,
        registerSymbol,
        listExpressions,
        searchExpressions,
        getDatabase,
        exportJSON,
        importJSON,
        clearDatabase
    });
})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = ScientificDistiller;
}
