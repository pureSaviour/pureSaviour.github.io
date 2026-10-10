const test = require("node:test");
const assert = require("node:assert/strict");
const { createShell } = require("../bin/commands.js");

test("browses the same virtual files with ls, dir, cat and tree", () => {
  const shell = createShell();
  assert.equal(shell.execute("pwd").output, "/home/knight");
  assert.equal(shell.execute("ls").output, "about.txt  links.txt");
  assert.equal(shell.execute("dir").output, shell.execute("ls").output);
  assert.match(shell.execute("ls -al").output, /dr-xr-xr-x  \.\//);
  assert.match(shell.execute("cat about.txt links.txt").output, /Knight\nLearning, building, and staying curious.\nGitHub  https:\/\/github.com\/pureSaviour/);
  assert.equal(shell.execute("tree").output, ".\n├── about.txt\n└── links.txt");
  assert.match(shell.execute("tree /").output, /home\/\n    └── knight\//);
});

test("normalizes paths, home and previous directory without moving after errors", () => {
  const shell = createShell();
  shell.execute("cd ..");
  assert.equal(shell.cwd, "/home");
  assert.equal(shell.execute("cat knight/./about.txt").output, "Knight\nLearning, building, and staying curious.\n");
  shell.execute("cd /");
  shell.execute("cd ../../../../");
  assert.equal(shell.cwd, "/");
  shell.execute("cd ~/../knight");
  assert.equal(shell.cwd, "/home/knight");
  assert.equal(shell.promptPath, "~");
  shell.execute("cd missing");
  shell.execute("cd about.txt");
  assert.equal(shell.cwd, "/home/knight");
  assert.equal(shell.execute("cd -").output, "/");
  shell.execute("cd");
  assert.equal(shell.cwd, "/home/knight");
});

test("parses quoted and escaped arguments as text", () => {
  const shell = createShell();
  assert.equal(shell.execute('echo "hello world" \'你好\' escaped\\ space').output, "hello world 你好 escaped space");
  assert.equal(shell.execute("echo '' \"\"").output, " ");
  assert.equal(shell.execute('echo "<img src=x onerror=alert(1)>"').output, "<img src=x onerror=alert(1)>");
  assert.equal(shell.execute('echo "$USER | $(whoami)"').output, "$USER | $(whoami)");
  assert.equal(shell.execute("cat 'about.txt'").output, "Knight\nLearning, building, and staying curious.\n");
  assert.equal(shell.execute("echo -n hello").output, "hello");
});

test("reports unsupported syntax, invalid options and unknown files", () => {
  const shell = createShell();
  for (const command of ['echo "unfinished', "echo dangling\\", "ls | cat", "echo $(whoami)", "cat /etc/passwd", "cat /", "ls -z", "ls . /", "pwd extra", "rm about.txt", "help __proto__", "help toString", "toString"]) {
    assert.equal(shell.execute(command).error, true, command);
  }
  assert.equal(shell.execute("cat about.txt").error, undefined);
  assert.equal(shell.execute(" ").output, "");
});

test("supports specific help, identity and the injected current time", () => {
  const now = new Date("2026-10-10T08:00:00Z");
  const shell = createShell({ now: () => now });
  assert.equal(shell.execute("help cat").output, shell.execute("cat --help").output);
  assert.match(shell.execute("help").output, /history/);
  assert.equal(shell.execute("whoami").output, "Knight");
  assert.equal(shell.execute("date").output, now.toLocaleString("en-GB", { hour12: false }));
});

test("history is bounded, contains errors and survives clear, but not a new session", () => {
  const shell = createShell();
  shell.execute("missing");
  assert.equal(shell.history[0], "missing");
  shell.execute(" ");
  assert.equal(shell.history.length, 1);
  for (let i = 0; i < 110; i++) shell.execute("echo " + i);
  assert.equal(shell.history.length, 100);
  assert.equal(shell.history[0], "echo 10");
  assert.equal(shell.execute("clear").clear, true);
  assert.match(shell.execute("history").output, /clear\n100  history$/);
  shell.history.push("outside mutation");
  assert.equal(shell.history.length, 100);
  assert.deepEqual(createShell().history, []);
  assert.equal(shell.execute("echo " + "x".repeat(2048)).error, true);
});

test("completes commands, relative and absolute paths, quoted names and cursor positions", () => {
  const shell = createShell();
  assert.equal(shell.complete("wh").line, "whoami ");
  assert.equal(shell.complete("cat ab").line, "cat about.txt ");
  assert.equal(shell.complete('cat "ab').line, 'cat "about.txt" ');
  assert.equal(shell.complete("cat ~/ab").line, "cat ~/about.txt ");
  assert.equal(shell.complete("cd /ho").line, "cd /home/");
  assert.deepEqual(shell.complete("cd ab").matches, []);
  assert.deepEqual(shell.complete("cat ").matches, ["about.txt", "links.txt"]);
  assert.equal(shell.complete("help wh").line, "help whoami ");
  assert.equal(shell.complete("cat about.txt", 2).line, "cat about.txt");
  assert.equal(shell.complete("cat about.txt", 6).line, "cat about.txt ");
  assert.equal(shell.complete("echo abc").line, "echo abc");
  assert.equal(shell.complete("ls | ca").matches.length, 0);
  shell.execute("cd /");
  assert.equal(shell.complete("cat home/kn").line, "cat home/knight/");
});


test("uses English for built-in output and changes fonts only within a session", () => {
  const shell = createShell();
  for (const command of ["help", "help cat", "cat about.txt links.txt", "date", "missing", "cat /", "cd missing", "ls -z", "echo 'unfinished", "ls | cat", "pwd extra", "font missing"]) {
    assert.doesNotMatch(shell.execute(command).output, /[\u3400-\u9fff]/, command);
  }
  assert.deepEqual(shell.execute("font"), { output: "Font: JetBrains Mono (normal)", font: "jetbrains", fontStyle: "normal", fontWeight: 400 });
  assert.equal(shell.execute("font maple").font, "maple");
  assert.equal(shell.execute("font system").font, "system");
  assert.equal(shell.execute("font __proto__").error, true);
  assert.equal(shell.execute("font").font, "system");
  assert.equal(shell.execute("font maple extra").error, true);
  assert.equal(shell.complete("font j").line, "font jetbrains ");
  assert.equal(shell.complete("font s").line, "font system ");
  assert.equal(createShell().execute("font").font, "jetbrains");
});


test("exposes every command as an executable in /bin with path-based invocation", () => {
  const names = ["help", "ls", "dir", "tree", "pwd", "cd", "cat", "echo", "whoami", "date", "clear", "history", "font"];
  const shell = createShell();
  assert.deepEqual(shell.execute("ls /bin").output.split("  "), names);
  assert.equal(shell.execute("ls -l /bin").output.split("\n").length, names.length);
  for (const name of names) {
    assert.equal(shell.execute(`/bin/${name} --help`).output, shell.execute(`${name} --help`).output, name);
    assert.match(shell.execute(`cat /bin/${name}`).output, new RegExp(`^Virtual command: ${name}\\n`));
    assert.match(shell.execute(`ls -l /bin/${name}`).output, /^-r-xr-xr-x/);
  }
  assert.match(shell.execute("tree /bin").output, /font/);
  shell.execute("cd /bin");
  assert.equal(shell.execute("./echo hello").output, "hello");
  assert.equal(shell.execute("../bin/pwd").output, "/bin");
  assert.equal(shell.execute("echo from PATH").output, "from PATH");
  assert.equal(shell.execute("/bin/missing").error, true);
  assert.equal(shell.execute("/bin").error, true);
  assert.match(shell.execute("/home/knight/about.txt").output, /Permission denied/);
  assert.equal(shell.complete("./fo").line, "./font ");
  assert.equal(shell.complete("/bin/fo").line, "/bin/font ");
  assert.equal(shell.complete("/bin/font --i").line, "/bin/font --italic ");
  assert.equal(shell.complete("cd /b").line, "cd /bin/");
});

test("font styles combine, reset, validate atomically and support --help", () => {
  const shell = createShell();
  assert.equal(shell.execute("font bold").fontWeight, 700);
  assert.equal(shell.execute("font --italic").fontStyle, "italic");
  assert.match(shell.execute("font").output, /bold italic/);
  assert.deepEqual(shell.execute("font --normal"), { output: "Font: JetBrains Mono (normal)", font: "jetbrains", fontStyle: "normal", fontWeight: 400 });
  const selected = shell.execute("font maple bold italic");
  assert.equal(selected.font, "maple");
  assert.equal(selected.fontStyle, "italic");
  assert.equal(selected.fontWeight, 700);
  const help = shell.execute("font --help");
  assert.match(help.output, /--normal/);
  assert.match(help.output, /--bold/);
  assert.match(help.output, /--italic/);
  assert.equal(help.font, undefined);
  assert.equal(shell.execute("font system --help").output, help.output);
  assert.deepEqual(shell.execute("font"), selected);
  assert.equal(shell.execute("font system --normal unknown").error, true);
  assert.deepEqual(shell.execute("font"), selected);
  assert.equal(shell.execute("font system jetbrains").error, true);
  assert.deepEqual(shell.execute("font"), selected);
  assert.equal(shell.execute("font normal").fontStyle, "normal");
  assert.equal(shell.execute("font").fontWeight, 400);
  assert.equal(shell.execute("font").font, "maple");
  assert.equal(shell.complete("font jetbrains b").line, "font jetbrains bold ");
  assert.equal(shell.complete("font --h").line, "font --help ");
  assert.equal(createShell().execute("font").fontWeight, 400);
  assert.equal(createShell().execute("font").fontStyle, "normal");
});
