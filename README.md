# AI4S Lab · Interactive Project Showcase

从项目中抽离的独立面试演示：数据观测、回归评测、数字孪生、载具路径与分析工作流。所有数据均为固定种子或规则生成的合成数据，不依赖原项目、私有数据库或真实生产参数。

**公开演示：** https://fiftyfive515.github.io/ai4s-lab/

**直接打开监控：** https://fiftyfive515.github.io/ai4s-lab/#realtime

建议体验顺序：实时监控 → 模型评测 → 实验沙盒，约三分钟。

## 本次调整

- 实时监控直接沿用提供的 TBC HTML：完整七节点拓扑、效率趋势、膜厚与方阻图表、玻璃切角面板、扫描线和异常追溯。页面以 iframe 隔离原样式，依赖均已打包到本地；连续追溯时的原始图标选择错误已修复。
- 首页增加推荐体验路线与免登录访客标识，统一卡片间距、文字层级、键盘焦点与手机布局。
- 设备插图使用 WebP，四张合计约 127 KB。
- 静态发布采用文件白名单，公开部署中不包含站主页面、统计数据库、口令和本机配置。

## 运行范围

模型评测在浏览器中实际拟合线性回归、kNN 和训练均值基线，使用 32 条训练样本和 16 条留出样本。沙盒为独立空间响应公式；分析助手为本地规则，工作流为固定编排，未调用外部大模型。全部指标只代表合成实验。

## GitHub Pages

推送 main 后由 `.github/workflows/pages.yml` 构建并发布 `public-site/`。子路径资源均使用相对地址，可通过邮件链接直接浏览。

GitHub 公开站点已接入站主提供的 Web Analytics 代码；本机预览与其他域名不会触发此代码。逐条自建记录仍仅在本机启用。GitHub Pages 仅运行静态页面，无法直接运行 Python/SQLite；本机后台在没有公网 HTTPS 接口时也无法接收公开网站的访问。请勿将后台口令放进前端或 GitHub 变量。

若以后部署独立统计服务，只需将其 HTTPS 事件接口设为仓库变量 `ANALYTICS_ENDPOINT` 并重新运行发布流程。事件接收端必须配置允许的站点来源，并对统计读取执行身份认证。

## 本机完整版本

需要 Python 3.9+，不依赖第三方库：

```sh
python3 serve.py --port 8097
```

公开页面为 `http://127.0.0.1:8097/`。本机站主入口为 `http://127.0.0.1:8097/owner`，不会出现在访客页面。首次运行生成 `.runtime/owner-key.txt`，站主在本机读取口令后登录。访问数据库为 `.runtime/visits.sqlite3`，两者均被 Git 忽略。

后台仅记录页面、时间、标签页内随机会话标识、屏幕大类、来源域名，保留 30 天；不保存 IP、设备指纹或完整浏览器标识。会话数不代表真实独立人数。口令保护、签名 HttpOnly Cookie、同源校验、输入验证与登录限流由服务端执行。

## Docker 备选

```sh
docker compose up -d --build
docker compose exec lab cat /data/owner-key.txt
```

打开 `http://localhost:8089/`，站主入口为 `/owner`。数据库与自动生成的口令保存在持久化卷中。电脑停机时本机服务不可访问；要公网开放，还需配置 HTTPS、反向代理和 `ATLAS_PUBLIC_ORIGIN`。本次未启用 Docker 部署。

## 预备的在线统计服务

`service/` 包含尚未部署的 Cloudflare Worker + D1 方案，可作为以后接入在线统计的起点。没有账户或线上服务被创建。`OWNER_KEY` 必须作为服务端 secret 配置，D1 的 ID 需创建后替换；本次公开演示没有启用此服务。

## 检查

```sh
python3 checks/test_access.py
python3 tools/build_site.py
```

权限检查覆盖：访客隔离、口令和数据库文件不可读取、同源提交、输入验证、事件去重、站主会话和登录限流。浏览器检查覆盖十个模块路由、390px 手机布局、监控联动、搜索、模型切换、沙盒推演和助手。

实时监控保留原版大屏布局；手机可横向滑动查看完整看板。直接打开 `tbc.html` 可查看独立原版页面。

## Cloudflare Web Analytics

正式分享地址：https://fiftyfive515.github.io/ai4s-lab/#overview

统计已接入站主提供的 Cloudflare Web Analytics 代码，并验证后台收到 GitHub 页面访问数据。代码仅在上述 HTTPS 主机及 `/ai4s-lab/` 路径加载一次，本机预览及其他部署域名不加载。

站主登录 https://dash.cloudflare.com/?to=/:account/web-analytics ，选择 `fiftyfive515.github.io`，可查看 Page views、Visits、来源、国家、设备与浏览器等汇总。Visits 是统计服务定义的访问次数，不等同于真实独立人数。现有数据包含检查期间的测试访问。

公开页面没有统计入口、公开计数或统计读取接口。公开 token 用于上报，不授予查询统计的权限。站主页面、口令和数据库均不包含在静态发布包中；本机统计接口另要求签名站主会话。

## 面向研究评阅的版本（v8）

- 清除 emoji 与装饰性字符图标，改为统一的单色 SVG 控件图标。
- 首页以 AI Research Lab 为标题，文字说明研究对象、数据、方法与评估范围；各模块统一使用数据与特征、参数实验、分析工作流、关联分析等名称。
- 问数助手标题为 AI agent，小字说明为“分析辅助与结果查询”，并明确当前采用本地规则。
- 公开构建和上传包不包含 owner 页面、站主脚本、口令、访问数据库或统计读取接口。Cloudflare 公开 token 仅用于上报，统计数据在登录后的 Cloudflare 账户后台读取。
- 本机统计读取仍要求签名站主会话；权限边界可用 `python3 checks/test_public_boundary.py` 检查。

公开界面已移除浏览器执行、目录隔离、固定随机种子、脚本编排等构建说明；保留变量定义、模型方法、留出集评估和实验结果。数据性质统一在研究说明中简要说明。
