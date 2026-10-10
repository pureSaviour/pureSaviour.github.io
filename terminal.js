(function () {
  "use strict";
  const terminal = document.querySelector("[data-terminal]");
  if (!terminal || !window.KnightTerminal) return;
  const form = terminal.querySelector("form");
  const input = terminal.querySelector("input");
  const log = terminal.querySelector("[data-terminal-log]");
  const path = terminal.querySelector("[data-terminal-path]");
  const prompt = terminal.querySelector("[data-terminal-prompt]");
  const hint = terminal.querySelector("[data-terminal-hint]");
  const shell = window.KnightTerminal.createShell();
  let historyIndex = 0, draft = "", composing = false;

  function write(text, className) {
    const line = document.createElement("pre");
    line.className = "terminal-line" + (className ? " " + className : "");
    // 所有输入与输出按文本呈现，不解析 HTML，也不执行输入的代码。
    line.textContent = text;
    log.append(line);
    while (log.children.length > 120) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
  }
  function updatePrompt() {
    path.textContent = shell.cwd;
    prompt.textContent = "knight:" + shell.promptPath + " $";
  }
  function clearScreen() { log.replaceChildren(); }
  function setInput(value, cursor = value.length) {
    input.value = value;
    input.setSelectionRange(cursor, cursor);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (composing) return;
    const line = input.value;
    if (!line.trim()) { setInput(""); return; }
    const oldPrompt = prompt.textContent;
    const result = shell.execute(line);
    if (result.clear) clearScreen();
    else {
      write(oldPrompt + " " + line, "terminal-command");
      if (result.output) write(result.output.replace(/\n$/, ""), result.error ? "terminal-error" : "");
    }
    setInput("");
    historyIndex = shell.history.length;
    draft = "";
    updatePrompt();
  });

  input.addEventListener("compositionstart", () => { composing = true; });
  input.addEventListener("compositionend", () => { composing = false; });
  input.addEventListener("keydown", (event) => {
    if (composing || event.isComposing || event.keyCode === 229) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
      event.preventDefault();
      clearScreen();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const history = shell.history;
      if (!history.length) return;
      event.preventDefault();
      if (historyIndex === history.length) draft = input.value;
      historyIndex = Math.min(history.length, Math.max(0, historyIndex + (event.key === "ArrowUp" ? -1 : 1)));
      setInput(historyIndex === history.length ? draft : history[historyIndex]);
    } else if (event.key === "Tab" && !event.shiftKey && input.selectionStart === input.selectionEnd) {
      const completion = shell.complete(input.value, input.selectionStart);
      if (!completion.matches.length) return;
      event.preventDefault();
      setInput(completion.line, completion.cursor);
      if (completion.matches.length > 1) write(completion.matches.join("  "), "terminal-muted");
    }
  });

  updatePrompt();
  write("欢迎来到 Knight 的模拟终端。\n输入 help 查看命令，试试 ls 或 cat about.txt。", "terminal-muted");
  hint.textContent = "Enter 执行 · ↑↓ 历史 · Tab 补全 · Ctrl + L 清屏";
  input.disabled = false;
  terminal.dataset.ready = "true";
})();
