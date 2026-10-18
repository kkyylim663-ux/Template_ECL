# 现有图片 → 站点放置规划(2026-10-18)

> **执行状态(2026-10-18 17:30)**:四批图片全部对齐 `final/` 终版并入库 —— home-3 桌面换入干净牛仔终版(c79a6549)、8 张促销卡(烤字版)入 `site/public/promos/`、分页 24 张与 `home/download-app.webp` 补齐提交;提交 `5d099a2`+`c6c025a`+`c7792a3`+`0195964`;3200 已重建,43/43 文件字节校验、375/1280 手机/桌面选择实测通过。手机视觉基线已由另一任务 15:34 刷新(含手机横幅)。
> **接线完成(2026-10-18 18:05)**:促销卡 `3acee4f`、12 页分页横幅 `58127c8`、下载区 `9ec03be`;12/12 页实载 1920×473 + 手机 source 验证通过,3000/3200 均已重建。仍待办:品牌接线(logo/og/favicon)——**已于 2026-10-18 晚全部完成(`714da54`+`1023783`:providers/游戏卡/G/E/F01/品牌+favicon+og/H02 全部接入;3200/3000 已换新构建;场馆卡俱乐部 logo 待拉图清单 §2)。** 留意:桌面 home 视觉基线较旧(13:46),接线后跑 visual 套件需 `--update-snapshots` 一次。

范围:只规划**已生成**的成品图,以及它们进 `site/` 的位置。raw 源图、归档变体、参考图不在放置范围。
(本文件只读结论,不动站点任何文件;执行步骤见 §3。)

## 0. 现有成品(共 15 张,都在 `final/public/`)

| 组 | 文件 | 说明 |
|---|---|---|
| 横幅·桌面 B01 | `banners/home-1..5-desktop.webp` | 顶层 = **已烤英文文字版**;`_pre-text/` 同名 = **未烤字干净版**(md5/体积已核对) |
| 横幅·手机 B02 | `banners/home-1..5-mobile.webp` | 同上;手机版按独立重构图出(Nano Banana),非桌面硬裁 |
| 品牌 A01–A05 | `brand/logo.png` `logo-mark.png` `logo-stacked.png` `app-icon.png` `og.jpg` | 订单 081–085;`.svg` 矢量化留给后期 |

归档(不放置):`_pre-text/`(选干净版时它就是源)、`_alt-nocowboy/`(home-3 无牛仔备选)、`raw/` 里的 `-cowboy`、`-v2`。

## 1. 放置总表

### 1.1 横幅 → 首页轮播(BannerCarousel,5 个 slide)

| 文件 | 站点路径 | 位置 | 现状 |
|---|---|---|---|
| home-1..4-desktop | `site/public/banners/` | slide1–4:bn-welcome / bn-reload / bn-ranking / bn-4d | 已入库(干净版);home-3 已于 17:30 换入牛仔终版(c79a6549) |
| home-5-desktop | 同上 | slide5:bn-vip | 已入库(14:24 提交);`mocks/banners.json` 已接 `image` |
| home-1..5-mobile | 同上 | 各 slide `<768px` 的 `<source>` | 已入库(14:24 提交);`imageMobile` 已接×5 |

### 1.2 品牌 → 各占位符(依据 IMAGE-PLAN §2/§3)

| 文件 | 规划位置 | 显示尺寸 | 现状 |
|---|---|---|---|
| logo.png(A01) | 顶栏左 / 手机标题栏中、页脚、登录、注册、mobile-bar | 145×47 | 已入库;但代码现在渲染**文字 `BRAND`**(Header.tsx:29 / Footer.tsx:75 / DesktopSidebar.tsx:84 / MobileChrome.tsx:142),没有 `<img>` 挂点 → 需定挂法(见 §2.2) |
| logo-mark.png(A02) | favicon、PWA、桌面侧栏收起态 | 32×32(32/180/192 派生) | 已入库;favicon 仍是 `app/icon.svg` 占位 → 未接 |
| og.jpg(A04) | meta 链接分享图 | 1200×630 | 已入库;`lib/seo.ts` 的 openGraph 目前**没有 images 字段** → 未接;JSON-LD logo(seo.ts:128)还指向 `/brand/logo.svg` |
| app-icon.png(A05) | 手机顶部「下载 App」条、home-download 区、下载页 | 28×28 | 已入库;站点暂无这些组件 → 暂无挂点,留在 `public/brand/` 备用 |
| logo-stacked.png(A03) | 登录/注册页顶部 | 150×150 | **不放置**(已定规则:Logo 不做叠版,文件保留) |

## 2. 入库前先定两件事(互斥,定了我执行)

### 2.1 横幅文字版本
- **A 干净版 + 网页文字层**(你上次的要求:不烤字、网页按风格写字):源 = `_pre-text/`。网页层代码已在工作区写好(未提交):Rye 金渐变标题 + 白副标题 + 金色 CTA 胶囊(STYLE-GUIDE §9)。
- **B 烤字版**(另一任务已烤好 10 张):源 = 顶层 `banners/*.webp`。此时网页文字层必须关掉,否则出现双份文字。
- 两套都齐,切换成本 = 复制 10 个文件。**建议 A**(符合最新要求;文字可选中、可缩放、多语言可后加)。

### 2.2 顶栏 Logo 挂法
- **A 用 logo.png 图**:替换四处 `{brand.logo.text}` 为 `<img>`(文字留作 fallback,`config/brand.ts` 本来就是这么设计的)。
- **B 保持文字 + 加 Rye 金字样式**(§9 原方案)。
- **建议 A**:成品图已就位,最贴近「把改好的图放进占位符」;品牌名正式定稿后换文件、不换路径。

## 3. 决定后的执行清单(逐条可做)

1. **横幅入库**:按文件复制 10 张到 `site/public/banners/`(选 A 从 `_pre-text/`;选 B 从顶层)。
   - ⚠ 不要直接用 `postprocess.mjs --site`:它会把 `_pre-text/`、`_alt-nocowboy/` 一起复制进去;要么先给脚本加「下划线目录排除」,要么手工 cp。
   - 选 A 时先确认 home-3 干净牛仔底:`_pre-text/home-3-*` 若不是牛仔版,用 `raw/003-s2-cowboy`(及手机对应图)重跑 postprocess(免费)。#3 用牛仔版是用户已选定的。
2. **接线 mock**:`site/mocks/banners.json` → bn-vip.image = `/banners/home-5-desktop.webp`;5 个 slide 补 `imageMobile`。
3. **品牌接线**:`seo.ts` 补 `openGraph.images` + `twitter card: summary_large_image` + JSON-LD logo 指向最终 logo 文件;favicon 用 logo-mark 派生 `app/icon.png`(或等矢量化后换)。
4. **Logo 挂法落地**(选 A):Header / Footer / DesktopSidebar / MobileChrome 改 `<img>`。
5. **验证**:tsc + banners 单测 + visual home 快照更新;然后提交(与另一任务协调,它仍在跑)。

## 4. 不在本次范围

- `raw/` 源图、`_pre-text/`、`_alt-nocowboy/`、`ref/`、概念图 —— 不进站点。
- 已入库(2026-10-18):B01/B02 横幅、B03 下载区、C01/C02 分页横幅(烤字版)、D01 促销卡、**E 组 VIP/金币/票券/预测/排行榜 + G01 入口四卡(32 张,`5e7cf1a`)、F01 注册插图(`cd33873`)、G 组 32 张(086·087·090–119,`e52a14f`)、H02 规则图 4 + H06 分享弹窗 2 + provider 名牌 28(34 张,`e639473`,2026-10-18 晚)**。未生成:D02 更新缩略图 043–048(6 张);H 组其余(H01/H03/H04/H05)不做。
- E 组/G01/F01/G 组接线(留站点会话):vip 徽章与权益图标、achievement 金币、tickets 插图、ranking 背景(`.rb-prize-panel`/`.rb-personal` 换背景图)、prediction 头图(3 状态×桌面/手机)、home 入口卡(4 张,**卡高 70→95px**)、auth 注册页左侧大图;**G 组**:home 吉祥物 `mascot.png` + 弹窗 `popup.webp`、Slots 页 HOT GAMES 栏(`games/card-bg.webp` 卡底、`hot-1..8.webp` 海报、`hotgames-title.webp`+`fire.webp` 标题板/火焰)、`illus/*` 空状态、`avatar/avatar-1..8`、`modal/status-*`、`footer/badge-*.png`、`deposit/method-*.png`(新目录 games/illus/avatar/modal/footer/deposit);E02/E08 三个 `.svg` 目标按先例实交 `.png`。3200 预览需重建才可见新图。

## 5. 现状补记(证据)

- 站点 10 张横幅 = 干净版(md5 与 `_pre-text/` 完全一致;home-3 桌面已于 17:30 换入终版 c79a6549)。
- 品牌 5 张:site 与 final md5 完全一致(已入库、未接线)。
- 横幅文案仅在 `site/mocks/banners.json`(英文);`messages/` 4 语言包里没有横幅文案,网页文字层沿用 mock 数据即可。
