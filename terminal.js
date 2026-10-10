(function () {
  "use strict";
  const terminal = document.querySelector("[data-terminal]");
  if (!terminal || !window.KnightTerminal) return;
  const form = terminal.querySelector("form");
  const input = terminal.querySelector("textarea");
  const buffer = terminal.querySelector("[data-terminal-buffer]");
  const log = terminal.querySelector("[data-terminal-log]");
  const prompt = terminal.querySelector("[data-terminal-prompt]");
  const mirror = terminal.querySelector("[data-terminal-mirror]");
  const shell = window.KnightTerminal.createShell();
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  let historyIndex = 0, draft = "", composing = false;

  function revealInput() { buffer.scrollTop = buffer.scrollHeight; }
  function write(text, className) {
    const line = document.createElement("pre");
    line.className = "terminal-line" + (className ? " " + className : "");
    line.textContent = text;
    log.append(line);
    while (log.children.length > 240) log.firstElementChild.remove();
  }
  function updatePrompt() { prompt.textContent = "knight:" + shell.promptPath + " $"; }
  function renderInput() {
    const value = input.value;
    const start = input.selectionStart, end = input.selectionEnd;
    const caret = document.createElement("span");
    caret.className = start === end ? "terminal-caret" : "terminal-selection";
    const tail = value.slice(start);
    const character = tail ? (segmenter ? segmenter.segment(tail)[Symbol.iterator]().next().value.segment : Array.from(tail)[0]) : " ";
    const length = start === end ? (tail ? character.length : 0) : end - start;
    caret.textContent = start === end ? character : value.slice(start, end);
    mirror.replaceChildren(document.createTextNode(value.slice(0, start)), caret, document.createTextNode(value.slice(start + length)));
  }
  function clearScreen() { log.replaceChildren(); revealInput(); }
  function setInput(value, cursor = value.length) {
    input.value = value;
    input.setSelectionRange(cursor, cursor);
    renderInput();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (composing) return;
    const line = input.value;
    const oldPrompt = prompt.textContent;
    const result = shell.execute(line);
    if (result.clear) clearScreen();
    else {
      write(oldPrompt + (line ? " " + line : ""), "terminal-command");
      if (result.output) write(result.output.replace(/\n$/, ""), result.error ? "terminal-error" : "");
    }
    if (result.font) {
      terminal.dataset.font = result.font;
      terminal.dataset.style = result.fontStyle;
      terminal.dataset.weight = result.fontWeight === 700 ? "bold" : "normal";
    }
    setInput("");
    historyIndex = shell.history.length;
    draft = "";
    updatePrompt();
    revealInput();
  });

  input.addEventListener("input", () => {
    if (!composing && /[\r\n]/.test(input.value)) {
      const start = input.value.slice(0, input.selectionStart).replace(/[\r\n]+/g, " ").length;
      const end = input.value.slice(0, input.selectionEnd).replace(/[\r\n]+/g, " ").length;
      input.value = input.value.replace(/[\r\n]+/g, " ");
      input.setSelectionRange(start, end);
    }
    renderInput();
    revealInput();
  });
  input.addEventListener("compositionstart", () => { composing = true; });
  input.addEventListener("compositionend", () => { composing = false; renderInput(); revealInput(); });
  document.addEventListener("selectionchange", () => { if (document.activeElement === input) renderInput(); });
  for (const event of ["focus", "blur", "select", "keyup", "click"]) input.addEventListener(event, renderInput);
  input.addEventListener("keydown", (event) => {
    if (composing || event.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter") {
      event.preventDefault();
      form.requestSubmit();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
      event.preventDefault();
      clearScreen();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const history = shell.history;
      if (!history.length) return;
      event.preventDefault();
      if (historyIndex === history.length) draft = input.value;
      historyIndex = Math.min(history.length, Math.max(0, historyIndex + (event.key === "ArrowUp" ? -1 : 1)));
      setInput(historyIndex === history.length ? draft : history[historyIndex]);
      revealInput();
    } else if (event.key === "Tab" && !event.shiftKey && input.selectionStart === input.selectionEnd) {
      const completion = shell.complete(input.value, input.selectionStart);
      if (!completion.matches.length) return;
      event.preventDefault();
      setInput(completion.line, completion.cursor);
      if (completion.matches.length > 1) write(completion.matches.join("  "), "terminal-muted");
      revealInput();
    }
  });

  buffer.addEventListener("click", (event) => {
    if (event.target !== buffer && event.target !== log) return;
    if (!window.getSelection().toString()) input.focus({ preventScroll: true });
  });
  window.addEventListener("resize", () => { if (document.activeElement === input) revealInput(); });
  document.fonts.addEventListener("loadingdone", () => { if (document.activeElement === input) revealInput(); });
  updatePrompt();
  renderInput();
  input.disabled = false;
  terminal.dataset.ready = "true";
})();
