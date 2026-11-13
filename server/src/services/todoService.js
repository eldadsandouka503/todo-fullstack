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
