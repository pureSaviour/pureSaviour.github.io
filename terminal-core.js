(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KnightTerminal = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const HOME = "/home/knight";
  const COMMANDS = ["help", "ls", "dir", "tree", "pwd", "cd", "cat", "echo", "whoami", "date", "clear", "history"];
  const HELP = {
    help: "help                  查看命令说明；help <命令> 查看用法",
    ls: "ls [-a] [-l] [路径]    列出目录；-a 显示 . 和 ..，-l 显示简要信息",
    dir: "dir [-a] [-l] [路径]   ls 的别名",
    tree: "tree [目录]           查看目录树",
    pwd: "pwd                   显示当前目录",
    cd: "cd [目录]             切换目录；省略回到 ~，cd - 返回上一目录",
    cat: "cat <文件> [...]      读取文本文件",
    echo: "echo [-n] [文字...]    输出文字；支持单引号、双引号与反斜杠转义",
    whoami: "whoami                显示 Knight",
    date: "date                  显示浏览器当前日期时间",
    clear: "clear                 清空屏幕，保留本次历史",
    history: "history               查看本次输入记录（最多 100 条）"
  };

  // 仅是个人主页的虚拟内容，与服务器或访客设备的文件无关。
  const FILES = Object.freeze({
    "/": null,
    "/home": null,
    "/home/knight": null,
    "/home/knight/about.txt": "Knight\n记录学习、实践与思考。\n",
    "/home/knight/links.txt": "GitHub  https://github.com/pureSaviour\n主页    https://puresaviour.github.io/\n"
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
        throw new Error("暂不支持管道、重定向或脚本语法。文字中的特殊符号请放在引号内。");
      }
      value += char;
    }
    if (!partial && (quote || escaped)) throw new Error(quote ? "引号尚未闭合。" : "反斜杠后缺少字符。");
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
    let cwd = HOME, previous = HOME;
    const history = [];
    function requireDirectory(path) {
      if (!exists(path)) throw new Error("没有这个目录：" + path);
      if (!isDirectory(path)) throw new Error("不是目录：" + path);
    }
    function noArguments(args) {
      if (args.length) throw new Error("该命令不接受参数。输入 help <命令> 查看用法。");
    }
    function execute(line) {
      if (!line.trim()) return { output: "" };
      if (line.length > 2048) return { output: "命令过长，请控制在 2048 个字符内。", error: true };
      history.push(line);
      if (history.length > 100) history.shift();
      try {
        const [command, ...args] = tokenize(line).map((token) => token.value);
        if (!COMMANDS.includes(command)) throw new Error("找不到命令：" + command + "。输入 help 查看支持的命令。");
        if (args.length === 1 && args[0] === "--help") return { output: HELP[command] };
        switch (command) {
          case "help": {
            if (args.length > 1) throw new Error("用法：help [命令]");
            if (args.length && !Object.hasOwn(HELP, args[0])) throw new Error("没有这个命令的说明：" + args[0]);
            return { output: args.length ? HELP[args[0]] : Object.values(HELP).join("\n") + "\n\n~ = /home/knight。仅支持上述命令，不展开变量，不执行脚本。" };
          }
          case "ls":
          case "dir": {
            let all = false, long = false;
            const paths = [];
            let options = true;
            for (const arg of args) {
              if (options && arg === "--") { options = false; continue; }
              if (options && arg.startsWith("-") && arg !== "-") {
                if (!/^-[al]+$/.test(arg)) throw new Error("不支持的选项：" + arg + "。可用 -a、-l。");
                all ||= arg.includes("a");
                long ||= arg.includes("l");
              } else paths.push(arg);
            }
            if (paths.length > 1) throw new Error("用法：" + command + " [-a] [-l] [路径]");
            const path = normalizePath(paths[0] || ".", cwd);
            if (!exists(path)) throw new Error("没有这个文件或目录：" + path);
            let entries = isDirectory(path) ? children(path) : [{ name: path.split("/").pop(), path, directory: false }];
            if (all && isDirectory(path)) entries = [{ name: ".", path, directory: true }, { name: "..", path: normalizePath("..", path), directory: true }, ...entries];
            return { output: long ? entries.map((entry) => (entry.directory ? "dr-xr-xr-x" : "-r--r--r--") + "  " + entry.name + (entry.directory ? "/" : "")).join("\n") : entries.map((entry) => entry.name + (entry.directory ? "/" : "")).join("  ") };
          }
          case "pwd": noArguments(args); return { output: cwd };
          case "cd": {
            if (args.length > 1) throw new Error("用法：cd [目录]");
            const target = args[0] === "-" ? previous : normalizePath(args[0] || HOME, cwd);
            requireDirectory(target);
            previous = cwd;
            cwd = target;
            return { output: args[0] === "-" ? cwd : "" };
          }
          case "cat": {
            if (!args.length) throw new Error("用法：cat <文件> [...]");
            return { output: args.map((arg) => {
              const path = normalizePath(arg, cwd);
              if (!exists(path)) throw new Error("没有这个文件：" + path);
              if (isDirectory(path)) throw new Error("这是目录：" + path);
              return FILES[path];
            }).join("") };
          }
          case "tree": {
            if (args.length > 1) throw new Error("用法：tree [目录]");
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
          case "date": noArguments(args); return { output: now().toLocaleString("zh-CN", { hour12: false }) };
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
