const test = require("node:test");
const assert = require("node:assert/strict");
const { createShell } = require("../terminal-core.js");

test("browses the same virtual files with ls, dir, cat and tree", () => {
  const shell = createShell();
  assert.equal(shell.execute("pwd").output, "/home/knight");
  assert.equal(shell.execute("ls").output, "about.txt  links.txt");
  assert.equal(shell.execute("dir").output, shell.execute("ls").output);
  assert.match(shell.execute("ls -al").output, /dr-xr-xr-x  \.\//);
  assert.match(shell.execute("cat about.txt links.txt").output, /Knight\n记录学习、实践与思考。\nGitHub  https:\/\/github.com\/pureSaviour/);
  assert.equal(shell.execute("tree").output, ".\n├── about.txt\n└── links.txt");
  assert.match(shell.execute("tree /").output, /home\/\n    └── knight\//);
});

test("normalizes paths, home and previous directory without moving after errors", () => {
  const shell = createShell();
  shell.execute("cd ..");
  assert.equal(shell.cwd, "/home");
  assert.equal(shell.execute("cat knight/./about.txt").output, "Knight\n记录学习、实践与思考。\n");
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
  assert.equal(shell.execute("cat 'about.txt'").output, "Knight\n记录学习、实践与思考。\n");
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
  assert.equal(shell.execute("date").output, now.toLocaleString("zh-CN", { hour12: false }));
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
