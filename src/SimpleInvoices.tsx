import React from 'react';
import { useSystemSettings } from './contexts/SystemSettingsContext';

console.log('SimpleInvoices.tsx正在加载...')

export default function SimpleInvoices() {
  const { formatCurrency } = useSystemSettings();
  
  // 模拟数据
  const [customers] = React.useState([
    { id: 1, name: '张三', phone: '012-3456789', membership: 'VIP会员' },
    { id: 2, name: '李四', phone: '012-3456790', membership: '普通会员' },
    { id: 3, name: '王五', phone: '012-3456791', membership: 'SVIP会员' }
  ]);
  
  const [products] = React.useState([
    { id: 1, name: '示例商品1', price: 100, stock: 50 },
    { id: 2, name: '示例商品2', price: 200, stock: 30 },
    { id: 3, name: '示例商品3', price: 150, stock: 20 }
  ]);
  
  const [invoices, setInvoices] = React.useState([
    { 
      id: 1, 
      invoiceNumber: 'INV202501-001', 
      customerName: '张三', 
      items: [{ productName: '示例商品1', quantity: 2, price: 100, total: 200 }],
      subtotal: 200,
      discount: 0,
      total: 200,
      paymentMethod: '现金',
      status: '已支付',
      date: '2025-01-15'
    },
    { 
      id: 2, 
      invoiceNumber: 'INV202501-002', 
      customerName: '李四', 
      items: [{ productName: '示例商品2', quantity: 1, price: 200, total: 200 }],
      subtotal: 200,
      discount: 10,
      total: 190,
      paymentMethod: 'T&G',
      status: '已支付',
      date: '2025-01-14'
    }
  ]);
  
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState('');
  const [invoiceItems, setInvoiceItems] = React.useState([]);
  const [discount, setDiscount] = React.useState(0);

  console.log('SimpleInvoices正在渲染...')

  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal - discount;
  };

  const addItem = () => {
    if (products.length > 0) {
      const newItem = {
        id: Date.now(),
        productId: products[0].id,
        productName: products[0].name,
        quantity: 1,
        price: products[0].price,
        total: products[0].price
      };
      setInvoiceItems([...invoiceItems, newItem]);
    }
  };

  const updateItem = (itemId, field, value) => {
    setInvoiceItems(invoiceItems.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'price') {
          updated.total = updated.quantity * updated.price;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (itemId) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== itemId));
  };

  const createInvoice = () => {
    if (!selectedCustomer || invoiceItems.length === 0) {
      alert('请选择客户并添加商品！');
      return;
    }

    const customer = customers.find(c => c.id.toString() === selectedCustomer);
    const newInvoice = {
      id: Date.now(),
      invoiceNumber: `INV${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(invoices.length + 1).toString().padStart(3, '0')}`,
      customerName: customer.name,
      items: invoiceItems,
      subtotal: calculateSubtotal(),
      discount: discount,
      total: calculateTotal(),
      paymentMethod: '现金',
      status: '已支付',
      date: new Date().toISOString().split('T')[0]
    };

    setInvoices([newInvoice, ...invoices]);
    setSelectedCustomer('');
    setInvoiceItems([]);
    setDiscount(0);
    setShowCreateForm(false);
    alert('发票创建成功！');
  };

  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const serial = (invoices.length + 1).toString().padStart(3, '0');
    return `INV${year}${month}-${serial}`;
  };

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
      }, '开单管理'),
      React.createElement('button', {
        onClick: () => setShowCreateForm(!showCreateForm),
        style: {
          backgroundColor: '#ffc107',
          color: '#333',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }
      }, showCreateForm ? '取消创建' : '创建发票')
    ),

    // 创建发票表单
    showCreateForm && React.createElement('div', {
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
      }, '创建新发票'),
      
      // 客户选择
      React.createElement('div', {
        style: { marginBottom: '20px' }
      },
        React.createElement('label', {
          style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' }
        }, '选择客户 *'),
        React.createElement('select', {
          value: selectedCustomer,
          onChange: (e) => setSelectedCustomer(e.target.value),
          style: {
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }
        },
          React.createElement('option', { value: '' }, '请选择客户'),
          customers.map(customer => 
            React.createElement('option', { key: customer.id, value: customer.id }, 
              `${customer.name} (${customer.phone}) - ${customer.membership}`
            )
          )
        )
      ),

      // 发票项目
      React.createElement('div', {
        style: { marginBottom: '20px' }
      },
        React.createElement('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px'
          }
        },
          React.createElement('h3', {
            style: { color: '#333', margin: 0 }
          }, '发票项目'),
          React.createElement('button', {
            onClick: addItem,
            style: {
              backgroundColor: '#28a745',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }
          }, '添加商品')
        ),
        
        invoiceItems.length === 0 ? 
          React.createElement('p', {
            style: { textAlign: 'center', color: '#666', padding: '20px' }
          }, '暂无商品，点击"添加商品"开始创建发票') :
          React.createElement('div', {
            style: { border: '1px solid #eee', borderRadius: '4px', overflow: 'hidden' }
          },
            invoiceItems.map((item, index) => 
              React.createElement('div', {
                key: item.id,
                style: {
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '10px',
                  borderBottom: index < invoiceItems.length - 1 ? '1px solid #eee' : 'none',
                  backgroundColor: '#fafafa'
                }
              },
                React.createElement('select', {
                  value: item.productId,
                  onChange: (e) => {
                    const product = products.find(p => p.id.toString() === e.target.value);
                    updateItem(item.id, 'productId', product.id);
                    updateItem(item.id, 'productName', product.name);
                    updateItem(item.id, 'price', product.price);
                    updateItem(item.id, 'total', product.price * item.quantity);
                  },
                  style: {
                    padding: '5px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }
                },
                  products.map(product => 
                    React.createElement('option', { key: product.id, value: product.id }, product.name)
                  )
                ),
                React.createElement('input', {
                  type: 'number',
                  value: item.quantity,
                  onChange: (e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1),
                  min: '1',
                  style: {
                    padding: '5px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }
                }),
                React.createElement('input', {
                  type: 'number',
                  value: item.price,
                  onChange: (e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0),
                  step: '0.01',
                  style: {
                    padding: '5px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }
                }),
                React.createElement('span', {
                  style: { fontWeight: 'bold', color: '#007bff' }
                }, formatCurrency(item.total)),
                React.createElement('button', {
                  onClick: () => removeItem(item.id),
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
      ),

      // 折扣和总计
      React.createElement('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '20px'
        }
      },
        React.createElement('div', null,
          React.createElement('label', {
            style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' }
          }, '折扣金额'),
          React.createElement('input', {
            type: 'number',
            value: discount,
            onChange: (e) => setDiscount(parseFloat(e.target.value) || 0),
            step: '0.01',
            style: {
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }
          })
        ),
        React.createElement('div', {
          style: { textAlign: 'right' }
        },
          React.createElement('p', { style: { margin: '5px 0' } }, `小计: ${formatCurrency(calculateSubtotal())}`),
          React.createElement('p', { style: { margin: '5px 0' } }, `折扣: ${formatCurrency(discount)}`),
          React.createElement('p', { 
            style: { margin: '5px 0', fontSize: '18px', fontWeight: 'bold', color: '#28a745' } 
          }, `总计: ${formatCurrency(calculateTotal())}`)
        )
      ),
      
      React.createElement('button', {
        onClick: createInvoice,
        style: {
          backgroundColor: '#28a745',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }
      }, '创建发票')
    ),

    // 发票列表
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
      }, '发票列表'),
      
      React.createElement('div', {
        style: { padding: '20px' }
      },
        invoices.length === 0 ? 
          React.createElement('p', {
            style: { textAlign: 'center', color: '#666', padding: '40px' }
          }, '暂无发票数据') :
          React.createElement('div', {
            style: {
              display: 'grid',
              gap: '15px'
            }
          },
            invoices.map(invoice => 
              React.createElement('div', {
                key: invoice.id,
                style: {
                  padding: '15px',
                  border: '1px solid #eee',
                  borderRadius: '4px',
                  backgroundColor: '#fafafa'
                }
              },
                React.createElement('div', {
                  style: {
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                    gap: '15px',
                    alignItems: 'center',
                    marginBottom: '10px'
                  }
                },
                  React.createElement('div', null,
                    React.createElement('strong', { style: { color: '#333' } }, invoice.invoiceNumber),
                    React.createElement('br'),
                    React.createElement('span', { style: { color: '#666', fontSize: '14px' } }, invoice.customerName)
                  ),
                  React.createElement('div', {
                    style: { textAlign: 'center' }
                  }, invoice.date),
                  React.createElement('div', {
                    style: { textAlign: 'center', fontWeight: 'bold', color: '#007bff' }
                  }, formatCurrency(invoice.total)),
                  React.createElement('div', {
                    style: { textAlign: 'center' }
                  },
                    React.createElement('span', {
                      style: {
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: invoice.status === '已支付' ? '#28a745' : '#dc3545',
                        color: 'white'
                      }
                    }, invoice.status)
                  ),
                  React.createElement('button', {
                    onClick: () => {
                      setInvoices(invoices.filter(i => i.id !== invoice.id));
                      alert('发票已删除！');
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
                ),
                React.createElement('div', {
                  style: {
                    fontSize: '12px',
                    color: '#666',
                    borderTop: '1px solid #eee',
                    paddingTop: '10px'
                  }
                },
                  React.createElement('p', { style: { margin: '2px 0' } }, `商品: ${invoice.items.map(item => `${item.productName} x${item.quantity}`).join(', ')}`),
                  React.createElement('p', { style: { margin: '2px 0' } }, `支付方式: ${invoice.paymentMethod}`)
                )
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
        React.createElement('h3', { style: { color: '#333', margin: '0 0 10px 0' } }, '总发票数'),
        React.createElement('p', { style: { fontSize: '24px', fontWeight: 'bold', color: '#007bff', margin: 0 } }, invoices.length)
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
        React.createElement('h3', { style: { color: '#333', margin: '0 0 10px 0' } }, '总销售额'),
        React.createElement('p', { 
          style: { fontSize: '24px', fontWeight: 'bold', color: '#28a745', margin: 0 } 
        }, formatCurrency(invoices.reduce((sum, invoice) => sum + invoice.total, 0)))
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
        React.createElement('h3', { style: { color: '#333', margin: '0 0 10px 0' } }, '平均订单'),
        React.createElement('p', { 
          style: { fontSize: '24px', fontWeight: 'bold', color: '#ffc107', margin: 0 } 
        }, formatCurrency(invoices.length > 0 ? invoices.reduce((sum, invoice) => sum + invoice.total, 0) / invoices.length : 0))
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
