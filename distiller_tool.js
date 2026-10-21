
"use strict";

/*
 * Infinite Chef R74N Plus
 * Dynamic Mathematical & Physical Distiller
 *
 * Features:
 * - Mathematical expression parser (AST)
 * - SI units and derived units
 * - SI prefixes
 * - Unicode and common LaTeX normalization
 * - Dimensional analysis
 * - Numeric evaluation where possible
 * - Dynamic local database
 * - Import/export JSON
 *
 * No eval() or Function() execution.
 */

const ScientificDistiller = (() => {
    const DB_KEY = "infinite_chef_scientific_db_v1";

    const DIMENSIONS = [
        "L",  // length
        "M",  // mass
        "T",  // time
        "I",  // electric current
        "Theta", // thermodynamic temperature
        "N",  // amount of substance
        "J"   // luminous intensity
    ];

    const ZERO_DIM = () => [0, 0, 0, 0, 0, 0, 0];

    function dimAdd(a, b) {
        return a.map((v, i) => v + b[i]);
    }

    function dimSub(a, b) {
        return a.map((v, i) => v - b[i]);
    }

    function dimScale(a, n) {
        return a.map(v => v * n);
    }

    function dimEqual(a, b) {
        return a.every((v, i) => Math.abs(v - b[i]) < 1e-10);
    }

    function dimIsZero(a) {
        return dimEqual(a, ZERO_DIM());
    }

    function dimensionObject(dim) {
        const result = {};
        DIMENSIONS.forEach((name, i) => {
            if (dim[i] !== 0) result[name] = dim[i];
        });
        return result;
    }

    // Unit definitions use SI base units.
    // factor converts the unit into the coherent SI system.
    const UNITS = Object.create(null);

    function defineUnit(symbol, name, factor, dim, extra = {}) {
        UNITS[symbol] = {
            symbol,
            name,
            factor,
            dim,
            ...extra
        };
    }

    const L = [1, 0, 0, 0, 0, 0, 0];
    const M = [0, 1, 0, 0, 0, 0, 0];
    const T = [0, 0, 1, 0, 0, 0, 0];
    const I = [0, 0, 0, 1, 0, 0, 0];
    const TH = [0, 0, 0, 0, 1, 0, 0];
    const N = [0, 0, 0, 0, 0, 1, 0];
    const J = [0, 0, 0, 0, 0, 0, 1];

    defineUnit("m", "metre", 1, L);
    defineUnit("kg", "kilogram", 1, M);
    defineUnit("g", "gram", 1e-3, M);
    defineUnit("s", "second", 1, T);
    defineUnit("A", "ampere", 1, I);
    defineUnit("K", "kelvin", 1, TH);
    defineUnit("mol", "mole", 1, N);
    defineUnit("cd", "candela", 1, J);

    defineUnit("Hz", "hertz", 1, dimScale(T, -1));
    defineUnit("N", "newton", 1, [1, 1, -2, 0, 0, 0, 0]);
    defineUnit("Pa", "pascal", 1, [-1, 1, -2, 0, 0, 0, 0]);
    defineUnit("J", "joule", 1, [2, 1, -2, 0, 0, 0, 0]);
    defineUnit("W", "watt", 1, [2, 1, -3, 0, 0, 0, 0]);
    defineUnit("C", "coulomb", 1, [0, 0, 1, 1, 0, 0, 0]);
    defineUnit("V", "volt", 1, [2, 1, -3, -1, 0, 0, 0]);
    defineUnit("F", "farad", 1, [-2, -1, 4, 2, 0, 0, 0]);
    defineUnit("Ohm", "ohm", 1, [2, 1, -3, -2, 0, 0, 0]);
    defineUnit("S", "siemens", 1, [-2, -1, 3, 2, 0, 0, 0]);
    defineUnit("Wb", "weber", 1, [2, 1, -2, -1, 0, 0, 0]);
    defineUnit("T", "tesla", 1, [0, 1, -2, -1, 0, 0, 0]);
    defineUnit("H", "henry", 1, [2, 1, -2, -2, 0, 0, 0]);
    defineUnit("lm", "lumen", 1, J);
    defineUnit("lx", "lux", 1, [-2, 0, 0, 0, 0, 0, 1]);
    defineUnit("Bq", "becquerel", 1, dimScale(T, -1));
    defineUnit("Gy", "gray", 1, [2, 0, -2, 0, 0, 0, 0]);
    defineUnit("Sv", "sievert", 1, [2, 0, -2, 0, 0, 0, 0]);
    defineUnit("kat", "katal", 1, [0, 0, -1, 0, 0, 1, 0]);

    // Common non-SI units.
    defineUnit("min", "minute", 60, T);
    defineUnit("h", "hour", 3600, T);
    defineUnit("L", "litre", 1e-3, [3, 0, 0, 0, 0, 0, 0]);
    defineUnit("bar", "bar", 1e5, UNITS.Pa.dim);
    defineUnit("eV", "electronvolt", 1.602176634e-19, UNITS.J.dim);

    // Prefixes. Case-sensitive symbols are important.
    const PREFIXES = [
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
        if (Object.prototype.hasOwnProperty.call(UNITS, symbol)) {
            return UNITS[symbol];
        }

        for (const [prefix, factor] of PREFIXES) {
            if (!symbol.startsWith(prefix)) continue;

            const base = symbol.slice(prefix.length);

            // The kilogram is the SI base unit for mass.
            // Prefixes for mass are applied to gram.
            if (base === "g" && prefix !== "k") {
                return {
                    symbol,
                    name: prefix + "gram",
                    factor: factor * 1e-3,
                    dim: M,
                    prefixed: true
                };
            }

            if (base === "kg") continue;

            if (Object.prototype.hasOwnProperty.call(UNITS, base)) {
                const unit = UNITS[base];

                // Do not prefix dimensionless symbols or units
                // that are not permitted to take SI prefixes.
                if (["kg", "min", "h", "L", "bar"].includes(base)) {
                    continue;
                }

                return {
                    symbol,
                    name: prefix + unit.name,
                    factor: factor * unit.factor,
                    dim: unit.dim,
                    prefixed: true
                };
            }
        }

        return null;
    }

    // ---------- Dynamic database ----------

    function emptyDatabase() {
        return {
            version: 1,
            units: {},
            expressions: {},
            symbols: {},
            history: []
        };
    }

    function loadDatabase() {
        try {
            if (typeof localStorage === "undefined") {
                return emptyDatabase();
            }

            const raw = localStorage.getItem(DB_KEY);
            if (!raw) return emptyDatabase();

            const data = JSON.parse(raw);

            return {
                ...emptyDatabase(),
                ...data
            };
        } catch {
            return emptyDatabase();
        }
    }

    let database = loadDatabase();

    function persist() {
        try {
            if (typeof localStorage !== "undefined") {
                localStorage.setItem(DB_KEY, JSON.stringify(database));
            }
        } catch (error) {
            console.warn("Scientific DB persistence failed:", error);
        }
    }

    function registerUnit(symbol, definition) {
        if (!symbol || typeof symbol !== "string") {
            throw new Error("Unit symbol must be a string.");
        }

        if (!definition || !Array.isArray(definition.dim) ||
            definition.dim.length !== 7) {
            throw new Error("A unit requires seven SI dimension exponents.");
        }

        if (!Number.isFinite(definition.factor) ||
            definition.factor <= 0) {
            throw new Error("Unit factor must be positive and finite.");
        }

        const unit = {
            symbol,
            name: definition.name || symbol,
            factor: definition.factor,
            dim: definition.dim.map(Number),
            custom: true,
            source: definition.source || "user"
        };

        database.units[symbol] = unit;
        persist();

        return unit;
    }

    function registerSymbol(name, value, metadata = {}) {
        if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test(name)) {
            throw new Error("Invalid symbol name.");
        }

        database.symbols[name] = {
            name,
            value,
            ...metadata
        };

        persist();
        return database.symbols[name];
    }

    function saveExpression(result) {
        const id = "expr_" + hashString(result.original);

        const entry = {
            id,
            createdAt: new Date().toISOString(),
            ...result
        };

        database.expressions[id] = entry;
        database.history.unshift(id);
        database.history = [...new Set(database.history)].slice(0, 5000);

        // Register newly encountered units only as references.
        // Unknown units are not automatically declared to be valid SI units.
        for (const symbol of result.components.units) {
            if (getUnit(symbol) && !database.units[symbol]) {
                database.units[symbol] = {
                    symbol,
                    name: getUnit(symbol).name,
                    factor: getUnit(symbol).factor,
                    dim: getUnit(symbol).dim,
                    source: "SI catalog"
                };
            }
        }

        persist();
        return entry;
    }

    function hashString(text) {
        let hash = 2166136261;

        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }

        return (hash >>> 0).toString(16);
    }

    // ---------- Input normalization ----------

    function normalizeLatex(input) {
        let s = String(input).trim();

        const greek = {
            "\\alpha": "alpha",
            "\\beta": "beta",
            "\\gamma": "gamma",
            "\\delta": "delta",
            "\\epsilon": "epsilon",
            "\\theta": "theta",
            "\\lambda": "lambda",
            "\\mu": "mu",
            "\\pi": "pi",
            "\\rho": "rho",
            "\\sigma": "sigma",
            "\\tau": "tau",
            "\\phi": "phi",
            "\\omega": "omega",
            "\\Omega": "Omega",
            "\\Delta": "Delta",
            "\\Gamma": "Gamma",
            "\\Lambda": "Lambda",
            "\\Sigma": "Sigma",
            "\\Phi": "Phi"
        };

        for (const [latex, replacement] of Object.entries(greek)) {
            s = s.split(latex).join(replacement);
        }

        s = s
            .replace(/\\cdot\b/g, "*")
            .replace(/\\times\b/g, "*")
            .replace(/\\div\b/g, "/")
            .replace(/\\pi\b/g, "pi")
            .replace(/\\left\b/g, "")
            .replace(/\\right\b/g, "")
            .replace(/\\,/g, " ")
            .replace(/\\;/g, " ")
            .replace(/\\!/g, "")
            .replace(/\\quad\b/g, " ")
            .replace(/\\qquad\b/g, " ")
            .replace(/[×·⋅]/g, "*")
            .replace(/[÷]/g, "/")
            .replace(/[−–]/g, "-")
            .replace(/∞/g, "infinity")
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
            .replace(/⁻¹/g, "^-1")
            .replace(/√/g, "sqrt");

        // Convert common LaTeX fractions:
        // \frac{a}{b} -> ((a)/(b))
        for (let iteration = 0; iteration < 20; iteration++) {
            const next = s.replace(
                /\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
                "(($1)/($2))"
            );

            if (next === s) break;
            s = next;
        }

        s = s
            .replace(/\\sqrt\s*\{([^{}]*)\}/g, "sqrt($1)")
            .replace(/\\sin\b/g, "sin")
            .replace(/\\cos\b/g, "cos")
            .replace(/\\tan\b/g, "tan")
            .replace(/\\ln\b/g, "ln")
            .replace(/\\log\b/g, "log")
            .replace(/\\exp\b/g, "exp")
            .replace(/[{}]/g, match => match === "{" ? "(" : ")")
            .replace(/\s+/g, " ");

        // Normalize common scientific notation.
        return s.trim();
    }

    // ---------- Tokenizer ----------

    function tokenize(source) {
        const tokens = [];
        let i = 0;

        while (i < source.length) {
            const ch = source[i];

            if (/\s/.test(ch)) {
                i++;
                continue;
            }

            const number = source.slice(i).match(
                /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/
            );

            if (number) {
                tokens.push({
                    type: "number",
                    value: Number(number[0]),
                    raw: number[0]
                });

                i += number[0].length;
                continue;
            }

            const identifier = source.slice(i).match(
                /^[\p{L}_][\p{L}\p{N}_]*/u
            );

            if (identifier) {
                tokens.push({
                    type: "identifier",
                    value: identifier[0],
                    raw: identifier[0]
                });

                i += identifier[0].length;
                continue;
            }

            if ("+-*/^()=,".includes(ch)) {
                tokens.push({
                    type: ch,
                    value: ch,
                    raw: ch
                });

                i++;
                continue;
            }

            throw new Error(
                "Unsupported character: " + ch + " at position " + i
            );
        }

        tokens.push({ type: "EOF", value: null });
        return tokens;
    }

    // ---------- Parser / AST ----------

    function parse(source) {
        const tokens = tokenize(source);
        let pos = 0;

        const peek = () => tokens[pos];
        const take = () => tokens[pos++];

        function expect(type) {
            if (peek().type !== type) {
                throw new Error(
                    "Expected '" + type + "', found '" +
                    peek().raw + "'."
                );
            }

            return take();
        }

        function startsPrimary(token) {
            return token.type === "number" ||
                token.type === "identifier" ||
                token.type === "(";
        }

        function expression() {
            let node = term();

            while (peek().type === "+" || peek().type === "-") {
                const op = take().type;
                node = {
                    type: "binary",
                    op,
                    left: node,
                    right: term()
                };
            }

            return node;
        }

        function term() {
            let node = unary();

            while (true) {
                if (peek().type === "*" || peek().type === "/") {
                    const op = take().type;

                    node = {
                        type: "binary",
                        op,
                        left: node,
                        right: unary()
                    };

                    continue;
                }

                // Implicit multiplication:
                // 2x, 2(x+1), m/s^2, 3 sin(x)
                if (startsPrimary(peek())) {
                    node = {
                        type: "binary",
                        op: "*",
                        left: node,
                        right: unary()
                    };

                    continue;
                }

                break;
            }

            return node;
        }

        function unary() {
            if (peek().type === "+" || peek().type === "-") {
                const op = take().type;

                return {
                    type: "unary",
                    op,
                    value: unary()
                };
            }

            return power();
        }

        function power() {
            let node = primary();

            if (peek().type === "^") {
                take();

                node = {
                    type: "binary",
                    op: "^",
                    left: node,
                    right: unary()
                };
            }

            return node;
        }

        function primary() {
            const token = peek();

            if (token.type === "number") {
                take();
                return {
                    type: "number",
                    value: token.value
                };
            }

            if (token.type === "identifier") {
                take();

                if (peek().type === "(") {
                    take();

                    const args = [];

                    if (peek().type !== ")") {
                        args.push(expression());

                        while (peek().type === ",") {
                            take();
                            args.push(expression());
                        }
                    }

                    expect(")");

                    return {
                        type: "call",
                        name: token.value,
                        args
                    };
                }

                return {
                    type: "identifier",
                    name: token.value
                };
            }

            if (token.type === "(") {
                take();

                const node = expression();
                expect(")");

                return node;
            }

            throw new Error(
                "Unexpected token: " + String(token.raw || token.type)
            );
        }

        const left = expression();

        if (peek().type === "=") {
            take();

            const right = expression();

            if (peek().type !== "EOF") {
                throw new Error("Unexpected content after equation.");
            }

            return {
                type: "equation",
                left,
                right
            };
        }

        if (peek().type !== "EOF") {
            throw new Error("Unexpected token: " + peek().raw);
        }

        return left;
    }

    // ---------- Evaluation and dimensional analysis ----------

    function quantity(value, dim = ZERO_DIM(), known = true) {
        return { value, dim, known };
    }

    function combineKnown(a, b) {
        return a.known && b.known;
    }

    function resolveIdentifier(name, variables) {
        if (Object.prototype.hasOwnProperty.call(variables, name)) {
            const item = variables[name];

            if (typeof item === "number") {
                return quantity(item);
            }

            if (item && typeof item.value === "number") {
                return quantity(
                    item.value,
                    item.dim || ZERO_DIM(),
                    true
                );
            }
        }

        if (Object.prototype.hasOwnProperty.call(database.symbols, name)) {
            const symbol = database.symbols[name];

            if (typeof symbol.value === "number") {
                return quantity(symbol.value);
            }
        }

        const unit = getUnit(name);

        if (unit) {
            return quantity(1 * unit.factor, unit.dim);
        }

        const constants = {
            pi: Math.PI,
            e: Math.E,
            c: 299792458,
            g0: 9.80665,
            infinity: Infinity
        };

        if (Object.prototype.hasOwnProperty.call(constants, name)) {
            if (name === "c") {
                return quantity(constants[name], [1, 0, -1, 0, 0, 0, 0]);
            }

            if (name === "g0") {
                return quantity(constants[name], [1, 0, -2, 0, 0, 0, 0]);
            }

            return quantity(constants[name]);
        }

        return quantity(null, ZERO_DIM(), false);
    }

    function evaluateAst(node, variables = {}) {
        switch (node.type) {
            case "number":
                return quantity(node.value);

            case "identifier":
                return resolveIdentifier(node.name, variables);

            case "unary": {
                const a = evaluateAst(node.value, variables);

                if (!a.known) return a;

                return quantity(
                    node.op === "-" ? -a.value : a.value,
                    a.dim
                );
            }

            case "binary": {
                const a = evaluateAst(node.left, variables);
                const b = evaluateAst(node.right, variables);

                if (!a.known || !b.known) {
                    return quantity(null, ZERO_DIM(), false);
                }

                switch (node.op) {
                    case "+":
                    case "-":
                        if (!dimEqual(a.dim, b.dim)) {
                            throw new Error(
                                "Dimension mismatch in addition/subtraction."
                            );
                        }

                        return quantity(
                            node.op === "+" ?
                                a.value + b.value :
                                a.value - b.value,
                            a.dim
                        );

                    case "*":
                        return quantity(
                            a.value * b.value,
                            dimAdd(a.dim, b.dim)
                        );

                    case "/":
                        if (b.value === 0) {
                            throw new Error("Division by zero.");
                        }

                        return quantity(
                            a.value / b.value,
                            dimSub(a.dim, b.dim)
                        );

                    case "^":
                        if (!dimIsZero(b.dim)) {
                            throw new Error(
                                "Exponent must be dimensionless."
                            );
                        }

                        if (!dimIsZero(a.dim) &&
                            !Number.isInteger(b.value)) {
                            throw new Error(
                                "A dimensioned quantity requires an integer exponent."
                            );
                        }

                        return quantity(
                            Math.pow(a.value, b.value),
                            dimScale(a.dim, b.value)
                        );
                }

                throw new Error("Unknown operator: " + node.op);
            }

            case "call": {
                if (node.args.length !== 1) {
                    throw new Error(
                        node.name + "() requires exactly one argument."
                    );
                }

                const a = evaluateAst(node.args[0], variables);

                if (!a.known) {
                    return quantity(null, ZERO_DIM(), false);
                }

                const functions = {
                    sin: Math.sin,
                    cos: Math.cos,
                    tan: Math.tan,
                    asin: Math.asin,
                    acos: Math.acos,
                    atan: Math.atan,
                    exp: Math.exp,
                    ln: Math.log,
                    log: Math.log10,
                    sqrt: Math.sqrt,
                    abs: Math.abs,
                    floor: Math.floor,
                    ceil: Math.ceil
                };

                if (!Object.prototype.hasOwnProperty.call(
                    functions, node.name
                )) {
                    throw new Error(
                        "Unsupported function: " + node.name
                    );
                }

                if (["sin", "cos", "tan", "asin", "acos",
                     "atan", "exp", "ln", "log"].includes(node.name)) {
                    if (!dimIsZero(a.dim)) {
                        throw new Error(
                            node.name +
                            "() requires a dimensionless argument."
                        );
                    }

                    return quantity(functions[node.name](a.value));
                }

                if (node.name === "sqrt") {
                    if (a.dim.some(v => v % 2 !== 0)) {
                        throw new Error(
                            "sqrt() requires even dimension exponents."
                        );
                    }

                    return quantity(
                        Math.sqrt(a.value),
                        dimScale(a.dim, 0.5)
                    );
                }

                return quantity(
                    functions[node.name](a.value),
                    a.dim
                );
            }

            case "equation": {
                const left = evaluateAst(node.left, variables);
                const right = evaluateAst(node.right, variables);

                if (left.known && right.known &&
                    !dimEqual(left.dim, right.dim)) {
                    throw new Error(
                        "Equation is dimensionally inconsistent."
                    );
                }

                return {
                    equation: true,
                    left,
                    right,
                    known: left.known && right.known,
                    consistent: left.known && right.known
                        ? dimEqual(left.dim, right.dim)
                        : null
                };
            }

            default:
                throw new Error("Unknown AST node: " + node.type);
        }
    }

    function collectComponents(node, result = {
        functions: [],
        units: [],
        variables: [],
        operators: [],
        constants: []
    }) {
        if (!node) return result;

        if (node.type === "identifier") {
            const name = node.name;
            const unit = getUnit(name);

            if (unit) {
                result.units.push(name);
            } else if (["pi", "e", "c", "g0", "infinity"].includes(name)) {
                result.constants.push(name);
            } else {
                result.variables.push(name);
            }
        }

        if (node.type === "binary") {
            result.operators.push(node.op);
            collectComponents(node.left, result);
            collectComponents(node.right, result);
        }

        if (node.type === "unary") {
            result.operators.push(node.op);
            collectComponents(node.value, result);
        }

        if (node.type === "call") {
            result.functions.push(node.name);
            node.args.forEach(arg => collectComponents(arg, result));
        }

        if (node.type === "equation") {
            result.operators.push("=");
            collectComponents(node.left, result);
            collectComponents(node.right, result);
        }

        for (const key of Object.keys(result)) {
            result[key] = [...new Set(result[key])];
        }

        return result;
    }

    // ---------- Public API ----------

    function interpret(input, variables = {}) {
        const original = String(input).trim();

        if (!original) {
            throw new Error("Expression cannot be empty.");
        }

        if (original.length > 2000) {
            throw new Error("Expression is too long.");
        }

        const normalized = normalizeLatex(original);
        const ast = parse(normalized);
        const components = collectComponents(ast);

        let evaluated;
        let error = null;

        try {
            evaluated = evaluateAst(ast, variables);
        } catch (e) {
            error = e.message;
        }

        let result;

        if (error) {
            result = {
                original,
                normalized,
                ast,
                components,
                status: "recognized_invalid",
                value: null,
                dimensions: null,
                validation: {
                    syntax: "valid",
                    dimensional: "invalid",
                    error
                }
            };
        } else if (evaluated && evaluated.equation) {
            const consistent = evaluated.consistent;

            result = {
                original,
                normalized,
                ast,
                components,
                status: !evaluated.known
                    ? "symbolic"
                    : consistent
                        ? "calculated"
                        : "dimensionally_invalid",
                value: evaluated.known
                    ? {
                        left: evaluated.left.value,
                        right: evaluated.right.value
                    }
                    : null,
                dimensions: evaluated.known
                    ? dimensionObject(evaluated.left.dim)
                    : null,
                validation: {
                    syntax: "valid",
                    dimensional: consistent === null
                        ? "undetermined"
                        : consistent
                            ? "valid"
                            : "invalid"
                }
            };
        } else {
            const known = evaluated && evaluated.known;
            const dim = evaluated ? evaluated.dim : ZERO_DIM();

            result = {
                original,
                normalized,
                ast,
                components,
                status: !known
                    ? "symbolic"
                    : "calculated",
                value: known ? evaluated.value : null,
                dimensions: known ? dimensionObject(dim) : null,
                validation: {
                    syntax: "valid",
                    dimensional: known ? "valid" : "undetermined"
                }
            };
        }

        return saveExpression(result);
    }

    function listExpressions() {
        return database.history
            .map(id => database.expressions[id])
            .filter(Boolean);
    }

    function searchExpressions(query) {
        const q = String(query).toLowerCase();

        return listExpressions().filter(entry =>
            entry.original.toLowerCase().includes(q) ||
            entry.normalized.toLowerCase().includes(q)
        );
    }

    function exportJSON() {
        return JSON.stringify(database, null, 2);
    }

    function importJSON(json) {
        const incoming = JSON.parse(json);

        if (!incoming || typeof incoming !== "object") {
            throw new Error("Invalid database.");
        }

        database = {
            ...emptyDatabase(),
            ...incoming
        };

        persist();
        return true;
    }

    function getDatabase() {
        return JSON.parse(JSON.stringify(database));
    }

    function clearDatabase() {
        database = emptyDatabase();
        persist();
    }

    return {
        interpret,
        getUnit,
        registerUnit,
        registerSymbol,
        listExpressions,
        searchExpressions,
        exportJSON,
        importJSON,
        getDatabase,
        clearDatabase,
        normalizeLatex
    };
})();

// CommonJS support for Node.js.
if (typeof module !== "undefined" && module.exports) {
    module.exports = ScientificDistiller;
                }
