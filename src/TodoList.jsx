import { useState } from 'react'
import './TodoList.css'

let nextId = 1

const FILTERS = [
  ['all', '全部'],
  ['active', '未完成'],
  ['done', '已完成'],
]

export default function TodoList() {
  const [todos, setTodos] = useState([])        // 事项列表：{ id, text, done }
  const [text, setText] = useState('')          // 输入框内容
  const [filter, setFilter] = useState('all')   // all | active | done

  // 新增（回车提交）
  function addTodo(e) {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    setTodos([...todos, { id: nextId++, text: t, done: false }])
    setText('')
  }

  // 切换完成状态
  function toggle(id) {
    setTodos(todos.map(t => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  // 删除
  function remove(id) {
    setTodos(todos.filter(t => t.id !== id))
  }

  // 按筛选条件展示
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
                onChange={() => toggle(todo.id)}
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
