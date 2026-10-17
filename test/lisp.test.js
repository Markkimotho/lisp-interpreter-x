import test from "node:test";
import assert from "node:assert/strict";
import { Interpreter, parse, display } from "../site/lisp.js";
test("parses nested expressions and rejects imbalance", () => {
  assert.equal(parse("(+ 1 (* 2 3))").length, 1);
  assert.throws(() => parse("(+ 1 2"), /Missing closing/);
});
test("evaluates arithmetic and lexical functions", () => {
  const lisp = new Interpreter();
  assert.equal(lisp.run("(+ 1 (* 2 3))"), 7);
  assert.equal(lisp.run("(define twice (lambda (x) (* 2 x))) (twice 9)"), 18);
  assert.equal(lisp.run("(if (> 3 2) 1 0)"), 1);
  assert.equal(display(lisp.run("(rest (list 1 2 3))")), "(2 3)");
});
test("rejects division by zero", () => assert.throws(() => new Interpreter().run("(/ 1 0)"), /Division by zero/));
