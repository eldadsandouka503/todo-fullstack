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
