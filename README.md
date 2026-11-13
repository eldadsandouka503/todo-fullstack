# TodoList 全栈应用

前后端一体仓库：`client/` 是 Vite + React 界面，根目录是 Express + SQLite 的 REST API（三层结构 routes → services → db）。

## 启动（需要两个终端）

```bash
# 终端 1：启动服务端（http://localhost:3001）
npm install
npm run dev

# 终端 2：启动前端（http://localhost:5173，自动把 /api 代理到 3001）
cd client
npm install
npm run dev
```

浏览器打开前端地址即可使用。数据落盘在 `data/todos.db`，重启不丢。

## API

前缀 `/api/todos`，请求/响应均为 JSON。`todo` 形状：`{ id, text, done }`。

| 方法 | 路径 | 入参 | 成功响应 | 说明 |
|---|---|---|---|---|
| GET | `/api/todos` | `?filter=all\|active\|done` | `200 [todo]` | 列表，id 升序 |
| POST | `/api/todos` | `{ text }` | `201 todo` | 新增；text trim 后非空、≤200 字 |
| PATCH | `/api/todos/:id` | `{ text?, done? }` | `200 todo` | 至少其一；done 必须布尔 |
| DELETE | `/api/todos/:id` | — | `204` | 删除 |

错误统一 `{ "error": "原因" }`：400 参数不合法 / 非法 JSON；404 资源或路由不存在。

## 测试

```bash
npm test        # vitest 全量（dao / service / api 三层）
```

## 结构

```
client/                 # 前端（Vite + React，TodoList.jsx 调 /api）
└── src/
src/                    # 服务端
├── server.js            # 入口：开库、监听端口
├── app.js               # createApp(db)：中间件 + 路由组装
├── errors.js            # HttpError
├── routes/todos.js      # HTTP 参数校验
├── services/todoService.js  # 业务规则
└── db/                  # SQLite 连接 + todoDao
```
