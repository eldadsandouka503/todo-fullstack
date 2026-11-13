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
