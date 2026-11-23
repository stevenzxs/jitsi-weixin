# 云会议 · 微信/企业微信 H5

独立原创静态网页，访客通过链接加入既有 Jitsi 会议，无需安装 CloudMeet。兼容性须逐台真机验收；不承诺所有微信/企业微信版本内置浏览器均支持。

## 本地运行

需要 Node.js 22+，没有第三方依赖。

```powershell
npm ci
npm test
Copy-Item runtime-config.example.json runtime-config.json
npm run dev
```

打开 `http://127.0.0.1:4173/?room=855851964&subject=我的会议`。此服务只允许回环访问，不用于生产。页面本身不在初始化时加载 Jitsi 或请求设备权限；点击加入后加载管理员配置的 Jitsi API 并进入 Jitsi 准备页。示例 IP 不代表可信证书或实际入会已通过。

## 运行配置

`runtime-config.json` 必须由管理员提供，形如 `{"jitsiOrigin":"https://118.193.36.35:8443"}`。不能从邀请 URL 指定第三方服务地址，不含秘密。Jitsi API 为可信执行代码，应只配置自有受控服务。推荐把网页和 Jitsi 放在同一公开可信 origin，网页部署在独立路径（如 `/cm/h5/`），Jitsi 保持原路径；查询格式兼容 room/subject，不占用既有 `/cm/invite`。

会议号严格九位且首位非零，昵称最多40字符；主题为外部显示信息，不是权限依据。默认音视频关闭，尊重原有密码/等候室/认证。当前不新增服务端访客 JWT；如实例要求认证，应由后端正式接入，不得把密钥置入网页。前端隐藏按钮不能替代后端权限。

## 交付边界

- `config/` 是被本库忽略的独立 Git 仓库，维护 Actions、运行模板和部署 Skill；不算源码库内的配置目录分离。
- 原生静态应用无需编译；本地启动和单测不是 GitHub Actions 交付验收。
- 当前仅配置库手动校验入口，不分配 rN、不发布。首次正式基线、持久修订台账及正式打包链未接通，正式发布应阻断。
- 不更换既有私有 CA、不更新现有客户端，不自动 SSH 118。公开可信 IP 证书签发、短有效期续期机制、同源路由和后端媒体需另行部署审批。

## 上线验收（未执行）

### 真实 Jitsi 准备页检查（只读、显式运行）

启动 `npm run dev` 并提供经核对的**公开根证书**文件后：

```powershell
D:/Python/python.exe tests/live-prejoin.py <public-ca.crt> <本地证据目录>
```

此测试从本地H5加载118真实API及Jitsi页面，检查准备页“加入会议”按钮、两种深链禁用配置、默认静音/关视频、信令origin及离会移除。仅抓取GET静态资源，阻断信令HTTP/WebSocket，不点击Jitsi加入，不测试会议准入或媒体。Python严格使用指定公开CA验证IP/证书，并将响应提供给隔离浏览器；不导入系统信任、不忽略TLS，但也**不证明浏览器/微信默认信任此CA**。

2026-11-23：390×844 Chromium与Android微信UA模拟两项检查通过；准备页显示正常，`/lang/countries-zh-CN.json`返回404（非本次H5代码，未修改服务器）。微信UA模拟不等于微信/企业微信真机。测试不进入默认 `npm test`，需显式授权目标只读请求，保留测试结果JSON/截图于仓库外。

### 可重复的 r13 API 隔离测试

已从118按既有CA严格TLS只读取得 r13 external_api.js，SHA256 `943c570998c20982d417297003c545d41b1016842ac652494027cc1b2ac88992`。不纳入产品源码或交付。启动本地开发服务后，在已安装 Playwright Python/Chromium 的环境执行：

```powershell
D:/Python/python.exe tests/r13-api-browser.py <external_api.js本地路径>
```

脚本拦截全部非本地请求，真实API仅用于创建iframe；验证8443房间地址、音视频授权声明、深链禁用参数和离会移除，不连接真实会议。不证明iframe内Jitsi UI、WebRTC媒体或微信兼容性。生产仍须独立路径及真机验收。

1. 外部设备严格验证完整证书链、IP SAN、有效期与自动续期；页面可信不等于 iframe/信令可信，不跳过 TLS。
2. 受控 Jitsi 固定版本关闭移动 App 强制推广，并核验该版本有效配置；现有前端 disableDeepLinking 不保证服务端生效。
3. 正确 iframe `allow`/Permissions-Policy、CSP、WSS/BOSH、JVB 公网候选及必要 TURN；不能把 HTTPS 反向代理当媒体代理。
4. Android/iOS × 微信/企业微信和系统浏览器，测试授权/拒绝/重试、音视频双向、蓝牙/听筒、锁屏/切后台、断网恢复、离会设备释放及至少三人非 P2P JVB。
5. 系统浏览器兜底需要用户操作，网页不能保证自动跳出微信；移动屏幕共享不在本版本承诺内。
