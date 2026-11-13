# TodoList 服务端

TodoList 的后端 REST API：Express + better-sqlite3，三层结构（routes → services → db）。

## 启动

```bash
npm install
npm run dev     # 开发模式（文件改动自动重启，Node 原生 --watch）
npm start       # 生产启动
```

默认端口 3001，可用环境变量 `PORT` 覆盖。数据落盘在 `data/todos.db`。

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
src/
├── server.js            # 入口：开库、监听端口
├── app.js               # createApp(db)：中间件 + 路由组装
├── errors.js            # HttpError
├── routes/todos.js      # HTTP 参数校验
├── services/todoService.js  # 业务规则
└── db/                  # SQLite 连接 + todoDao
```
