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
