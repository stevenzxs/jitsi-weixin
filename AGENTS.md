# CloudMeet H5

- 遵守 D:/knowledgebase/standards/project-delivery.md 1.6 和唯一审计台账；任务分支修改、测试、提交推送合 main 后核验清理。
- 本目录为原创 H5 产品源码；config/ 是独立配置 Git 库并被本库忽略，Actions、安装入口和部署 Skill 只在那里维护。
- 不修改兄弟项目、不默认 SSH/部署、不绕过 TLS、权限或会议准入；不得在浏览器嵌入签名密钥。
- 测试 `npm test`；开发 `npm run dev`，只监听回环地址。无产品打包命令，原生静态文件由配置库 Actions 打包。
- 真实手机和服务器验收与本地替身测试分开报告。不能通过网页可靠证明系统信任链或微信兼容性。
