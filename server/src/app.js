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
