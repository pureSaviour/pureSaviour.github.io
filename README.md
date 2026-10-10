# Knight

Knight 的个人主页：记录学习、实践与思考。

[访问主页](https://puresaviour.github.io/) · [隐私政策](https://puresaviour.github.io/privacy.html)

HTML + CSS + 原生 JavaScript，无依赖、无构建步骤。项目和笔记有真实素材后再添加。

## 本地预览

直接在浏览器打开 `index.html`，或在仓库根目录运行：

```sh
python -m http.server 4173 --bind 127.0.0.1
```

然后访问 `http://127.0.0.1:4173`。

## 修改内容

- `index.html`：展示名、简介、导航与对外链接。
- `privacy.html`：隐私政策；网站数据处理发生变化时同步更新。
- `style.css`：字体、颜色、间距和手机布局。
- `bin/commands.js`：虚拟目录、命令处理与补全；在 `FILES` 中维护虚拟文件。
- `terminal.js`：终端展示、输入与键盘交互。
- `assets/favicon.svg`：浏览器标签图标。
- `docs/design-brief.md`：已确认的设计约定。

## 模拟终端

首页默认展开，终端与页面融为一体，没有边框、输入下划线、标题或操作提示。输入行位于共享滚动缓冲区中的最新输出之后，使用块状光标；帮助、错误与内置文本均为英文。支持 `help`、`ls` / `dir`、`tree`、`pwd`、`cd`、`cat`、`echo`、`whoami`、`date`、`clear`、`history` 和 `font`。输入 `help <命令>` 或 `<命令> --help` 查看用法。初始目录为 `/home/knight`，包含 `about.txt` 与 `links.txt`。

Enter 执行、↑↓ 翻历史、Tab 补全、Ctrl + L 清屏；Shift + Tab 可离开输入框。不支持管道、重定向、变量展开或脚本。虚拟内容与终端状态只存在于浏览器内存中，刷新清空，不发送命令请求、不访问真实文件系统。

默认字体为自托管 JetBrains Mono，无需访客预先安装。`font maple`、`font system` 和 `font jetbrains` 可切换字体，`font` 查看当前字体；选择仅在本次页面会话内保留。`font bold` / `font --bold` 设置粗体，`font italic` / `font --italic` 设置斜体，两者可组合；`font normal` / `font --normal` 同时恢复普通字重和正体，保留当前字体家族。`font --help` 查看完整用法，不改变设置。

命令实现集中在项目 `bin/commands.js` 中；虚拟 `/bin` 下为每个命令提供可执行入口。直接输入 `bin`（或 `bin/`、`/bin`）进入该目录，输入 `ls` 查看全部命令，再输入 `font`、`./font` 等执行对应入口。`ls /bin`、`ls -l /bin`、`tree /bin` 也可查看，`/bin/font --help` 和 `bin/font --help` 可直接调用。裸命令名按虚拟 `PATH=/bin` 查找，命令与参数都支持路径补全；目录路径支持直接切换目录。执行入口映射到 JavaScript 命令实现，无需生成真实可执行文件。

主页顶部静态展示 C、C++、C# 和 Python 的 Hello World 输出语句，分别为函数、命名空间、字符串和运算符着色；无高亮库依赖，禁用 JavaScript 仍可见。`font` 同时改变终端和这四行代码的字体家族、字重及斜体，高亮配色保留。

运行命令逻辑检查：

```sh
node tests/terminal.test.cjs
```

## GitHub Pages

目标仓库：`pureSaviour/pureSaviour.github.io`。

将文件放在 `main` 分支根目录，在仓库 Settings → Pages 中选择 **Deploy from a branch**，分支选 `main`，目录选 `/ (root)`。发布后的地址为 `https://puresaviour.github.io/`。

`.nojekyll` 让 GitHub Pages 直接提供静态文件。

配置方式参见 [GitHub Pages 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 字体

终端自托管 [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) Regular、Bold、Italic、BoldItalic WOFF2，主页自托管 [Maple Mono](https://github.com/subframe7536/maple-font) 的正体与斜体可变 WOFF2 字体，中文使用访问者系统的中文字体。字体采用 SIL Open Font License 1.1；授权文件见 `assets/fonts/JetBrainsMono-OFL.txt` 与 `assets/fonts/OFL.txt`，来源记录见 `assets/fonts/README.md`。
