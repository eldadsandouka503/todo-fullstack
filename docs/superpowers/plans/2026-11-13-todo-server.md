# TodoList 服务端实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把本仓库从「误存的前端副本」重整为 TodoList 的纯后端 REST API（Express + SQLite，三层结构，supertest 全覆盖）。

**Architecture:** 经典三层：routes（HTTP 校验）→ services（业务规则）→ db（SQL 与行↔对象转换）。`createApp(db)` 依赖注入：生产传文件库，测试传 `:memory:`。统一错误中间件把 `HttpError` 映射为 `{ error }` 响应。

**Tech Stack:** Node.js ≥ 20、Express 5、better-sqlite3、cors；测试 vitest + supertest。全部 JavaScript ESM，无编译步骤。

## Global Constraints

- Node ≥ 20（`node --watch` 与 better-sqlite3 预编译二进制的下限）
- `"type": "module"`，全部 ESM
- API 前缀 `/api/todos`；`todo` 形状 `{ id, text, done }`，JSON 里 `done` 是布尔，SQLite 里是 0/1
- `text` trim 后非空、≤ 200 字；`filter` ∈ { all, active, done }；`:id` 正整数
- PATCH 至少含 `text`/`done` 之一；未知字段忽略；POST 的 `done` 不生效
- 错误响应统一 `{ error: "原因" }`；400 参数错 / 404 不存在；未知路由 404
- 端口默认 3001（`PORT` 环境变量可覆盖）
- 列表按 id 升序
- 规格文档：`docs/superpowers/specs/2026-11-13-todo-server-design.md`

---

### Task 1: 仓库重整——清掉前端副本，立起服务端骨架

**Files:**
- Delete: `index.html`、`vite.config.js`、`src/`（旧前端四个文件）、`package-lock.json`
- Rewrite: `package.json`
- Rewrite: `.gitignore`
- Create: `data/.gitkeep`

**Interfaces:**
- Consumes: 无
- Produces: 可安装的 ESM 骨架；`npm run dev/start/test` 三个脚本就位（后两个任务逐步填实）

- [ ] **Step 1: 确认 Node 版本**

Run: `node -v`
Expected: `v20.x.x` 或更高。低于 v20 停止执行，先升级 Node。

- [ ] **Step 2: 删除前端副本**

```powershell
git rm -r --cached . 2>$null; # 不需要，直接删文件即可，git 会跟踪
Remove-Item index.html, vite.config.js, package-lock.json -Force
Remove-Item src -Recurse -Force
```

（执行时等价命令即可，核心是这五个路径消失：`index.html`、`vite.config.js`、`package-lock.json`、`src/App.jsx`、`src/main.jsx`、`src/TodoList.jsx`、`src/TodoList.css`、`vite.config.js`——整个 `src/` 连根删。）

- [ ] **Step 3: 重写 `package.json`**

```json
{
  "name": "todo-server",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js",
    "test": "vitest run"
  }
}
```

- [ ] **Step 4: 重写 `.gitignore`**

```
node_modules/
data/
*.log
```

`data/` 整体忽略运行时数据库文件；用 `data/.gitkeep` 占位保证目录进库：

```powershell
New-Item -ItemType Directory -Force data | Out-Null
New-Item -ItemType File data\.gitkeep
```

（`.gitignore` 写 `data/` 时不忽略 `.gitkeep` 需要例外行。改为忽略具体文件更直接：）

最终 `.gitignore`：

```
node_modules/
data/*
!data/.gitkeep
*.log
```

- [ ] **Step 5: 安装依赖**

```powershell
npm install express cors better-sqlite3
npm install -D vitest supertest
```

Expected: 两条命令 exit 0，`package.json` 出现 dependencies / devDependencies，生成 `package-lock.json`。better-sqlite3 若走源码编译失败，检查 Node 是否 LTS 版本（预编译二进制只覆盖 LTS）。

- [ ] **Step 6: 验证依赖可加载**

Run: `node -e "import('express').then(m=>console.log('express', typeof m.default))"`
Expected: `express function`

Run: `node -e "import('better-sqlite3').then(m=>console.log('sqlite', typeof m.default))"`
Expected: `sqlite function`

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "chore: 清理前端副本，立起 todo-server 骨架"
```

---

### Task 2: db 层——database.js + todoDao.js

**Files:**
- Create: `src/db/database.js`
- Create: `src/db/todoDao.js`
- Test: `test/db/todoDao.test.js`

**Interfaces:**
- Consumes: Task 1 的 ESM 骨架
- Produces:
  - `openDatabase(path)` → better-sqlite3 实例（表已建好）；`path` 传 `':memory:'` 或文件路径
  - `createTodoDao(db)` → `{ create(text), list(filter='all'), findById(id), update(id, {text?, done?}), remove(id) }`
    - `create` 返回完整 todo；`findById`/`update` 找不到返回 `undefined`；`remove` 返回布尔；`list` 返回 todo 数组（id 升序，`done` 已转布尔）

- [ ] **Step 1: 写失败测试 `test/db/todoDao.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { openDatabase } from '../../src/db/database.js'
import { createTodoDao } from '../../src/db/todoDao.js'

function makeDao() {
  return createTodoDao(openDatabase(':memory:'))
}

describe('todoDao', () => {
  it('create 返回新建事项，done 为布尔 false', () => {
    const dao = makeDao()
    const todo = dao.create('买牛奶')
    expect(todo).toEqual({ id: 1, text: '买牛奶', done: false })
  })

  it('list 默认返回全部并按 id 升序', () => {
    const dao = makeDao()
    dao.create('a')
    dao.create('b')
    expect(dao.list().map(t => t.id)).toEqual([1, 2])
  })

  it('list(active) 只含未完成，list(done) 只含已完成', () => {
    const dao = makeDao()
    dao.create('a')
    const b = dao.create('b')
    dao.update(b.id, { done: true })
    expect(dao.list('active').map(t => t.text)).toEqual(['a'])
    expect(dao.list('done').map(t => t.text)).toEqual(['b'])
  })

  it('findById 找不到返回 undefined', () => {
    expect(makeDao().findById(99)).toBeUndefined()
  })

  it('update 改 done / 改 text / 两者同传，均返回更新后事项', () => {
    const dao = makeDao()
    const t = dao.create('旧文本')
    expect(dao.update(t.id, { done: true }).done).toBe(true)
    expect(dao.update(t.id, { text: '新文本' }).text).toBe('新文本')
    expect(dao.update(t.id, { text: '再改', done: false }))
      .toEqual({ id: t.id, text: '再改', done: false })
  })

  it('update 目标不存在返回 undefined', () => {
    expect(makeDao().update(99, { done: true })).toBeUndefined()
  })

  it('remove 存在返回 true，再删同 id 返回 false', () => {
    const dao = makeDao()
    const t = dao.create('a')
    expect(dao.remove(t.id)).toBe(true)
    expect(dao.remove(t.id)).toBe(false)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/db/todoDao.test.js`
Expected: FAIL，报模块不存在（`Failed to resolve import "../../src/db/database.js"`）。

- [ ] **Step 3: 实现 `src/db/database.js`**

```js
import Database from 'better-sqlite3'

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS todos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    text       TEXT NOT NULL,
    done       INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`

/** 打开数据库并确保表存在。path 传 ':memory:' 用于测试，传文件路径用于生产。 */
export function openDatabase(path) {
  const db = new Database(path)
  db.exec(CREATE_TABLE)
  return db
}
```

- [ ] **Step 4: 实现 `src/db/todoDao.js`**

```js
/** 数据访问层：只写 SQL 与 行↔对象 转换，不含业务规则。 */
export function createTodoDao(db) {
  const toTodo = row => ({ id: row.id, text: row.text, done: row.done === 1 })

  const dao = {
    create(text) {
      const info = db.prepare('INSERT INTO todos (text) VALUES (?)').run(text)
      return dao.findById(info.lastInsertRowid)
    },

    list(filter = 'all') {
      const sql = {
        all: 'SELECT * FROM todos ORDER BY id',
        active: 'SELECT * FROM todos WHERE done = 0 ORDER BY id',
        done: 'SELECT * FROM todos WHERE done = 1 ORDER BY id',
      }[filter]
      return db.prepare(sql).all().map(toTodo)
    },

    findById(id) {
      const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id)
      return row ? toTodo(row) : undefined
    },

    update(id, { text, done }) {
      const sets = []
      const args = []
      if (text !== undefined) { sets.push('text = ?'); args.push(text) }
      if (done !== undefined) { sets.push('done = ?'); args.push(done ? 1 : 0) }
      args.push(id)
      const info = db
        .prepare(`UPDATE todos SET ${sets.join(', ')} WHERE id = ?`)
        .run(...args)
      return info.changes > 0 ? dao.findById(id) : undefined
    },

    remove(id) {
      return db.prepare('DELETE FROM todos WHERE id = ?').run(id).changes > 0
    },
  }

  return dao
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npx vitest run test/db/todoDao.test.js`
Expected: PASS，7 个用例全绿。

- [ ] **Step 6: Commit**

```powershell
git add src/db test/db
git commit -m "feat: db 层——SQLite 连接与 todoDao"
```

---

### Task 3: service 层——errors.js + todoService.js

**Files:**
- Create: `src/errors.js`
- Create: `src/services/todoService.js`
- Test: `test/services/todoService.test.js`

**Interfaces:**
- Consumes: Task 2 的 `createTodoDao` / `openDatabase`
- Produces:
  - `HttpError` 类：`new HttpError(status, message)`，实例带 `.status`
  - `createTodoService(dao)` → `{ add(text), list(filter='all'), update(id, patch), remove(id) }`
    - `add` 返回新建 todo（text 会 trim）；`update`/`remove` 目标不存在时 `throw new HttpError(404, '待办不存在')`

- [ ] **Step 1: 写失败测试 `test/services/todoService.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { openDatabase } from '../../src/db/database.js'
import { createTodoDao } from '../../src/db/todoDao.js'
import { createTodoService } from '../../src/services/todoService.js'
import { HttpError } from '../../src/errors.js'

function makeService() {
  return createTodoService(createTodoDao(openDatabase(':memory:')))
}

describe('todoService', () => {
  it('add 保存 trim 后的文本并返回完整事项', () => {
    const svc = makeService()
    expect(svc.add('  hello  ')).toEqual({ id: 1, text: 'hello', done: false })
  })

  it('list 透传 filter', () => {
    const svc = makeService()
    const t = svc.add('a')
    svc.update(t.id, { done: true })
    expect(svc.list('active')).toHaveLength(0)
    expect(svc.list('done')).toHaveLength(1)
  })

  it('update 目标不存在抛 HttpError 404', () => {
    const svc = makeService()
    expect(() => svc.update(99, { done: true })).toThrow(HttpError)
    expect(() => svc.update(99, { done: true })).toThrow(
      expect.objectContaining({ status: 404 })
    )
  })

  it('update 只下发改动的字段，返回更新后事项', () => {
    const svc = makeService()
    const t = svc.add('a')
    expect(svc.update(t.id, { done: true }))
      .toEqual({ id: t.id, text: 'a', done: true })
  })

  it('remove 成功不抛错；目标不存在抛 HttpError 404', () => {
    const svc = makeService()
    const t = svc.add('a')
    expect(() => svc.remove(t.id)).not.toThrow()
    expect(() => svc.remove(t.id)).toThrow(
      expect.objectContaining({ status: 404 })
    )
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/services/todoService.test.js`
Expected: FAIL，`Failed to resolve import "../../src/errors.js"`。

- [ ] **Step 3: 实现 `src/errors.js`**

```js
/** 携带 HTTP 状态码的业务错误；统一错误中间件读 .status 决定响应码。 */
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
```

- [ ] **Step 4: 实现 `src/services/todoService.js`**

```js
import { HttpError } from '../errors.js'

/** 业务层：领域规则与归一化，不含 SQL。 */
export function createTodoService(dao) {
  return {
    add(text) {
      return dao.create(text.trim())
    },

    list(filter = 'all') {
      return dao.list(filter)
    },

    update(id, patch) {
      const fields = {}
      if (patch.text !== undefined) fields.text = patch.text.trim()
      if (patch.done !== undefined) fields.done = patch.done
      const updated = dao.update(id, fields)
      if (!updated) throw new HttpError(404, '待办不存在')
      return updated
    },

    remove(id) {
      if (!dao.remove(id)) throw new HttpError(404, '待办不存在')
    },
  }
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npx vitest run test/services/todoService.test.js`
Expected: PASS，5 个用例全绿。

- [ ] **Step 6: Commit**

```powershell
git add src/errors.js src/services test/services
git commit -m "feat: service 层——HttpError 与 todoService"
```

---

### Task 4: HTTP 层——app.js + routes/todos.js（supertest 契约测试）

**Files:**
- Create: `src/app.js`
- Create: `src/routes/todos.js`
- Test: `test/api/todos.test.js`

**Interfaces:**
- Consumes: Task 2 `createTodoDao`、Task 3 `createTodoService` / `HttpError`
- Produces: `createApp(db)` → 配置完整的 Express app（CORS、JSON 解析、`/api/todos` 路由、404 兜底、统一错误中间件），测试与入口共用

- [ ] **Step 1: 写失败测试 `test/api/todos.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { openDatabase } from '../../src/db/database.js'
import { createApp } from '../../src/app.js'

let api
beforeEach(() => {
  api = request(createApp(openDatabase(':memory:')))
})

// 每组用例自备数据的辅助函数
async function seed(...texts) {
  const created = []
  for (const text of texts) {
    created.push((await api.post('/api/todos').send({ text })).body)
  }
  return created
}

describe('POST /api/todos', () => {
  it('合法文本返回 201 与新建事项', async () => {
    const res = await api.post('/api/todos').send({ text: '买牛奶' })
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ id: 1, text: '买牛奶', done: false })
  })

  it('缺 text 返回 400', async () => {
    const res = await api.post('/api/todos').send({})
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('纯空白文本返回 400', async () => {
    const res = await api.post('/api/todos').send({ text: '   ' })
    expect(res.status).toBe(400)
  })

  it('超过 200 字返回 400', async () => {
    const res = await api.post('/api/todos').send({ text: '长'.repeat(201) })
    expect(res.status).toBe(400)
  })

  it('未知字段忽略：POST 传 done 不生效', async () => {
    const res = await api.post('/api/todos').send({ text: 'a', done: true })
    expect(res.status).toBe(201)
    expect(res.body.done).toBe(false)
  })
})

describe('GET /api/todos', () => {
  it('返回全量列表，按 id 升序', async () => {
    await seed('a', 'b')
    const res = await api.get('/api/todos')
    expect(res.status).toBe(200)
    expect(res.body.map(t => t.text)).toEqual(['a', 'b'])
  })

  it('filter=active 只返回未完成', async () => {
    const [a, b] = await seed('a', 'b')
    await api.patch(`/api/todos/${b.id}`).send({ done: true })
    const res = await api.get('/api/todos?filter=active')
    expect(res.body.map(t => t.id)).toEqual([a.id])
  })

  it('filter=done 只返回已完成', async () => {
    const [, b] = await seed('a', 'b')
    await api.patch(`/api/todos/${b.id}`).send({ done: true })
    const res = await api.get('/api/todos?filter=done')
    expect(res.body.map(t => t.id)).toEqual([b.id])
  })

  it('非法 filter 返回 400', async () => {
    const res = await api.get('/api/todos?filter=xxx')
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/todos/:id', () => {
  it('改完成态', async () => {
    const [a] = await seed('a')
    const res = await api.patch(`/api/todos/${a.id}`).send({ done: true })
    expect(res.status).toBe(200)
    expect(res.body.done).toBe(true)
  })

  it('改文本', async () => {
    const [a] = await seed('a')
    const res = await api.patch(`/api/todos/${a.id}`).send({ text: '新文本' })
    expect(res.status).toBe(200)
    expect(res.body.text).toBe('新文本')
  })

  it('text 与 done 同传', async () => {
    const [a] = await seed('a')
    const res = await api.patch(`/api/todos/${a.id}`).send({ text: 'x', done: true })
    expect(res.body).toEqual({ id: a.id, text: 'x', done: true })
  })

  it('空对象返回 400', async () => {
    const [a] = await seed('a')
    expect((await api.patch(`/api/todos/${a.id}`).send({})).status).toBe(400)
  })

  it('done 传非布尔返回 400', async () => {
    const [a] = await seed('a')
    expect((await api.patch(`/api/todos/${a.id}`).send({ done: 'yes' })).status).toBe(400)
  })

  it('id 不存在返回 404', async () => {
    const res = await api.patch('/api/todos/99').send({ done: true })
    expect(res.status).toBe(404)
  })

  it('id 非正整数返回 400', async () => {
    expect((await api.patch('/api/todos/abc').send({ done: true })).status).toBe(400)
  })
})

describe('DELETE /api/todos/:id', () => {
  it('返回 204 且列表确少一项', async () => {
    const [a, b] = await seed('a', 'b')
    const res = await api.delete(`/api/todos/${a.id}`)
    expect(res.status).toBe(204)
    const list = (await api.get('/api/todos')).body
    expect(list.map(t => t.id)).toEqual([b.id])
  })

  it('删除后再删同 id 返回 404', async () => {
    const [a] = await seed('a')
    await api.delete(`/api/todos/${a.id}`)
    expect((await api.delete(`/api/todos/${a.id}`)).status).toBe(404)
  })
})

describe('通用错误处理', () => {
  it('未知路由返回 404 JSON', async () => {
    const res = await api.get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('非法 JSON 请求体返回 400', async () => {
    const res = await api
      .post('/api/todos')
      .set('Content-Type', 'application/json')
      .send('{bad json')
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/api/todos.test.js`
Expected: FAIL，`Failed to resolve import "../../src/app.js"`。

- [ ] **Step 3: 实现 `src/routes/todos.js`**

```js
import { Router } from 'express'
import { createTodoDao } from '../db/todoDao.js'
import { createTodoService } from '../services/todoService.js'
import { HttpError } from '../errors.js'

const FILTERS = ['all', 'active', 'done']
const MAX_TEXT_LEN = 200

/** 校验 text：字符串、trim 后非空、≤200 字。返回 trim 后的文本。 */
function validateText(text) {
  if (typeof text !== 'string') throw new HttpError(400, 'text 必须是字符串')
  const t = text.trim()
  if (!t) throw new HttpError(400, '待办内容不能为空')
  if (t.length > MAX_TEXT_LEN) {
    throw new HttpError(400, `待办内容不能超过 ${MAX_TEXT_LEN} 字`)
  }
  return t
}

/** 校验 :id 为正整数。 */
function parseId(raw) {
  if (!/^\d+$/.test(raw) || Number(raw) < 1) {
    throw new HttpError(400, 'id 必须是正整数')
  }
  return Number(raw)
}

export function createTodoRouter(db) {
  const service = createTodoService(createTodoDao(db))
  const router = Router()

  // 列表（含筛选）
  router.get('/', (req, res, next) => {
    try {
      const filter = req.query.filter ?? 'all'
      if (!FILTERS.includes(filter)) {
        throw new HttpError(400, 'filter 必须是 all / active / done 之一')
      }
      res.json(service.list(filter))
    } catch (err) { next(err) }
  })

  // 新增（未知字段忽略，只取 text）
  router.post('/', (req, res, next) => {
    try {
      const text = validateText(req.body?.text)
      res.status(201).json(service.add(text))
    } catch (err) { next(err) }
  })

  // 修改：text / done 至少其一
  router.patch('/:id', (req, res, next) => {
    try {
      const id = parseId(req.params.id)
      const body = req.body ?? {}
      if (body.text === undefined && body.done === undefined) {
        throw new HttpError(400, '至少提供 text 或 done 之一')
      }
      const patch = {}
      if (body.text !== undefined) patch.text = validateText(body.text)
      if (body.done !== undefined) {
        if (typeof body.done !== 'boolean') {
          throw new HttpError(400, 'done 必须是布尔值')
        }
        patch.done = body.done
      }
      res.json(service.update(id, patch))
    } catch (err) { next(err) }
  })

  // 删除
  router.delete('/:id', (req, res, next) => {
    try {
      service.remove(parseId(req.params.id))
      res.status(204).end()
    } catch (err) { next(err) }
  })

  return router
}
```

- [ ] **Step 4: 实现 `src/app.js`**

```js
import express from 'express'
import cors from 'cors'
import { createTodoRouter } from './routes/todos.js'

/** 组装 Express 应用。db 由调用方注入：测试传 :memory:，生产传文件库。 */
export function createApp(db) {
  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use('/api/todos', createTodoRouter(db))

  // 未知路由 404（JSON 而非默认 HTML）
  app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' })
  })

  // 统一错误中间件：HttpError 用自带状态码；JSON 解析失败自带 status=400
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.status) {
      return res.status(err.status).json({ error: err.message })
    }
    console.error(err)
    res.status(500).json({ error: '服务器内部错误' })
  })

  return app
}
```

- [ ] **Step 5: 跑全量测试确认通过**

Run: `npm test`
Expected: PASS，三个测试文件（dao 7 + service 5 + api 17）全部通过。

- [ ] **Step 6: Commit**

```powershell
git add src/app.js src/routes test/api
git commit -m "feat: HTTP 层——createApp、todos 路由与统一错误处理"
```

---

### Task 5: 入口 server.js + README + 端到端验证（含持久化）

**Files:**
- Create: `src/server.js`
- Create: `README.md`

**Interfaces:**
- Consumes: Task 2 `openDatabase`、Task 4 `createApp`
- Produces: `npm run dev` / `npm start` 可启动的完整服务；README 提供 API 文档供 UI 仓库对接

- [ ] **Step 1: 实现 `src/server.js`**

```js
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { openDatabase } from './db/database.js'
import { createApp } from './app.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const DATA_DIR = `${here}../data`
const PORT = process.env.PORT || 3001

mkdirSync(DATA_DIR, { recursive: true })
const db = openDatabase(`${DATA_DIR}/todos.db`)
const app = createApp(db)

app.listen(PORT, () => {
  console.log(`TodoList API 已启动: http://localhost:${PORT}/api/todos`)
})
```

- [ ] **Step 2: 写 `README.md`**

````markdown
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
````

- [ ] **Step 3: 启动并验证四接口**

```powershell
npm run dev   # 后台启动
```

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/todos -ContentType 'application/json' -Body '{"text":"端到端验证"}'
# 期望：id 1 的新事项

Invoke-RestMethod -Uri http://localhost:3001/api/todos
# 期望：含上一步事项的数组

Invoke-RestMethod -Method Patch -Uri http://localhost:3001/api/todos/1 -ContentType 'application/json' -Body '{"done":true}'
# 期望：done 为 true

Invoke-WebRequest -Method Delete -Uri http://localhost:3001/api/todos/1 -UseBasicParsing
# 期望：204 StatusCode
```

再补两条负路径：

```powershell
Invoke-WebRequest -Uri http://localhost:3001/api/todos/99 -Method Patch -ContentType 'application/json' -Body '{"done":true}' -SkipHttpErrorCheck
# 期望：404

Invoke-WebRequest -Uri 'http://localhost:3001/api/todos?filter=xxx' -SkipHttpErrorCheck
# 期望：400
```

- [ ] **Step 4: 验证持久化（重启不丢数据）**

```powershell
# 1) 当前 dev 服务在跑，先加一条
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/todos -ContentType 'application/json' -Body '{"text":"重启后我还在"}'
# 2) 停掉服务（Ctrl+C 或 kill 进程），确认 data/todos.db 存在
Test-Path data\todos.db   # True
# 3) 重新 npm run dev，再查
Invoke-RestMethod -Uri http://localhost:3001/api/todos
# 期望：仍能看到「重启后我还在」
# 4) 清理验证数据：停服务后 Remove-Item data\todos.db（.gitkeep 别删）
```

- [ ] **Step 5: Commit**

```powershell
git add src/server.js README.md
git commit -m "feat: 启动入口与 README，端到端验证通过"
```

---

### Task 6: 最终验收

**Files:**
- 无新增，只做核对

**Interfaces:**
- Consumes: 全部前置任务
- Produces: 达到规格四条验收标准

- [ ] **Step 1: 全量测试**

Run: `npm test`
Expected: 全绿，0 failed。

- [ ] **Step 2: 逐条核对规格验收标准**

1. `npm test` 全绿 ✅（上一步输出）
2. 四接口行为符合契约 ✅（Task 5 Step 3 已验）
3. 重启数据不丢 ✅（Task 5 Step 4 已验）
4. 本仓库不含前端文件：`git ls-files` 输出里无 `index.html`、`vite.config.js`、`src/TodoList*`、`src/App.jsx`、`src/main.jsx`

Run: `git ls-files`
Expected: 只剩 `.gitignore`、`README.md`、`data/.gitkeep`、`docs/**`、`package.json`、`package-lock.json`、`src/**`、`test/**`

- [ ] **Step 3: 工作区干净**

Run: `git status`
Expected: nothing to commit, working tree clean

---

## Self-Review 记录

- **Spec coverage:** 规格 API 表 4 接口 → Task 4；表结构/建表 → Task 2；错误规则（含空 PATCH、未知字段忽略、非法 filter/id/JSON）→ Task 3/4 且各有用例；`node --watch` 脚本 → Task 1；CORS → Task 4；验收标准 4 条 → Task 5/6 逐条对应。README 为规格外的必要补充（UI 仓库对接需要接口文档）。
- **Placeholder scan:** 无 TBD/TODO；所有代码步骤给出完整代码与期望输出。
- **Type consistency:** `createTodoDao(db)` / `createTodoService(dao)` / `createApp(db)` / `openDatabase(path)` / `HttpError(status, message)` 签名在各任务间一致；todo 形状 `{ id, text, done }` 全程统一。
