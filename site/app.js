import { Interpreter, display } from "./lisp.js";
let interpreter = new Interpreter();
const form = document.querySelector("#prompt-form");
const source = document.querySelector("#source");
const transcript = document.querySelector("#transcript");
function addLine(kind, text) {
  const li = document.createElement("li");
  li.className = kind;
  li.textContent = text;
  transcript.append(li);
  transcript.scrollTop = transcript.scrollHeight;
}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const code = source.value.trim();
  if (!code) return;
  addLine("input", `> ${code}`);
  try { addLine("output", display(interpreter.run(code))); }
  catch (error) { addLine("error", `${error.name}: ${error.message}`); }
  source.focus();
});
source.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
});
document.querySelector("#reset").addEventListener("click", () => {
  interpreter = new Interpreter();
  transcript.replaceChildren();
  addLine("hint", "Session reset. Names you defined are gone.");
  source.focus();
});
document.querySelectorAll("[data-example]").forEach((button) => button.addEventListener("click", () => {
  source.value = button.dataset.example.replaceAll("\\n", "\n");
  source.focus();
}));
