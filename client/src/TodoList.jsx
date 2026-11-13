import { useState, useEffect, useCallback } from 'react'
import './TodoList.css'

const FILTERS = [
  ['all', '全部'],
  ['active', '未完成'],
  ['done', '已完成'],
]

// 统一请求封装：走 /api 前缀（开发时由 Vite 代理转发到服务端）
async function api(path, options) {
  const res = await fetch(`/api/todos${path}`, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `请求失败（${res.status}）`)
  }
  return res.status === 204 ? null : res.json()
}

export default function TodoList() {
  const [todos, setTodos] = useState([])        // 事项列表：{ id, text, done }（来自服务端）
  const [text, setText] = useState('')          // 输入框内容
  const [filter, setFilter] = useState('all')   // all | active | done

  // 拉取全量列表；增删改后重新拉，保持与服务端一致
  const refresh = useCallback(async () => {
    setTodos(await api(''))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // 新增（回车提交）
  async function addTodo(e) {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    try {
      await api('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t }),
      })
      setText('')
      refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  // 切换完成状态
  async function toggle(todo) {
    try {
      await api(`/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !todo.done }),
      })
      refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  // 删除
  async function remove(id) {
    try {
      await api(`/${id}`, { method: 'DELETE' })
      refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  // 按筛选条件展示（筛选在本地做，与服务端 ?filter= 等价）
  const shown = todos.filter(t =>
    filter === 'done' ? t.done : filter === 'active' ? !t.done : true
  )
  const left = todos.filter(t => !t.done).length

  return (
    <div className="todo">
      <h1>Todo List</h1>

      <form className="add" onSubmit={addTodo}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="输入待办事项，回车添加"
        />
        <button type="submit">添加</button>
      </form>

      <ul>
        {shown.map(todo => (
          <li key={todo.id} className={todo.done ? 'done' : ''}>
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggle(todo)}
              />
              <span>{todo.text}</span>
            </label>
            <button className="del" onClick={() => remove(todo.id)}>
              删除
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="empty">暂无事项</li>}
      </ul>

      <div className="footer">
        <span>剩余 {left} 项</span>
        <div className="filters">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              className={filter === key ? 'active' : ''}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
