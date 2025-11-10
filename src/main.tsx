import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log('完整ERP系统正在启动...')

// 获取root元素并渲染
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('找不到root元素')
}

console.log('开始渲染完整ERP系统...')
const root = ReactDOM.createRoot(rootElement)
root.render(React.createElement(App))
console.log('完整ERP系统渲染完成')

