import React from 'react'
import ReactDOM from 'react-dom/client'

// 最简单的React组件
function App() {
  return React.createElement('div', {
    style: {
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }
  }, 
    React.createElement('h1', {
      style: { color: 'blue', textAlign: 'center' }
    }, 'ERP系统测试'),
    
    React.createElement('div', {
      style: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        margin: '20px auto',
        maxWidth: '600px'
      }
    },
      React.createElement('p', null, '如果您能看到这个页面，说明React正在工作！'),
      React.createElement('button', {
        onClick: () => alert('按钮点击成功！'),
        style: {
          backgroundColor: '#007bff',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }
      }, '点击测试')
    )
  )
}

// 获取root元素
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('找不到root元素')
}

// 渲染应用
const root = ReactDOM.createRoot(rootElement)
root.render(React.createElement(App))
