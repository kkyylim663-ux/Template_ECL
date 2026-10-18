# 原站拉图清单(2026-10-18)

从原站直接拉取的图片清单 —— 站点克隆(`site/`)还缺、且**原站已有现成图**的图位。
**状态:✅ 2026-10-18 晚已开拉并入库(提交 site `8a27cf8`,586 张图片,只进图片)并接线(提交 `e4299cb`;执行记录与缺口见文末)**(本文件只管清单,不含已生成/已入库内容)。
总量 ≈600 张,其中游戏封面 545 张为最大头;**带「ECL」字眼的 Provider / 游戏一律不拉**(见「不拉」清单;聊天素材仍免拉)。

来源快照:`Clone web ECL\crawl\`(2026-10-14 guest 态抓取 www.eclbet04.com,my/sg 两国全套页面 + 内联 JS)。
拉取域名:`https://www.eclbet04.com/static/...`(静态图);游戏图走 CDN,见 §1。

## 1. 游戏封面 — 545 张

- **规则**:`site/mocks/slots.gamelist.json` 各厂商游戏列表**末尾 20 个**(文件内顺序 = 原站 API 顺序);aviatrix 仅 5 款 → 全取。合计 **545**。
- **URL**:文件名 = 各游戏 `img` 字段;CDN 基底两处已定位:`defImgPath = https://cdv2defn.cloudcdnetw.com/`、`baseImgUrl = https://staging-ecl.xyz`;确切目录模板开拉时用一次原站游戏列表请求确认。
- **入站**:`site/public/games/<文件名>`(带 `?v2` 等查询后缀的要清洗掉)。
- **克隆占位**:`components/game/GameCard.tsx:53`、`components/game/ProviderCardGrid.tsx:71/85`。
- **ECL 字眼豁免**:含 ECL 品牌字的游戏不拉(如 `vs20olympecl`「ECL Olympus」,克隆 mock 已改名 "BRAND Olympus");已核对 **28 厂商末尾 20 里没有任何 ECL 条目 → 545 不受影响**。
- **28 厂商明细**(总数 → 将拉;末列 = 该批最后一张的文件名示例):

| 厂商 | 总数 | 将拉 | 末尾示例 |
|---|---|---|---|
| pragmatic | 753 | 20 | vsprgwayshousel.png |
| pt | 553 | 20 | daringdave.jpg |
| spade | 210 | 20 | A-GL02.jpg |
| va | 63 | 20 | 1024.jpg |
| joker | 298 | 20 | bwwza4umpbwsh.png |
| w88 | 159 | 20 | fortunetree_v1.jpg |
| cq9 | 255 | 20 | cq9_65_en.png |
| booming | 135 | 20 | classico.png |
| jili | 227 | 20 | GAMEID_812_EN.png |
| nextspin | 64 | 20 | sCandyXmas_144x187_en.jpg |
| fachai | 67 | 20 | 22109.png |
| haba | 247 | 20 | BlackJack3HDoubleExposure.png |
| relaxgaming | 443 | 20 | 201514.jpg |
| redtiger | 358 | 20 | 982.png |
| jdb | 180 | 20 | 9008_en.jpg |
| advantplay | 65 | 20 | 20001.jpg |
| microplus | 480 | 20 | SMG_titaniumLiveGames_BaccaratplayboyNC.png |
| btg | 64 | 20 | 977.png |
| netent | 238 | 20 | 971.png |
| nolimitcity_new | 125 | 20 | 981.png |
| hacksaw_ig | 303 | 20 | 2018879.png |
| fastspin | 74 | 20 | S-LF03.jpg |
| dt | 295 | 20 | mysticalstones_146x136.png |
| fatpanda | 34 | 20 | vs10emotiwins.png?v2 |
| inout | 69 | 20 | INOUT_crash.png |
| playace | 41 | 20 | FRU.png |
| bng | 316 | 20 | 1071.png |
| aviatrix | 5 | 5 | aviatrix-fortunes.png |

## 2. 厂商 Logo · 首页/大厅轨条 — 21 张(ECL Sports 除外)

基址 `https://www.eclbet04.com`:

- livecasino 13 ← `/static/images/live-casino/images/`:`evo-asia` `pp-club` `pt-club` `winfinity-club` `on-casino` `allbet-club` `dg-club` `sg-club` `ag-club` `ezugi-club` `gp-club` `wm-club` `creedroomz`(均为 .webp)
- sports 2 ← `/static/images/sports/images/`:`saba-sport` `cmd368`(**`bti.webp` = 原站「ECL Sports」→ 按用户指示不拉**)
- esports 6 ← `/static/images/esports/`:`saba-sport` `saba-esports` `inplay-matrix` `cmd368` `tf-gaming` `ia-gaming`(.webp)
- 原站首页轨条另一族同用:`/static/images/game-provider/my/{Live,Sports,Esports}/<CODE>.jpg`(Sports 目录本只有 cmd/SABA 两张,天然无 ECL)
- 克隆占位:`components/home/ProviderRail.tsx:30`、`components/game/ProviderRail.tsx:38`

## 3. 厂商 Logo · Slots 厂商卡 — 原站现成 8 家(无 ECL)

`/static/images/game-provider/my/Slots/`:`CQ9.jpg` `DREAMTECH.jpg` `GP.jpg` `JOKER.jpg` `PLAYNGO.jpg` `PP.jpg` `PT.jpg` `SPADE.jpg`

其余 20 家原站静态目录没做卡图;开拉时以原站实际渲染为准,缺的另定(sg 变体另有 `QTECH.jpg`)。

## 4. 4D 开彩商 Logo — 7 张(名对名全有)

`/static/images/lottery/`:`logo_magnum.png` `logo_toto.png` `logo_damacai.png` `logo_singapore.png` `logo_sabah.png` `logo_sandakan.png` `logo_cashsweep.png`。

克隆占位:`components/event/LotteryResultCards.tsx:51`。

## 5. 页面标题小图标 — 10 处 + 奖杯 1

- 克隆占位 `page-title__icon`:GameLobby.tsx:89(slots / fast-game)、CategoryLobby.tsx:60(livecasino / sports / esports)、4d:62、promotion 列表:64 / 详情:71、update 列表:59 / 详情:84(**共 10 处**)
- 排行榜奖杯 `rb-trophy`(ranking-board:153)算 1 处
- 原站两套(挑一套即可,推荐 svg):`/static/images/menu/icon-*.svg`(icon-slots-game / icon-live-casino / icon-sports / icon-esports / icon-fast-game / icon-lottery-4d / icon-number-game / icon-prediction / icon-ranking-board / icon-personal-achievement / icon-promotion / icon-update / icon-vip …)、`/static/images/icon-page/*.png`(slots / live-casino / sports / esports / lottery-4d / promotion / update / vip / menu …)
- 成就/票务等成员页若也要同款图标:menu 目录有 `icon-personal-achievement.svg`,icons 目录有 `icon-ticket-center.svg`。

## 6. Wallet 银行 — 登录后拉(用户提供登录态)

- 快照没有:存款/钱包区需登录(2026-10-14 抓取为 guest 态)。
- 开拉步骤:① 用户登录原站 → ② 进钱包/存款页 → ③ 从页面 DOM / 网络请求提取银行 logo 文件地址 → ④ 批量抓 → `site/public/banks/`(命名 `<银行码>.png`)。
- 银行代码表(原站内嵌,已抄录):MY_MBB=Maybank / MY_CIMB=CIMB Bank / MY_PBB=Public Bank / MY_RHB=RHB Bank / MY_HLB=Hong Leong Bank / …;QR 类:MBB=Maybank Berhad / MBQR=Maybank QRPAY/MAE / TNGQR=Touch & Go QR / DUITNOW=DuitNow QR / CIMB=CIMB Bank QR / FPX|MBB=Maybank(FPX)。
- 克隆占位:`components/account/DepositBankForm.tsx:183`、`components/account/DepositPanel.tsx:257`(需要 4 家银行 + TnG / GrabPay / DuitNowQR 等通道图标)。
- **Gateway logo:不做** —— 建议单色简笔线条图标(与站内 sprite 风格一致),不拉图。

## 7. 杂项

- ~~聊天素材 5 张~~ — **已免拉(2026-10-18 用户指示)**。原定位(备查):`/static/images/chat/` 的 `chat.png` `pin.png` `emoji.png` `angpao-open.webp` `ticket.webp`
- 状态弹窗 gif ×3:`/static/images/icons/` `icon-sucuess.gif` `icon-alert.gif` `icon-reject.gif`(可选;G 组已交付 `public/modal/status-*.webp` 三态,大概率也免)

## 不拉 / 已完成(仅供参考,别再翻)

- **不拉**:下载徽章 2(用户指示)、Gateway logo(不做,简笔代替)、赞助页(用户指示不拉)、**带「ECL」字眼的 Provider / 游戏(2026-10-18 用户指示:ECL Sports = `bti.webp` 不拉;ECL 品牌游戏 `vs20olympecl` 等不拉)**、**聊天素材 5 张(§7,2026-10-18 用户指示)**、Slots 厂商卡缺失的 20 家(原站没做,另议)
- **已完成**:页面横幅 24、首页横幅 10、促销卡 8、下载区主图、E 组 32 + G01 4 + F01 1、导航菜单图标(站点 sprite)、社交图标、国旗;品牌 logo/og/favicon 5 张已生成、只差接线(独立待办)

## 拉取方式备忘

- 原站 guest 可直取:`crawl/tools/map.mjs` 证明纯 fetch(无验证码)即可拿到页面与静态资源;`/static/**` 均为公开文件。
- 建议脚本(Node fetch):断点续跑 + 逐张校验(非空/类型);545 张封面文件名从 `site/mocks/slots.gamelist.json` **现场生成**,不手抄。
- 建议顺序:4D / 页面图标 → 21 轨条 + 8 厂商卡 → 545 封面 → 银行(趁用户登录时一起)。

## 执行记录(2026-10-18 晚,提交 `8a27cf8`,586 张)

- **已拉(全部只进图片,零杂项;脚本 `site/_scratch/pull/pull.mjs`,断点续跑+UA+magic 校验)**:
  - 4D logo 7 → `site/public/4d/`;页面图标 14(menu/*.svg 13 + `icons/icon-update.svg`(update 图标在 icons/ 不在 menu/) + `icons/icon-ticket-center.svg`)→ `site/public/icons/`;
  - 俱乐部 19 → `site/public/providers/<显示名>.webp`(21 拉→19 存:Saba Sport/CMD368 Sports 两页同名同图);Slots 厂商卡 8 → `site/public/providers/slots/`;
  - 游戏封面 533 → `site/public/games/`;银行 5 → `site/public/banks/`(maybank/rhb/affin/tng/duitnow,改克隆 id 名)。
- **封面 URL 模板(实证)**:`setting_path.img_folder` 按厂商(站点包 `Lqe6…js` 的 `my` 区段,形如 `cdv2defn.cloudcdnetw.com/games/v<N>/`;jili 走代管 `godeftmc029ak.cloudcdnetw.com/img/?img=games/v45/`)+ 游戏 `img` 字段(去 `?v2`);文件名 = `site/mocks/slots.gamelist.json` **parse 键序**末尾 20(aviatrix 5)——已逐厂商与本文 §1 表校验。
- **缺口(原站就没有文件,穷举变体确认,留占位)**:银行 `cimb` / `public` / `grabpay` / `fpx` 图标(该族原站仅有 rhb-bank/maybank/affin-bank/touch-n-go/duitnow);aviatrix 5 张封面(配置指向 `games/v63/` 但 CDN 全 404)。
- **清单笔误**:§1 的 pt 行示例 `daringdave.jpg` 距末尾 145 位,真实末尾 = `roulette.jpg`(总数 698 非 553)——以 mock 文件为准。
- **抓取门禁备忘**:原站无浏览器 UA 一律 403;`staging-ecl.xyz` 未知路径回 652B SPA HTML(状态 200 的假货,判图必须查 content-type/magic);页面内直连 API 被签名反爬拦。
