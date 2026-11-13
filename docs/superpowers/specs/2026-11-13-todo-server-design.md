# TodoList 服务端设计

日期：2026-11-13
状态：已获用户批准

## 背景与目标

工作区 `134_orca/` 下：`UI/` 为 Vite + React TodoList 前端（内存状态、无持久化），本仓库 `server/` 当前误存了一份前端副本。目标：将本仓库重整为纯后端 REST API，为前端提供持久化的待办数据服务。

## 已确认决策

| 决策项 | 结果 |
|---|---|
| 仓库定位 | `server/` 纯后端；前端留在 `UI/`，后续改造不在本次范围 |
| 技术栈 | Node.js + Express |
| 持久化 | SQLite（better-sqlite3） |
| 接口范围 | 对齐前端功能：列表(筛选)/新增/改完成态/改文本/删除 |
| 语言 | JavaScript ESM（与前端一致，无编译步骤） |
| 测试 | vitest + supertest 接口测试 |
| 分层 | 经典三层：routes → services → db(dao) |

## API 契约

前缀 `/api/todos`，`todo` 形状：`{ id, text, done }`（`done` 布尔）。剩余计数由前端用列表自算，不加专门接口。

| 方法 | 路径 | 入参 | 出参 | 说明 |
|---|---|---|---|---|
| GET | `/api/todos` | `?filter=all\|active\|done` | `200 [todo...]` | 列表，按 id 升序，filter 可选默认 all |
| POST | `/api/todos` | `{ text }` | `201 todo` | 新增 |
| PATCH | `/api/todos/:id` | `{ text?, done? }` | `200 todo` | 改完成态/改文本，一个接口两用 |
| DELETE | `/api/todos/:id` | — | `204` | 删除 |

## 目录结构

```
server/
├── src/
│   ├── server.js               # 入口：开库、监听端口（默认 3001）
│   ├── app.js                  # createApp(db)：组装中间件+路由，测试复用
│   ├── routes/todos.js         # 路由：参数校验、调 service、错误 next()
│   ├── services/todoService.js # 业务：trim、filter 归一化、组合 dao
│   └── db/
│       ├── database.js         # openDatabase(path|:memory:)：连接+建表
│       └── todoDao.js          # SQL 增删改查，done 0/1 ↔ 布尔互转
├── test/todos.test.js          # vitest + supertest
├── data/                       # todos.db 落盘目录（gitignore）
└── package.json
```

旧前端文件（`index.html`、`src/` 旧内容、`vite.config.js`）从本仓库删除，git 历史留档。

## 数据流与依赖注入

请求 → routes（校验）→ service（业务）→ dao（SQL）→ 原路返回。

`createApp(db)` 接收数据库实例：生产用文件库 `data/todos.db`，测试用 `:memory:`，互不污染。

表结构：

```sql
CREATE TABLE IF NOT EXISTS todos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  text       TEXT NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

`created_at` 仅落库不返回，作为教学演示默认值写法保留。

## 错误处理

校验规则：
- `text`：trim 后非空、≤200 字
- `done`：必须布尔
- `filter`：∈ { all, active, done }，缺省 all
- `:id`：正整数
- PATCH 至少含 `text` / `done` 之一，空对象 `{}` → 400
- 请求体中的未知字段一律忽略（POST 传 `done` 不生效，始终新建为未完成）

错误响应统一 `{ error: "原因" }`：
- `400`：参数不合法 / JSON 解析失败 / 非法 filter
- `404`：id 不存在、未知路由
- 统一错误中间件兜底，route 内只 `next(err)`

启用 `cors`（UI 开发服务器 5173 直连 3001 需要）。

## 测试与脚本

- 运行依赖：`express`、`better-sqlite3`、`cors`
- 开发依赖：`vitest`、`supertest`
- 脚本：`dev` = `node --watch src/server.js`（Node 原生热重载，免 nodemon）；`start` = `node src/server.js`；`test` = `vitest run`
- 测试用例覆盖：
  - 新增：正常 201；空文本 400；纯空白 400；超 200 字 400
  - 列表：全量；active / done 筛选结果正确；非法 filter 400
  - 修改：改 done；改 text；两者同传；空对象 400；不存在 404；done 传非布尔 400
  - 删除：204 且列表确少一项；再删同 id 404
  - 通用：未知路由 404；非法 JSON 400；响应体形状（done 为布尔）

## 验收标准

1. `npm test` 全绿
2. `npm run dev` 启动后，curl 四接口行为符合契约
3. 重启服务数据不丢（文件库生效）
4. 本仓库不含前端文件；`git status` 干净
