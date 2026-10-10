(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KnightTerminal = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const HOME = "/home/knight";
  const COMMANDS = ["help", "ls", "dir", "tree", "pwd", "cd", "cat", "echo", "whoami", "date", "clear", "history", "font"];
  const FONTS = Object.freeze({ jetbrains: "JetBrains Mono", maple: "Maple Mono", system: "System monospace" });
  const HELP = {
    help: "help [command]         List commands or show command usage",
    ls: "ls [-a] [-l] [path]     List entries; -a includes . and ..; -l shows permissions",
    dir: "dir [-a] [-l] [path]    Alias for ls",
    tree: "tree [directory]       Show the directory tree",
    pwd: "pwd                    Print the working directory",
    cd: "cd [directory]         Change directory; no argument goes home; - goes back",
    cat: "cat <file> [...]       Print text files",
    echo: "echo [-n] [text...]     Print text; quotes and backslash escapes are supported",
    whoami: "whoami                 Print the current user",
    date: "date                   Print the local date and time",
    clear: "clear                  Clear the screen; keep command history",
    history: "history                List this session's last 100 commands",
    font: "font [name]            Show or set font: jetbrains, maple, system"
  };

  // 仅是个人主页的虚拟内容，与服务器或访客设备的文件无关。
  const FILES = Object.freeze({
    "/": null,
    "/home": null,
    "/home/knight": null,
    "/home/knight/about.txt": "Knight\nLearning, building, and staying curious.\n",
    "/home/knight/links.txt": "GitHub  https://github.com/pureSaviour\nHome    https://puresaviour.github.io/\n"
  });

  function tokenize(line, partial = false) {
    const tokens = [];
    let value = "", start = -1, quote = null, escaped = false;
    const finish = (end) => {
      if (start !== -1) tokens.push({ value, start, end });
      value = "";
      start = -1;
    };
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (start === -1 && /\s/.test(char)) continue;
      if (start === -1) start = i;
      if (escaped) { value += char; escaped = false; continue; }
      if (char === "\\" && quote !== "'") { escaped = true; continue; }
      if (quote) {
        if (char === quote) quote = null;
        else value += char;
        continue;
      }
      if (char === "'" || char === '"') { quote = char; continue; }
      if (/\s/.test(char)) { finish(i); continue; }
      if (/[|;&<>`]/.test(char) || (char === "$" && line[i + 1] === "(")) {
        throw new Error("Pipes, redirection and scripts are not supported. Quote special characters to print them.");
      }
      value += char;
    }
    if (!partial && (quote || escaped)) throw new Error(quote ? "Unclosed quote." : "Missing character after backslash.");
    finish(line.length);
    return tokens;
  }

  function normalizePath(path, cwd) {
    if (path === "~" || path.startsWith("~/")) path = HOME + path.slice(1);
    const absolute = path.startsWith("/") ? path : cwd + "/" + path;
    const parts = [];
    for (const part of absolute.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") parts.pop();
      else parts.push(part);
    }
    return "/" + parts.join("/");
  }

  const exists = (path) => Object.hasOwn(FILES, path);
  const isDirectory = (path) => exists(path) && FILES[path] === null;
  function children(path) {
    const prefix = path === "/" ? "/" : path + "/";
    return Object.keys(FILES).filter((key) => key.startsWith(prefix) && key !== path && !key.slice(prefix.length).includes("/"))
      .map((key) => ({ name: key.slice(prefix.length), path: key, directory: isDirectory(key) }));
  }

  function createShell({ now = () => new Date() } = {}) {
    let cwd = HOME, previous = HOME, font = "jetbrains";
    const history = [];
    function requireDirectory(path) {
      if (!exists(path)) throw new Error("No such directory: " + path);
      if (!isDirectory(path)) throw new Error("Not a directory: " + path);
    }
    function noArguments(args) {
      if (args.length) throw new Error("This command takes no arguments.");
    }
    function execute(line) {
      if (!line.trim()) return { output: "" };
      if (line.length > 2048) return { output: "Command exceeds the 2048-character limit.", error: true };
      history.push(line);
      if (history.length > 100) history.shift();
      try {
        const [command, ...args] = tokenize(line).map((token) => token.value);
        if (!COMMANDS.includes(command)) throw new Error("Command not found: " + command);
        if (args.length === 1 && args[0] === "--help") return { output: HELP[command] };
        switch (command) {
          case "help": {
            if (args.length > 1) throw new Error("Usage: help [command]");
            if (args.length && !Object.hasOwn(HELP, args[0])) throw new Error("No help available for: " + args[0]);
            return { output: args.length ? HELP[args[0]] : Object.values(HELP).join("\n") + "\n\n~ = /home/knight. Virtual filesystem; no variable expansion or script execution." };
          }
          case "ls":
          case "dir": {
            let all = false, long = false;
            const paths = [];
            let options = true;
            for (const arg of args) {
              if (options && arg === "--") { options = false; continue; }
              if (options && arg.startsWith("-") && arg !== "-") {
                if (!/^-[al]+$/.test(arg)) throw new Error("Unsupported option: " + arg + ". Available options: -a, -l.");
                all ||= arg.includes("a");
                long ||= arg.includes("l");
              } else paths.push(arg);
            }
            if (paths.length > 1) throw new Error("Usage: " + command + " [-a] [-l] [path]");
            const path = normalizePath(paths[0] || ".", cwd);
            if (!exists(path)) throw new Error("No such file or directory: " + path);
            let entries = isDirectory(path) ? children(path) : [{ name: path.split("/").pop(), path, directory: false }];
            if (all && isDirectory(path)) entries = [{ name: ".", path, directory: true }, { name: "..", path: normalizePath("..", path), directory: true }, ...entries];
            return { output: long ? entries.map((entry) => (entry.directory ? "dr-xr-xr-x" : "-r--r--r--") + "  " + entry.name + (entry.directory ? "/" : "")).join("\n") : entries.map((entry) => entry.name + (entry.directory ? "/" : "")).join("  ") };
          }
          case "pwd": noArguments(args); return { output: cwd };
          case "cd": {
            if (args.length > 1) throw new Error("Usage: cd [directory]");
            const target = args[0] === "-" ? previous : normalizePath(args[0] || HOME, cwd);
            requireDirectory(target);
            previous = cwd;
            cwd = target;
            return { output: args[0] === "-" ? cwd : "" };
          }
          case "cat": {
            if (!args.length) throw new Error("Usage: cat <file> [...]");
            return { output: args.map((arg) => {
              const path = normalizePath(arg, cwd);
              if (!exists(path)) throw new Error("No such file: " + path);
              if (isDirectory(path)) throw new Error("Is a directory: " + path);
              return FILES[path];
            }).join("") };
          }
          case "tree": {
            if (args.length > 1) throw new Error("Usage: tree [directory]");
            const path = normalizePath(args[0] || ".", cwd);
            requireDirectory(path);
            const lines = [args[0] || "."];
            function walk(directory, indent) {
              const entries = children(directory);
              entries.forEach((entry, index) => {
                const last = index === entries.length - 1;
                lines.push(indent + (last ? "└── " : "├── ") + entry.name + (entry.directory ? "/" : ""));
                if (entry.directory) walk(entry.path, indent + (last ? "    " : "│   "));
              });
            }
            walk(path, "");
            return { output: lines.join("\n") };
          }
          case "echo": return { output: (args[0] === "-n" ? args.slice(1) : args).join(" ") };
          case "whoami": noArguments(args); return { output: "Knight" };
          case "date": noArguments(args); return { output: now().toLocaleString("en-GB", { hour12: false }) };
          case "font": {
            if (args.length > 1) throw new Error("Usage: font [jetbrains|maple|system]");
            if (args.length && !Object.hasOwn(FONTS, args[0])) throw new Error("Unknown font: " + args[0] + ". Available fonts: jetbrains, maple, system.");
            if (args.length) font = args[0];
            return { output: "Font: " + FONTS[font], font };
          }
          case "clear": noArguments(args); return { output: "", clear: true };
          case "history": noArguments(args); return { output: history.map((entry, index) => String(index + 1).padStart(3) + "  " + entry).join("\n") };
        }
      } catch (error) { return { output: error.message, error: true }; }
    }

    function complete(line, cursor = line.length) {
      const prefix = line.slice(0, cursor);
      let tokens;
      try { tokens = tokenize(prefix, true); } catch { return { line, cursor, matches: [] }; }
      if (!tokens.length || tokens[tokens.length - 1].end < prefix.length) tokens.push({ value: "", start: prefix.length, end: prefix.length });
      const token = tokens[tokens.length - 1];
      let replaceEnd = cursor;
      try {
        const fullToken = tokenize(line, true).find((item) => item.start === token.start);
        if (fullToken) replaceEnd = fullToken.end;
      } catch { /* 补全只取光标之前的有效输入。 */ }
      let matches = [];
      if (tokens.length === 1) matches = COMMANDS.filter((command) => command.startsWith(token.value));
      else if (tokens[0].value === "help") matches = COMMANDS.filter((command) => command.startsWith(token.value));
      else if (tokens[0].value === "font") matches = Object.keys(FONTS).filter((name) => name.startsWith(token.value));
      else if (["ls", "dir", "tree", "cd", "cat"].includes(tokens[0].value)) {
        const split = token.value.lastIndexOf("/") + 1;
        const base = token.value.slice(0, split);
        const name = token.value.slice(split);
        const directory = normalizePath(base || ".", cwd);
        if (isDirectory(directory)) matches = children(directory)
          .filter((entry) => entry.name.startsWith(name) && (!["cd", "tree"].includes(tokens[0].value) || entry.directory))
          .map((entry) => base + entry.name + (entry.directory ? "/" : ""));
      }
      if (!matches.length) return { line, cursor, matches };
      let replacement = matches[0];
      for (const match of matches.slice(1)) {
        let i = 0;
        while (i < replacement.length && replacement[i] === match[i]) i++;
        replacement = replacement.slice(0, i);
      }
      if (replacement.length < token.value.length) return { line, cursor, matches };
      const quoted = prefix[token.start] === '"' || prefix[token.start] === "'";
      if (quoted) replacement = prefix[token.start] + replacement + prefix[token.start];
      if (matches.length === 1 && !matches[0].endsWith("/") && !line.slice(replaceEnd).startsWith(" ")) replacement += " ";
      return { line: line.slice(0, token.start) + replacement + line.slice(replaceEnd), cursor: token.start + replacement.length, matches };
    }

    return { execute, complete, get cwd() { return cwd; }, get history() { return history.slice(); }, get promptPath() { return cwd === HOME ? "~" : cwd.startsWith(HOME + "/") ? "~" + cwd.slice(HOME.length) : cwd; } };
  }

  return { createShell };
});
