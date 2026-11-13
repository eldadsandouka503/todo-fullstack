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
