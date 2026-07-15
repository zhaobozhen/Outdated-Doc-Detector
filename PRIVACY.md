# Privacy

Outdated Docs processes documentation freshness locally in the browser.

- It reads the current supported documentation page and fetches that page’s declared English original.
- It stores one display preference in Chrome synchronized storage: whether to show the in-page notice.
- It keeps the latest analysis result in Chrome session storage for the current tab and removes it on navigation or when the tab closes.
- It does not collect, upload, sell, or share browsing history, document content, identifiers, or usage data.
- It has no account system, analytics, telemetry, backend service, or remotely hosted executable code.

Network requests are limited to the supported documentation hosts declared in the extension manifest. If a page or network response does not provide a reliable comparable timestamp, the extension reports that it cannot determine freshness rather than guessing.

## 隐私说明

Outdated Docs 在浏览器本地完成文档时效检测。

- 扩展只读取当前受支持的文档页面，并请求该页面声明的英文原版。
- 扩展仅在 Chrome 同步存储中保存一个显示设置：是否显示页内提醒。
- 当前标签页的最近一次检测结果保存在 Chrome 会话存储中，并在页面导航或标签页关闭后删除。
- 扩展不会收集、上传、出售或共享浏览历史、文档内容、身份标识或使用数据。
- 扩展不包含账号、分析、遥测、后端服务或远程托管的可执行代码。

网络请求仅限扩展清单中声明的受支持文档域名。若页面或网络响应没有提供可靠且可比较的更新时间，扩展会显示“无法判断”，不会猜测。
