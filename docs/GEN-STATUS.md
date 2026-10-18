# ECL 图片专区 · 状态与规则(2026-10-18)

## 存储与命名
- 生成的原始图统一存:`ecl-site\Design\Image Plan\IMGFile\raw\<order>-s1.png / -s2.png`
- 保存名严格照 COPY-PROMPTS 文件里的「存为」字段(如 `raw/001-s1.png` → `IMGFile\raw\001-s1.png`);重出换后缀(-v2),不覆盖已通过的图。

## 出图命令(在 ECL Design IMG 目录下运行)
- 按 COPY-PROMPTS 批量:`python gen-orders.py --md COPY-PROMPTS/P1.md --orders 001,002`
  - 步骤 A = `openai/gpt-image-2.5-sunburst`(比例/quality 照文件,如 21:9 / xhigh)
  - 步骤 B = `google/gemini-3.1-flash-image`(即 Nano Banana 2.1,分辨率/比例照文件,以 A 成图作输入)
- 品牌组(A01–A05):`python gen-sunburst.py --id A0x`(读 `AGENT-BY-ID_A01-A05.md`)
- API:`openrouter.ai/api/v1/images`,key 从 `C:\Users\senheng\.zcode\v2\provider_config.json` 读(两个脚本都自带取 key)。

## 已定规则(用户确认)
1. 横幅生成阶段**不烤字**;成品阶段用 `bake-text.py` 把**英文**文字烤进图:标题(Rye 金渐变 #ffd36a→#f6b12e→#b5761a)+ 白副标题(Rubik)+ Play Now 金胶囊(#fba51c→#f79713)。文案取 `site\mocks\banners.json`;桌面=左 40px×比例、垂直居中;手机=顶部居中;干净底备份在 `final/public/banners/_pre-text/`(重烤从备份起,免费)。
2. **Logo 不做图层叠加、不做叠版**;A03 叠版文件保留,不用。
3. 手机版横幅按 B02 = 单独重构图(Nano Banana,3:2,主体居中、上 40% 留暗);不做桌面硬裁(原站硬裁丢 70% 宽度)。裁切对比版可按需免费补出。

## 进度(都存于 IMGFile\raw)
- 品牌组 A01–A05 → `081-s1/s2`(s1=正确版)…`085-s1` ✅
- P1 首页轮播:B01 桌面 `001-s1/s2`–`005-s1/s2` ✅;B02 手机 `006-s2`–`010-s2` ✅
- 2026-10-18:003/008 出现复制概念牛仔脸 → 重出 `-v2`(无牛仔),**正式名已归位为无牛仔版**;牛仔版保留在 `raw\_alt-cowboy\`。
- 2026-10-18:B01/B02 十张成品已烤英文文字(`bake-text.py`);第 3 张(home-3 desktop+mobile)用户选定**牛仔版**并已烤字归位,无牛仔带字版归档 `final/public/banners/_alt-nocowboy/`。站点侧 17:28 已把 home-3 桌面换成**干净牛仔终版**(`_pre-text`,c79a6549;旧站内 1dde1c9b 作废,提交 `0195964`);首页横幅站点侧一律干净版 + 网页文字层。
- postprocess.mjs 已由另一会话升级:支持 `IMGFile\raw` + `--site`(复制进 `..\site\public\`);待办:P2+ 的 order、成品入库。

## C01/C02 分页横幅(2026-10-18 完成)
- C01 桌面 = order 011–022(A 21:9 xhigh + B 4:1 2K)→ `final/public/banners/pages/<page>-desktop.webp`(1920×473)。
- C02 手机 = order 023–034(仅 B 5:4 2K,输入 = 对应桌面 `raw/<011–022>-s2.png`,干净无字)→ `…-mobile.webp`(686×590)。
- 烤字(用户新要求,`bake-text.py --pages --orders 011,…,034`):**只烤页面标题**(Rye 金渐变),不含副标题/Play Now;桌面=左 69px(y 垂直居中,62px);手机=顶部居中(y=32px,88px);干净底备份 `final/public/banners/pages/_pre-text/`。
- 页面标题(英文):Slots / Live Casino / Sports / Esports / Fast Game / 4D Lottery / Number Game / Prediction / Ranking Board / Achievements / Ticket Center / Update。
- gen-orders.py 增强:手机 B 步骤按「桌面版成图」文件名映射回桌面 order(023→011 … 034→022);bake-text.py 新增 `--pages` 模式与分页总览。
- 本批花费:$0.967×2(桌面 A+B)+ $0.608×2(手机 B)≈ $3.15。
- **已入库(2026-10-18)**:24 张烤字版 → `site/public/banners/pages/`(新目录);B03 `download-app.webp` → `site/public/home/`。手工复制,未用 `--site`(避免把 `_pre-text/` 带进去);首页 10 张干净横幅未动。接线(页面占位换 `<img>`)已完成:`58127c8`(12 页横幅)+ `9ec03be`(下载区),18:05 验证 12/12 页实载 1920×473。**已提交 git(17:28)**:pages `c6c025a`、home `c7792a3`;3200 预览逐文件字节校验 43/43。

## C01/C02 重出 v2(2026-10-18 晚,用户圈图后)
- 用户反馈 v1:拼贴感(道具堆叠)、左侧/顶部空板、拼接缝、只有一个牛仔太单调。用户圈了 prediction/sports 手机(空板)与 ticket-center 手机(竖缝),并说 V1 测试(无参考图)最顺眼。
- 新配方(V1/M2):**A/B 都不给风格参考图**(`ref-hero` 里同姿势牛仔会被搬运);场景=单一主体一行写清;统一加"禁止拼贴/道具堆叠/空板/直线边界/接缝;左(上)暗区必须是画面自身内容且有纹理"。
- 配角:先出设定图 `raw/901-s1.png`(女荷官)、`raw/902-s1.png`(女服务员,均**背身+手部细节**,避免真人照片/明星脸);livecasino、ticket-center 引用设定图保证一致。旧设定图在 `raw\_char-v1\` `_char-v2\`。
- 提示词文件:`COPY-PROMPTS/P2-v2.md`(12 页专属 + 2 张设定图),存为名/order 与原版一致。手机 B 输入用 `上传 raw/011-s2.png(桌面版成图)` 语法(gen-orders 已支持)。
- 旧版归档:`raw\_v1-archive\`(36 张 raw)、`raw\_test-direction\`(测试 9 张)、`final\...\pages\_v1-archive\clean|baked\`。site/public 里仍是 v1 烤字版,等用户看 v2 通过后替换。
- 烤字升级:`bake-text.py --pages` 现带**柔和渐变蒙版**(桌面横向 0.74/74%、手机纵向 0.55/45%),字融进画面;干净底仍备份 `pages\_pre-text\`。
- QA 工具:`python gen/qa-banners.py <文件…> [--kind desktop|mobile]`(标题区方差=空板筛查;竖缝筛查为提示,最终靠目视)。
- 本次花费:测试 $0.75 + 设定图 3 轮 $0.35 + 桌面 $1.72 + 手机 $1.22 ≈ $4.05。
- 总览:`_scratch\pages-desktop-preview.png`、`pages-mobile-preview.png`;测试对比 `_scratch\test-compare.png`。
- **v2 已入库(2026-10-18 16:18,用户确认)**:24 张覆盖 `site/public/banners/pages/`;覆盖前逐张 md5 核对站内 v1 = `_v1-archive\baked\`(24/24 一致,零丢失),复制后逐张校验通过 24/24。v2 干净底在 `pages\_pre-text\`(未入站)。
- **livecasino 桌面版 v3(2026-10-18 16:24,用户要求"和手机版一样的快照")**:以手机版成图 `raw\024-s2.png` 为母本扩成 4:1(测试号 924 → 定稿为 `raw\012-s2.png`),重出成品并入库。旧 v2 桌面 raw 归档 `raw\_v2-archive\`、旧干净底 `pages\_v2-archive\livecasino-desktop-clean.webp`(免费可重烤)。提示词见 `COPY-PROMPTS\TEST-livecasino-desktop.md`。

## D01 促销卡(2026-10-18,8 张已入库)
- 规格:order 035–042,`promos/<slug>.webp` 820×770(站点列表卡 + 详情横幅通用,显示 ≈410×385 = ½ 缩放);`manifest.json` 已有条目(route=single)。
- 提示词:`COPY-PROMPTS/P3-v2-D01.md`(A Sunburst 1:1 xhigh + B Nano 1:1 2K 复刻;V1 配方无风格参考图;下 1/3 = 场景自身暗部留给标题)。
- 人物(用户新指示 2026-10-18:可正面照):新出正面设定图 `raw/903-s1.png`(女荷官)/`904-s1.png`(女服务员);035 宝箱+女服务员、038 女荷官发牌、042 女服务员捧礼盒、041 两位原创客人;其余 4 张物件。旧背身 901/902 保留。
- 烤字:用户先否"太敷衍/名字太细看不清",实验 3 版后选定 **E 金色缎带**(名字=金渐变缎带+深色 Rye 字,数字=金渐变+描边+发光);`bake-text.py --promos --orders 035,…`(vb 蒙版 0.62/45%);独立文字层 `promos/_layers/<slug>-text.png`,干净底 `promos/_pre-text/`;实验脚本 `_scratch/text-variants.py`。
- QA:8 张干净底 + 烤字版全部 OK(`qa-banners.py --kind promo`);体积 118–151KB(上限 200KB)。
- 已知小瑕疵(待用户定夺是否重出,每张 ~$0.2):slots-rebate 转轴显示"777";daily-reload 铜灯上有像字母的纹章。
- 花费:设定图 $0.118 + 038 试做 $0.207 + 余 7 张 $1.398 ≈ $1.72。总览 `_scratch/promos-preview.png`。
- **已入库(2026-10-18 17:28,用户审过)**:8 张复制 → `site/public/promos/`(逐张 md5 校验一致,提交 `5d099a2`);接线已完成(列表卡 + 详情横幅,`3acee4f`)。

## E 组 + G01 入口四卡(2026-10-18,32 张已入库)
- 范围:E01–E08(order 049–056 + 061–080,28 张)+ **G01 入口四卡(057–060,用户「G01 一起出」)**。规格见 `assets.csv`;`manifest.json` 条目原已就绪(透明 20 + 不透明 12)。
- 提示词:`COPY-PROMPTS/P4-v2-E.md`(32 张全套)。配方:透明物件 1:1 xhigh `背景透明` 单步 A(setline 写「背景透明」,gen-orders 直传 background=transparent);**同族锚点+参考图链**(061→062–065 徽章、066→067–070 金币、071→072–075 票券、077→078–080 权益图标;参考图在解析时须已存在,故分批跑);卡片横幅 049–053 单步 A(3:2/21:9);**E06 手机 054–056 = B 2K 4:5 从桌面 raw 竖构重构**(setline 直写「上传 raw/051-s1.png」)。G01:21:9,附 `ref/ref-entry-cards.png`(概念图四卡),提示词禁复刻界面文字;**060 按概念图保留「SHERIFF」刻字**(唯一允许文字)。
- 文字策略:除 060 刻字外全「无」→ **本批不烤字**;等级名/状态文字由站点 HTML 显示。
- QA:`qa-banners.py` 新增 `--kind icon`(透明图:四角 alpha / 主体 bbox / 触边 / 晕圈 faint%);卡片横幅跑 `--kind auto`。32 张 31 通过;`event-ended-desktop` 的「疑似竖缝」目检为误报(木柱/海报直边);**049 bg-prize 超体积(244KB)已从 raw 同构图重压至 97KB(规格 ≤100KB)**;入口四卡 24–33KB(规格 ≤80KB)。
- 花费:$0.43(试做 5)+ $1.93(余 23)+ $0.41(尾 4)≈ **$2.77**。总览 `_scratch/e-preview-all.png` / `e-preview-all.html`。
- **已入库(2026-10-18,用户审过)**:32 张 → `site/public/{vip,achievement,prediction,tickets,ranking,home}/`;逐张 md5 32/32 一致;提交 `5e7cf1a`(只提交本轮文件;入库前站点仓库 staged=0,未动他人变更)。
- 接线(留站点会话):VIP 徽章/权益图标(Icon→img)、成就金币、票券插图、排行榜背景(`.rb-prize-panel`/`.rb-personal` 换背景图)、预测头图(3 状态×桌面/手机)、首页入口卡(**卡高 70→95px**)。注意:E02/E08 三个目标为 `.svg` 的文件按先例实际交付 `.png`。

## F01 注册插图(2026-10-18,已入库)
- order 089,`public/auth/register-side.webp` 856×1314(规格 ≤150KB,从 raw 重压后 126KB);提示词 `COPY-PROMPTS/P6-v2-FG.md`(v2:单步 A · 2:3 · xhigh,无参考图)。
- 构图:夜酒馆半截摆门、暖光溢出、门内牛仔剪影、右上提灯;底部地板自然渐隐(给注册表单压边)。QA OK;花费 $0.076。
- **已入库**:`site/public/auth/`(新目录,md5 一致,提交 `cd33873`);接线(注册页左侧大图)留站点会话。
## G 组 32 张(2026-10-18,已入库)
- 范围:086、087、090–119(32 张;089=F01 另单,**088 `home/download-app.webp` 早在 B03 已入站,不重出**)。规格见 `assets.csv`。
- 提示词:`COPY-PROMPTS/P6-v2-FG.md`(F01+G 全套 v2)。配方:场景 10 张单步 A;透明字形/徽章/插画 13 张 = 1:1 `背景透明` 单步 A;头像 8 张 1:1 xhigh **无参考图**(8 个不同的人,防换脸)。**同族锚点参考图链**:099→100/112–119、101→102/103、104→105–111;参考图解析时须已存在 → 三批跑(run1 锚点 14 张 → run2a 10 + run2b 8 并行)。
- 翻车与修复:① **100 火焰 5:4 报 400**——Sunburst `aspect_ratio` 只收 1:1/3:2/2:3/4:3/3:4/16:9/9:16/21:9/auto,改 1:1 成功;② **086 吉祥物透明 PNG 811KB 超 400KB 上限** → PNG8(`quantize(256, FASTOCTREE)`+optimize)=142KB,肉眼无差(替换成品;**raw 未动;日后若重跑 postprocess 086 会再出大版本,需重压**)。
- QA:透明 11 张 `--kind icon` 全 OK(fire bbox 39% 为细长形状已目检);海报/卡底 10 张 `--kind auto` 全 OK;087/093 单独放大复核。总览 `_scratch/g-preview.png` / `g-preview.html`(标签字体 msyh.ttc)。
- 花费:锚点 ≈$1.1 + 跟随 ≈$1.5 ≈ **$2.6**。
- **已入库(2026-10-18 19:15,用户「OK」审过)**:32 张 → `site/public/{home,games,illus,avatar,modal,footer,deposit}/`(后六个为新目录;home 只加 mascot/popup);md5 32/32 一致;提交 `e52a14f`(入库前 staged=0,只提交本轮文件)。**3200 预览需重建+重启才能见到新图**(2026-10-18 晚已重建:BUILD 20:15、152/152 文件实测 200;`next start` 启动时枚举 public,补图后必须重启)。
- 接线(留站点会话):首页吉祥物/弹窗;Slots 页 `games/card-bg.webp`(场馆/游戏卡底)、`hot-1..8.webp`(HOT GAMES 横滑栏海报)、`hotgames-title.webp`+`fire.webp`(该栏标题板+火焰);`illus/*` 空状态;`avatar/avatar-1..8`;`modal/status-*`;`footer/badge-*.png`、`deposit/method-*.png`(.svg 目标按先例实交 .png)。
- **接线现状(2026-10-18 晚实测)**:providers/E 组/G 组/H 在 `site/` 代码里**零引用**(rg 全扫 app/components/config/lib/mocks),页面上看不到属预期;已接线且 3200 实测可见:促销卡、12 页分页横幅、首页横幅、下载区。3000(19:51 实例)接线与 3200 一致。
- 附:克隆站 provider 名单 = `site/config/providers.ts` 的 **28 家**(`GAME_PROVIDER_IDS`;原站面板约 43 家)。provider 名牌(白字金边 320×96)已做并**入库 `site/public/providers/`×28(2026-10-18 晚,提交 `e639473`)**;接线留站点会话(`ProviderCardGrid.tsx`/`ProviderRail.tsx` 换 `<img>`)。

## H 组(H02 规则图 + H06 分享弹窗,6 张已入库)
- 范围:133–136 规则图(`rules/main-en|mini-en|nba-mini-en|nba-mini-mobile-en.webp`)+ 149 `modal/angpao.webp` / 150 `modal/ticket-share.webp`;提示词 `COPY-PROMPTS/P7-v2-H.md`;规则图 = AI 空面板艺术底 + `bake-rules.py` 本地烤英文字(不写 FIFA/NBA)。
- **已入库(2026-10-18 晚,提交 `e639473`)**:`site/public/{rules,modal}/`;接线留站点会话(预测规则入口 + 分享弹窗图)。

## 全站接线完成(2026-10-18 晚,`714da54` + `1023783`)
- 已接:providers 名牌(home 轨条 145×48 / slots 轨条 176×55 / 场馆卡底=`card-bg.webp`)、游戏卡海报 `hot-1..8`(按 `game.id` 循环,替代色块)、存款方法图标 `method-*`(bank/qr/gateway)、票券 `ticket-main`/`ticket-arrow`(两处按钮)/`ticket-prediction|number-event`(事件卡)、状态弹窗(`status-*` 三种变体 success/error/alert)、H02 规则图(预测卡 RulesButton → main|mini,NBA 用 nba-mini 对)、VIP 五级徽章(track+矩阵)+`priv-*` 权益图标、成就 `coin-1..5`、排行榜背景(`bg-prize`/`bg-rank`)、预测状态头图(`?status=` 切 hero)、首页入口卡(艺术底,卡高 95px,`mobile.spec` 断言同步改)、注册页 `register-side`、品牌(`logo.png` 页头/侧栏/页脚/移动挂标,favicon=`app/icon.png`(icon.svg 退役),`og.jpg` 进 seo openGraph/twitter)。
- 验证:typecheck 0、build 0;3200(预览拷贝)/3000 均已换新构建;9 张 1280/375 截图 `site/_scratch/shots-wire/` 目检通过。
- 场馆卡说明:live casino/sports/esports 的"俱乐部"(Evolution Asia 等 13+2+6)没有名牌文件 → 回落白字名(底=card-bg);其 logo = 拉图清单 §2 的 21 张,拉回后按 `/providers/<名>.webp` 放好即可无缝替换。
- 仍未接(无挂点或待拉):`mascot.png` / `popup.webp` / `angpao.webp` / `ticket-share.webp` / `hotgames-title.webp` / `fire.webp` / `icon-prize.webp` / `footer/badge-*` / 商店徽章(不拉) / 银行列表 logo(待登录拉) / 页面标题小图标+4D logo+奖杯(拉图清单)。

## 账户摘要两处补图(2026-10-18 晚,`0a1aa01`)
- 用户截图点名 `/my/account/profile` 两处缺图,均已接线:① `AccountShell` 头像位(`account-menu__profile-avatar`)person 图标 → `/avatar/avatar-N.webp`;② 摘要卡 VIP 勋章(`account-summary__level-icon`,clone CSS 早有 42px 规则)= `/vip/level-N-name.webp`,按 `profile.vipTier` 从 `getVipLevels()` 匹配。
- 新增 `site/lib/avatar.ts` `avatarSrc(username)`:用户名 hash → 8 张头像;`ProfilePanel` hero 头像同源(壳与 hero 同脸)。原站实证:crawl 页 `<img class=account-menu__profile-avatar src=/static/images/avatar/nba-players/1.png>`、crawl/js `account-summary__level-icon` + `icon-vip-level-<badge>.svg`。
- 验证:typecheck/build 绿;3200/3000 重建;1280/375 截图出图(`site/_scratch/shots-profile/`)。

## 原站直拉入库(2026-10-18 晚,`8a27cf8`,586 张,只进图片)
- 4D 7(`public/4d/`)、页面图标 14(`public/icons/`)、俱乐部 19(`public/providers/<显示名>.webp`)、Slots 厂商卡 8(`public/providers/slots/`)、游戏封面 533(`public/games/`)、银行 5(`public/banks/`:maybank/rhb/affin/tng/duitnow)。
- 封面模板 = `cdv2defn…/games/v<N>/`(按厂商,jili 走 godeftmc029ak 代管)+ img 值;缺口(原站无文件):cimb/public/grabpay/fpx 银行图标 + aviatrix 5 封面。详见 `PULL-LIST.md` 执行记录。
- 工具:`site/_scratch/pull/pull.mjs`(断点续跑+校验);拉取门禁:无 UA=403、staging-ecl 未知路径回 652B 假 HTML。

## 原站直拉图接线(2026-10-18 晚,`e4299cb`)
- 俱乐部 logo 19 → `ProviderCardGrid` 场馆卡(`CLUB_LOGOS` 白名单;`BRAND Sports` 唯一无图留白字);4D logo 7 → `LotteryResultCards` 卡头;页面标题图标 10 处(3 分类页 / slots / fast-game / 4D / promotion 列表+详情 / update 列表+详情)→ `/icons/icon-*.svg`(占位 `tone` prop 删除);榜单 `rb-trophy` → `/prediction/icon-prize.webp`;银行 → `lib/banks.ts` `BANK_LOGOS`(maybank/rhb/tng/duitnow 出图;cimb/public/grabpay/fpx 原站无图留色块;affin 图在但无数据条目引用)。
- 验证:typecheck/build 0;3200(site-preview 重建)/3000 新构建;9 张 1280+375 截图 `site/_scratch/shots-wire2/` 目检全过(俱乐部 13+6、4D 7、标题图标、金杯、银行图标全出图)。
- **Prediction 图位置备忘**(用户问「找不到图片」):默认 hero(All / Active & Upcoming,酒馆)= `public/banners/pages/prediction-desktop|mobile.webp`;状态 tab hero = `public/prediction/event-{in-progress,upcoming,ended}-{desktop,mobile}.webp`(点 Active/Upcoming/Ended 切换,已实证生效);`public/prediction/icon-prize.webp` = 榜单奖杯位。
- Slots 厂商卡 8 张(`providers/slots/*.jpg` = 原站首页 `gamelist-home-card` 族)仍未接:首页轨条现用 28 家名牌,挂点待定。

## 参考
- 清单:`ecl-site\Design\Image Plan\assets.csv`(浏览器看 `assets-view.html`);机器可读 `ECL Design IMG\prompts.csv`;复制版 `COPY-PROMPTS\P*.md`。
- **原站拉图清单**:`ECL Design IMG\PULL-LIST.md`(2026-10-18 立;原站直拉 ≈600 张:封面 545(每厂商末尾 20)+ 轨条 21 + 厂商卡 8 + 4D 7 + 页面图标 10;**带「ECL」字眼的 Provider/游戏不拉**(ECL Sports = `bti.webp`;ECL 品牌游戏 `vs20olympecl` 等);另不拉:下载徽章 / 赞助页 / Gateway(改简笔)/ 聊天素材;银行待用户登录后拉;待指令开拉)。
- 风格锚点:`00-concept-home.png`、`ref\` 裁图;站点字体与标题文案在 `Clone web ECL\site`(如 `site\mocks\banners.json` 的 "Welcome bonus up to 188%")。
