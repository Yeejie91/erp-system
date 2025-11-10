import React from 'react';
import { useSystemSettings } from './contexts/SystemSettingsContext';

console.log('SimpleProducts.tsx正在加载...')

export default function SimpleProducts() {
  const { formatCurrency } = useSystemSettings();
  const [products, setProducts] = React.useState([
    { id: 1, name: '示例商品1', price: 100, stock: 50, category: '文具' },
    { id: 2, name: '示例商品2', price: 200, stock: 30, category: '图书' },
    { id: 3, name: '示例商品3', price: 150, stock: 20, category: '文具' }
  ]);
  
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newProduct, setNewProduct] = React.useState({
    name: '',
    price: '',
    stock: '',
    category: ''
  });

  console.log('SimpleProducts正在渲染...')

  const handleAddProduct = () => {
    if (newProduct.name && newProduct.price && newProduct.stock && newProduct.category) {
      const product = {
        id: Date.now(),
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock),
        category: newProduct.category
      };
      setProducts([...products, product]);
      setNewProduct({ name: '', price: '', stock: '', category: '' });
      setShowAddForm(false);
      alert('商品添加成功！');
    } else {
      alert('请填写所有字段！');
    }
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
      }, '商品管理'),
      React.createElement('button', {
        onClick: () => setShowAddForm(!showAddForm),
        style: {
          backgroundColor: '#007bff',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }
      }, showAddForm ? '取消添加' : '添加商品')
    ),

    // 添加商品表单
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
      }, '添加新商品'),
      
      React.createElement('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }
      },
        React.createElement('div', null,
          React.createElement('label', {
            style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' }
          }, '商品名称'),
          React.createElement('input', {
            type: 'text',
            value: newProduct.name,
            onChange: (e) => setNewProduct({...newProduct, name: e.target.value}),
            placeholder: '请输入商品名称',
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
          }, '价格'),
          React.createElement('input', {
            type: 'number',
            value: newProduct.price,
            onChange: (e) => setNewProduct({...newProduct, price: e.target.value}),
            placeholder: '请输入价格',
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
          }, '库存数量'),
          React.createElement('input', {
            type: 'number',
            value: newProduct.stock,
            onChange: (e) => setNewProduct({...newProduct, stock: e.target.value}),
            placeholder: '请输入库存数量',
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
          }, '分类'),
          React.createElement('input', {
            type: 'text',
            value: newProduct.category,
            onChange: (e) => setNewProduct({...newProduct, category: e.target.value}),
            placeholder: '请输入分类',
            style: {
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }
          })
        )
      ),
      
      React.createElement('button', {
        onClick: handleAddProduct,
        style: {
          backgroundColor: '#28a745',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }
      }, '保存商品')
    ),

    // 商品列表
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
      }, '商品列表'),
      
      React.createElement('div', {
        style: { padding: '20px' }
      },
        products.length === 0 ? 
          React.createElement('p', {
            style: { textAlign: 'center', color: '#666', padding: '40px' }
          }, '暂无商品数据') :
          React.createElement('div', {
            style: {
              display: 'grid',
              gap: '15px'
            }
          },
            products.map(product => 
              React.createElement('div', {
                key: product.id,
                style: {
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                  gap: '15px',
                  alignItems: 'center',
                  padding: '15px',
                  border: '1px solid #eee',
                  borderRadius: '4px',
                  backgroundColor: '#fafafa'
                }
              },
                React.createElement('div', null,
                  React.createElement('strong', { style: { color: '#333' } }, product.name),
                  React.createElement('br'),
                  React.createElement('span', { style: { color: '#666', fontSize: '14px' } }, product.category)
                ),
                React.createElement('div', {
                  style: { textAlign: 'center', fontWeight: 'bold', color: '#007bff' }
                }, formatCurrency(product.price)),
                React.createElement('div', {
                  style: { textAlign: 'center' }
                }, product.stock),
                React.createElement('div', {
                  style: { textAlign: 'center' }
                }, formatCurrency(product.price * product.stock)),
                React.createElement('button', {
                  onClick: () => {
                    setProducts(products.filter(p => p.id !== product.id));
                    alert('商品已删除！');
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
