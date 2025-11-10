import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SystemSettingsProvider } from './contexts/SystemSettingsContext';
import SimpleProducts from './SimpleProducts';
import SimpleCustomers from './SimpleCustomers';
import SimpleInvoices from './SimpleInvoices';
import TestRoute from './TestRoute';

console.log('SimpleApp.tsx正在加载...')

// 简单的仪表盘组件
function SimpleDashboard() {
  console.log('SimpleDashboard正在渲染...')
  
  return React.createElement('div', {
    style: {
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }
  },
    React.createElement('h1', {
      style: { color: 'blue', textAlign: 'center', marginBottom: '30px' }
    }, 'ERP系统 - 简化版'),
    
    React.createElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }
    },
      // 商品管理卡片
      React.createElement('div', {
        style: {
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }
      },
        React.createElement('h2', { style: { color: '#333', marginBottom: '15px' } }, '商品管理'),
        React.createElement('p', { style: { color: '#666', marginBottom: '15px' } }, '管理商品信息、库存和价格'),
        React.createElement('button', {
          onClick: () => window.location.href = '/products',
          style: {
            backgroundColor: '#007bff',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, '进入商品管理')
      ),
      
      // 客户管理卡片
      React.createElement('div', {
        style: {
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }
      },
        React.createElement('h2', { style: { color: '#333', marginBottom: '15px' } }, '客户管理'),
        React.createElement('p', { style: { color: '#666', marginBottom: '15px' } }, '管理客户信息和关系'),
        React.createElement('button', {
          onClick: () => window.location.href = '/customers',
          style: {
            backgroundColor: '#28a745',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, '进入客户管理')
      ),
      
      // 开单管理卡片
      React.createElement('div', {
        style: {
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }
      },
        React.createElement('h2', { style: { color: '#333', marginBottom: '15px' } }, '开单管理'),
        React.createElement('p', { style: { color: '#666', marginBottom: '15px' } }, '创建和管理销售发票'),
        React.createElement('button', {
          onClick: () => window.location.href = '/invoices',
          style: {
            backgroundColor: '#ffc107',
            color: '#333',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, '进入开单管理')
      ),
      
      // 报表管理卡片
      React.createElement('div', {
        style: {
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }
      },
        React.createElement('h2', { style: { color: '#333', marginBottom: '15px' } }, '报表管理'),
        React.createElement('p', { style: { color: '#666', marginBottom: '15px' } }, '查看销售和财务报表'),
        React.createElement('button', {
          style: {
            backgroundColor: '#6f42c1',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, '进入报表管理')
      )
    ),
    
    React.createElement('div', {
      style: {
        textAlign: 'center',
        marginTop: '30px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        maxWidth: '1200px',
        margin: '30px auto 0'
      }
    },
      React.createElement('p', { style: { color: '#666' } }, 'ERP系统简化版 - 基础功能测试'),
      React.createElement('p', { style: { color: '#999', fontSize: '14px', marginBottom: '20px' } }, '如果您能看到这个页面，说明系统正在正常工作！'),
      React.createElement('button', {
        onClick: () => window.location.href = '/test',
        style: {
          backgroundColor: '#6c757d',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginRight: '10px'
        }
      }, '测试路由'),
      React.createElement('button', {
        onClick: () => window.location.href = '/customers',
        style: {
          backgroundColor: '#dc3545',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }
      }, '测试客户管理')
    )
  )
}

// 主应用组件
function SimpleApp() {
  console.log('SimpleApp正在渲染...')
  
  return React.createElement(BrowserRouter, null,
    React.createElement(SystemSettingsProvider, null,
      React.createElement('div', null,
        React.createElement(Routes, null,
          React.createElement(Route, { path: '/', element: React.createElement(SimpleDashboard) }),
          React.createElement(Route, { path: '/test', element: React.createElement(TestRoute) }),
          React.createElement(Route, { path: '/products', element: React.createElement(SimpleProducts) }),
          React.createElement(Route, { path: '/customers', element: React.createElement(SimpleCustomers) }),
          React.createElement(Route, { path: '/invoices', element: React.createElement(SimpleInvoices) })
        )
      )
    )
  )
}

export default SimpleApp;