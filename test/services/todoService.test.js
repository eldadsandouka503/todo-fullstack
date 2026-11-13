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
