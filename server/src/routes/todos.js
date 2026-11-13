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
