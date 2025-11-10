import React from 'react';

console.log('TestRoute.tsx正在加载...')

export default function TestRoute() {
  console.log('TestRoute正在渲染...')
  
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
    }, '测试路由页面'),
    
    React.createElement('div', {
      style: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        margin: '20px auto',
        maxWidth: '600px',
        textAlign: 'center'
      }
    },
      React.createElement('p', { style: { fontSize: '18px', marginBottom: '20px' } }, '如果您能看到这个页面，说明路由正常工作！'),
      React.createElement('button', {
        onClick: () => window.history.back(),
        style: {
          backgroundColor: '#007bff',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }
      }, '返回首页')
    )
  );
}
