2026-10-16｜T42b 注册创建 mock 账号并可登录｜完成：注册写入 mock 会员库（lib/mock-auth/accounts.ts，scrypt 哈希，.mock-data/users.json 持久化），注册即登录并跳首页，登录支持用户名/邮箱/手机+OTP 123456
钱包按账号分 key（walletService.bindAccount）：新账号所有钱包为 0，预设账号仍为 seed；切换账号时在途请求不落到新账号
Set-Cookie：http 不带 Secure，x-forwarded-proto=https 才带（实现已在 main，本次补测试 tests/unit/session-cookie.test.ts）
验证：tsc 通过；unit 100/100；生产构建通过；e2e 297/309（新增 register-account 7/7）
基线对比：visual 9 项与 member-flow 桌面端在 main 上同样失败，不是本次引入
未覆盖：seo 用例写死 localhost:3000（环境）；member-flow 移动端偶发 /favicon.ico 404（仓库无该文件）
未做：注册页目视截图对照（只改了逻辑，版式未动）；ecl-site/TASKS_P3.md 勾选未改（不在 site-fix 内）
