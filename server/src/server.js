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
