import { useState, useEffect } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { Product, StockTransaction } from '../types';
import { productsService, stockTransactionsService, generateId } from '../services/db';
import { format } from 'date-fns';

interface SalesItem {
  productId: string;
  productName: string;
  quantity: number;
  availableStock: number;
}

export default function Sales() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [operator, setOperator] = useState('');
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const productsData = await productsService.getAll();
    const transactionsData = await stockTransactionsService.getAll();
    setProducts(productsData);
    setTransactions(
      transactionsData
        .filter(t => t.type === 'OUT')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  };

  const addSalesItem = () => {
    if (!selectedProduct || quantity <= 0) {
      alert('请选择商品并输入有效数量');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    if (quantity > product.currentStock) {
      alert(`库存不足！当前库存: ${product.currentStock}`);
      return;
    }

    setSalesItems([
      ...salesItems,
      {
        productId: product.id,
        productName: product.name,
        quantity,
        availableStock: product.currentStock,
      },
    ]);

    setSelectedProduct('');
    setQuantity(0);
  };

  const removeSalesItem = (index: number) => {
    setSalesItems(salesItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (salesItems.length === 0) {
      alert('请至少添加一个商品');
      return;
    }

    if (!operator.trim()) {
      alert('请输入操作人');
      return;
    }

    try {
      // 验证库存并为每个商品创建出库记录
      for (const item of salesItems) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;

        if (item.quantity > product.currentStock) {
          alert(`${product.name} 库存不足！当前库存: ${product.currentStock}`);
          return;
        }

        const beforeStock = product.currentStock;
        const afterStock = beforeStock - item.quantity;

        // 创建库存交易记录
        const transaction: StockTransaction = {
          id: generateId(),
          productId: product.id,
          productName: product.name,
          type: 'OUT',
          quantity: item.quantity,
          beforeStock,
          afterStock,
          relatedType: 'adjustment',
          notes,
          operator: operator.trim(),
          createdAt: new Date(),
        };

        await stockTransactionsService.add(transaction);

        // 更新商品库存
        const updatedProduct = {
          ...product,
          currentStock: afterStock,
          updatedAt: new Date(),
        };
        await productsService.update(updatedProduct);
      }

      alert('出货成功！');
      setIsModalOpen(false);
      setSalesItems([]);
      setNotes('');
      setOperator('');
      loadData();
    } catch (error) {
      console.error('出货失败:', error);
      alert('出货失败，请重试');
    }
  };

  const totalItems = salesItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">出货管理</h1>
          <p className="text-gray-500 mt-1">记录商品出库</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>新增出货</span>
        </button>
      </div>

      {/* 出货记录列表 */}
      <div className="card overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">出货记录</h2>
        <table className="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>商品名称</th>
              <th>出货数量</th>
              <th>变动前库存</th>
              <th>变动后库存</th>
              <th>操作人</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="text-sm">
                  {format(new Date(transaction.createdAt), 'yyyy-MM-dd HH:mm')}
                </td>
                <td className="font-medium">{transaction.productName}</td>
                <td className="text-red-600 font-semibold">-{transaction.quantity}</td>
                <td>{transaction.beforeStock}</td>
                <td className="font-semibold">{transaction.afterStock}</td>
                <td>{transaction.operator}</td>
                <td className="text-sm text-gray-500">{transaction.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {transactions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            还没有出货记录
          </div>
        )}
      </div>

      {/* 出货模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">新增出货</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 添加商品 */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-medium mb-3">添加商品</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <select
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                        className="input"
                      >
                        <option value="">选择商品</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} (库存: {product.currentStock})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="数量"
                        value={quantity || ''}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="input"
                        min="1"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={addSalesItem}
                        className="btn btn-secondary w-full"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                </div>

                {/* 已添加商品列表 */}
                {salesItems.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">出货清单</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">商品</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">出货数量</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">当前库存</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salesItems.map((item, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2">{item.productName}</td>
                              <td className="px-4 py-2 text-red-600 font-semibold">-{item.quantity}</td>
                              <td className="px-4 py-2">{item.availableStock}</td>
                              <td className="px-4 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeSalesItem(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="bg-gray-50 px-4 py-2 border-t">
                        <p className="text-sm font-medium">
                          总计: {salesItems.length} 种商品，共 {totalItems} 件
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 操作人和备注 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">操作人 *</label>
                    <input
                      type="text"
                      required
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      className="input"
                      placeholder="输入操作人姓名"
                    />
                  </div>
                  <div>
                    <label className="label">备注</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="input"
                      placeholder="选填"
                    />
                  </div>
                </div>

                {/* 按钮 */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setSalesItems([]);
                      setNotes('');
                      setOperator('');
                    }}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger flex items-center space-x-2"
                    disabled={salesItems.length === 0}
                  >
                    <Check size={20} />
                    <span>确认出货</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

