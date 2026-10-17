const symbol = (name) => ({ kind: "symbol", name });
const isSymbol = (value, name) => value?.kind === "symbol" && (name === undefined || value.name === name);

export function tokenize(source) {
  const tokens = [];
  const pattern = /\s+|;[^\n]*|[()]|'|"(?:\\.|[^"\\])*"|[^\s()';]+/gy;
  let position = 0;
  while (position < source.length) {
    pattern.lastIndex = position;
    const match = pattern.exec(source);
    if (!match) throw new SyntaxError(`Unexpected character at position ${position + 1}`);
    if (!/^\s|^;/.test(match[0])) tokens.push(match[0]);
    position = pattern.lastIndex;
  }
  return tokens;
}

export function parse(source) {
  const tokens = tokenize(source);
  let index = 0;
  function expression() {
    const token = tokens[index++];
    if (token === undefined) throw new SyntaxError("Unexpected end of expression");
    if (token === "(") {
      const list = [];
      while (tokens[index] !== ")") {
        if (index >= tokens.length) throw new SyntaxError("Missing closing parenthesis");
        list.push(expression());
      }
      index++;
      return list;
    }
    if (token === ")") throw new SyntaxError("Unexpected closing parenthesis");
    if (token === "'") return [symbol("quote"), expression()];
    if (token.startsWith('"')) return JSON.parse(token);
    if (token === "#t") return true;
    if (token === "#f") return false;
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return Number(token);
    return symbol(token);
  }
  const program = [];
  while (index < tokens.length) program.push(expression());
  return program;
}

class Environment {
  constructor(parent = null) { this.parent = parent; this.values = new Map(); }
  get(name) {
    if (this.values.has(name)) return this.values.get(name);
    if (this.parent) return this.parent.get(name);
    throw new ReferenceError(`Unknown name: ${name}`);
  }
  set(name, value) { this.values.set(name, value); return value; }
}

function numeric(args, minimum = 1) {
  if (args.length < minimum || args.some((value) => typeof value !== "number" || !Number.isFinite(value))) throw new TypeError("Expected numbers");
  return args;
}
function baseEnvironment() {
  const env = new Environment();
  const builtins = {
    "+": (...args) => numeric(args, 0).reduce((a, b) => a + b, 0),
    "-": (...args) => { numeric(args); return args.length === 1 ? -args[0] : args.slice(1).reduce((a, b) => a - b, args[0]); },
    "*": (...args) => numeric(args, 0).reduce((a, b) => a * b, 1),
    "/": (...args) => { numeric(args, 2); if (args.slice(1).includes(0)) throw new RangeError("Division by zero"); return args.slice(1).reduce((a, b) => a / b, args[0]); },
    "=": (a, b) => a === b,
    "<": (a, b) => a < b,
    ">": (a, b) => a > b,
    "list": (...args) => args,
    "first": (list) => { if (!Array.isArray(list)) throw new TypeError("Expected a list"); return list[0] ?? null; },
    "rest": (list) => { if (!Array.isArray(list)) throw new TypeError("Expected a list"); return list.slice(1); },
    "cons": (value, list) => { if (!Array.isArray(list)) throw new TypeError("Expected a list"); return [value, ...list]; },
    "length": (list) => { if (!Array.isArray(list)) throw new TypeError("Expected a list"); return list.length; },
  };
  for (const [name, fn] of Object.entries(builtins)) env.set(name, fn);
  return env;
}

export class Interpreter {
  constructor() { this.env = baseEnvironment(); }
  run(source) {
    const expressions = parse(source);
    if (!expressions.length) return null;
    const budget = { steps: 0 };
    let result = null;
    for (const expression of expressions) result = this.evaluate(expression, this.env, budget, 0);
    return result;
  }
  evaluate(node, env, budget, depth) {
    if (++budget.steps > 10000 || depth > 200) throw new RangeError("Evaluation limit reached");
    if (isSymbol(node)) return env.get(node.name);
    if (!Array.isArray(node)) return node;
    if (!node.length) return [];
    const [head, ...tail] = node;
    if (isSymbol(head, "quote")) { if (tail.length !== 1) throw new SyntaxError("quote takes one value"); return tail[0]; }
    if (isSymbol(head, "define")) {
      if (tail.length !== 2 || !isSymbol(tail[0])) throw new SyntaxError("Use (define name value)");
      return env.set(tail[0].name, this.evaluate(tail[1], env, budget, depth + 1));
    }
    if (isSymbol(head, "if")) {
      if (tail.length !== 3) throw new SyntaxError("Use (if condition yes no)");
      const branch = this.evaluate(tail[0], env, budget, depth + 1) ? tail[1] : tail[2];
      return this.evaluate(branch, env, budget, depth + 1);
    }
    if (isSymbol(head, "begin")) {
      let result = null;
      for (const part of tail) result = this.evaluate(part, env, budget, depth + 1);
      return result;
    }
    if (isSymbol(head, "lambda")) {
      if (tail.length !== 2 || !Array.isArray(tail[0]) || tail[0].some((arg) => !isSymbol(arg))) throw new SyntaxError("Use (lambda (args) body)");
      const [parameters, body] = tail;
      return { kind: "lambda", parameters, body, closure: env };
    }
    const fn = this.evaluate(head, env, budget, depth + 1);
    const args = tail.map((part) => this.evaluate(part, env, budget, depth + 1));
    if (fn?.kind === "lambda") {
      if (args.length !== fn.parameters.length) throw new TypeError(`Expected ${fn.parameters.length} arguments`);
      const scope = new Environment(fn.closure);
      fn.parameters.forEach((parameter, index) => scope.set(parameter.name, args[index]));
      return this.evaluate(fn.body, scope, budget, depth + 1);
    }
    if (typeof fn !== "function") throw new TypeError("First item is not a function");
    return fn(...args);
  }
}

export function display(value) {
  if (isSymbol(value)) return value.name;
  if (value?.kind === "lambda") return "<function>";
  if (Array.isArray(value)) return `(${value.map(display).join(" ")})`;
  if (value === true) return "#t";
  if (value === false) return "#f";
  if (value === null) return "nil";
  if (typeof value === "function") return "<function>";
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}
