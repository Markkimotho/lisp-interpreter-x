# lisp-interpreter-x

A tiny Lisp interpreter you can run in a browser. It supports arithmetic, comparisons, `define`, `lambda`, `if`, `begin`, lists, strings, and booleans. It is a learning project, not a full Scheme implementation. Evaluation has a step limit so accidental recursion cannot lock the page indefinitely.

Open `site/index.html` locally or serve `site/` over HTTP. Run `npm test` to check parsing and evaluation. GitHub Actions tests before publishing the static app to Pages.
