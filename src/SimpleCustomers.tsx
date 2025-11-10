import React from 'react';
import { useSystemSettings } from './contexts/SystemSettingsContext';

console.log('SimpleCustomers.tsx正在加载...')

export default function SimpleCustomers() {
  const { formatCurrency } = useSystemSettings();
  const [customers, setCustomers] = React.useState([
    { id: 1, name: '张三', phone: '012-3456789', email: 'zhangsan@example.com', totalSpent: 1500, membership: 'VIP会员' },
    { id: 2, name: '李四', phone: '012-3456790', email: 'lisi@example.com', totalSpent: 800, membership: '普通会员' },
    { id: 3, name: '王五', phone: '012-3456791', email: 'wangwu@example.com', totalSpent: 3200, membership: 'SVIP会员' }
  ]);
  
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newCustomer, setNewCustomer] = React.useState({
    name: '',
    phone: '',
    email: '',
    membership: '普通会员'
  });

  console.log('SimpleCustomers正在渲染...')

  const handleAddCustomer = () => {
    if (newCustomer.name && newCustomer.phone && newCustomer.email) {
      const customer = {
        id: Date.now(),
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email,
        totalSpent: 0,
        membership: newCustomer.membership
      };
      setCustomers([...customers, customer]);
      setNewCustomer({ name: '', phone: '', email: '', membership: '普通会员' });
      setShowAddForm(false);
      alert('客户添加成功！');
    } else {
      alert('请填写所有必填字段！');
    }
  };

  const membershipOptions = ['普通会员', 'VIP会员', 'SVIP会员', '专案会员'];

  return React.createElement('div', {
    style: {
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }
  },
    // 标题栏
    React.createElement('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }
    },
      React.createElement('h1', {
        style: { color: '#333', margin: 0 }
      }, '客户管理'),
      React.createElement('button', {
        onClick: () => setShowAddForm(!showAddForm),
        style: {
          backgroundColor: '#28a745',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }
      }, showAddForm ? '取消添加' : '添加客户')
    ),

    // 添加客户表单
    showAddForm && React.createElement('div', {
      style: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }
    },
      React.createElement('h2', {
        style: { color: '#333', marginBottom: '20px' }
      }, '添加新客户'),
      
      React.createElement('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }
      },
        React.createElement('div', null,
          React.createElement('label', {
            style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' }
          }, '客户姓名 *'),
          React.createElement('input', {
            type: 'text',
            value: newCustomer.name,
            onChange: (e) => setNewCustomer({...newCustomer, name: e.target.value}),
            placeholder: '请输入客户姓名',
            style: {
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }
          })
        ),
        
        React.createElement('div', null,
          React.createElement('label', {
            style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' }
          }, '联系电话 *'),
          React.createElement('input', {
            type: 'tel',
            value: newCustomer.phone,
            onChange: (e) => setNewCustomer({...newCustomer, phone: e.target.value}),
            placeholder: '请输入联系电话',
            style: {
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }
          })
        ),
        
        React.createElement('div', null,
          React.createElement('label', {
            style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' }
          }, '电子邮箱 *'),
          React.createElement('input', {
            type: 'email',
            value: newCustomer.email,
            onChange: (e) => setNewCustomer({...newCustomer, email: e.target.value}),
            placeholder: '请输入电子邮箱',
            style: {
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }
          })
        ),
        
        React.createElement('div', null,
          React.createElement('label', {
            style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' }
          }, '会员等级'),
          React.createElement('select', {
            value: newCustomer.membership,
            onChange: (e) => setNewCustomer({...newCustomer, membership: e.target.value}),
            style: {
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }
          },
            membershipOptions.map(option => 
              React.createElement('option', { key: option, value: option }, option)
            )
          )
        )
      ),
      
      React.createElement('button', {
        onClick: handleAddCustomer,
        style: {
          backgroundColor: '#28a745',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }
      }, '保存客户')
    ),

    // 客户列表
    React.createElement('div', {
      style: {
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }
    },
      React.createElement('h2', {
        style: {
          color: '#333',
          margin: 0,
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #ddd'
        }
      }, '客户列表'),
      
      React.createElement('div', {
        style: { padding: '20px' }
      },
        customers.length === 0 ? 
          React.createElement('p', {
            style: { textAlign: 'center', color: '#666', padding: '40px' }
          }, '暂无客户数据') :
          React.createElement('div', {
            style: {
              display: 'grid',
              gap: '15px'
            }
          },
            customers.map(customer => 
              React.createElement('div', {
                key: customer.id,
                style: {
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
                  gap: '15px',
                  alignItems: 'center',
                  padding: '15px',
                  border: '1px solid #eee',
                  borderRadius: '4px',
                  backgroundColor: '#fafafa'
                }
              },
                React.createElement('div', null,
                  React.createElement('strong', { style: { color: '#333' } }, customer.name),
                  React.createElement('br'),
                  React.createElement('span', { style: { color: '#666', fontSize: '14px' } }, customer.phone)
                ),
                React.createElement('div', {
                  style: { color: '#666', fontSize: '14px' }
                }, customer.email),
                React.createElement('div', {
                  style: { textAlign: 'center', fontWeight: 'bold', color: '#007bff' }
                }, formatCurrency(customer.totalSpent)),
                React.createElement('div', {
                  style: { textAlign: 'center' }
                },
                  React.createElement('span', {
                    style: {
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: customer.membership === 'SVIP会员' ? '#dc3545' : 
                                     customer.membership === 'VIP会员' ? '#ffc107' : '#28a745',
                      color: customer.membership === 'VIP会员' ? '#333' : 'white'
                    }
                  }, customer.membership)
                ),
                React.createElement('div', {
                  style: { textAlign: 'center' }
                },
                  React.createElement('button', {
                    onClick: () => {
                      const newSpent = customer.totalSpent + 100;
                      setCustomers(customers.map(c => 
                        c.id === customer.id ? {...c, totalSpent: newSpent} : c
                      ));
                      alert(`模拟消费100元，总消费: ${formatCurrency(newSpent)}`);
                    },
                    style: {
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      padding: '5px 10px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }
                  }, '模拟消费')
                ),
                React.createElement('button', {
                  onClick: () => {
                    setCustomers(customers.filter(c => c.id !== customer.id));
                    alert('客户已删除！');
                  },
                  style: {
                    backgroundColor: '#dc3545',
                    color: 'white',
                    padding: '5px 10px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }
                }, '删除')
              )
            )
          )
      )
    ),

    // 统计信息
    React.createElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginTop: '20px'
      }
    },
      React.createElement('div', {
        style: {
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }
      },
        React.createElement('h3', { style: { color: '#333', margin: '0 0 10px 0' } }, '总客户数'),
        React.createElement('p', { style: { fontSize: '24px', fontWeight: 'bold', color: '#007bff', margin: 0 } }, customers.length)
      ),
      
      React.createElement('div', {
        style: {
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }
      },
        React.createElement('h3', { style: { color: '#333', margin: '0 0 10px 0' } }, '总消费金额'),
        React.createElement('p', { 
          style: { fontSize: '24px', fontWeight: 'bold', color: '#28a745', margin: 0 } 
        }, formatCurrency(customers.reduce((sum, c) => sum + c.totalSpent, 0)))
      ),
      
      React.createElement('div', {
        style: {
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }
      },
        React.createElement('h3', { style: { color: '#333', margin: '0 0 10px 0' } }, 'VIP客户数'),
        React.createElement('p', { 
          style: { fontSize: '24px', fontWeight: 'bold', color: '#ffc107', margin: 0 } 
        }, customers.filter(c => c.membership.includes('VIP')).length)
      )
    ),

    // 返回按钮
    React.createElement('div', {
      style: {
        textAlign: 'center',
        marginTop: '30px'
      }
    },
      React.createElement('button', {
        onClick: () => window.history.back(),
        style: {
          backgroundColor: '#6c757d',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }
      }, '返回首页')
    )
  );
}
