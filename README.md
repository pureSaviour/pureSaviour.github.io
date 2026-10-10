# Knight

Knight 的个人主页：记录学习、实践与思考。

[访问主页](https://puresaviour.github.io/) · [隐私政策](https://puresaviour.github.io/privacy.html)

纯 HTML + CSS，无 JavaScript、无构建步骤。项目和笔记有真实素材后再添加。

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
- `assets/favicon.svg`：浏览器标签图标。
- `docs/design-brief.md`：已确认的设计约定。

## GitHub Pages

目标仓库：`pureSaviour/pureSaviour.github.io`。

将文件放在 `main` 分支根目录，在仓库 Settings → Pages 中选择 **Deploy from a branch**，分支选 `main`，目录选 `/ (root)`。发布后的地址为 `https://puresaviour.github.io/`。

`.nojekyll` 让 GitHub Pages 直接提供静态文件。

配置方式参见 [GitHub Pages 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 字体

自托管 [Maple Mono](https://github.com/subframe7536/maple-font) 的可变 WOFF2 字体，中文使用访问者系统的中文字体。字体采用 SIL Open Font License 1.1；授权文件见 `assets/fonts/OFL.txt`，来源记录见 `assets/fonts/README.md`。
