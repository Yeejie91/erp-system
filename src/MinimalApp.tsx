import React from 'react';

function MinimalApp() {
  const [count, setCount] = React.useState(0);

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: 'blue', textAlign: 'center' }}>ERP系统 - 最小测试</h1>
      
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        margin: '20px auto',
        maxWidth: '600px',
        textAlign: 'center'
      }}>
        <h2>React状态测试</h2>
        <p>计数器: <strong>{count}</strong></p>
        
        <button 
          onClick={() => setCount(count + 1)}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            margin: '10px'
          }}
        >
          点击增加
        </button>
        
        <button 
          onClick={() => setCount(0)}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            margin: '10px'
          }}
        >
          重置
        </button>
        
        <p style={{ marginTop: '20px', color: '#666' }}>
          如果计数器能正常工作，说明React完全正常。
        </p>
      </div>
    </div>
  );
}

export default MinimalApp;
