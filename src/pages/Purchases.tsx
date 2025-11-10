import { useState, useEffect } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { Product, StockTransaction, Supplier, AccountPayable } from '../types';
import { productsService, stockTransactionsService, suppliersService, accountsPayableService, generateId } from '../services/db';
import { format, addDays } from 'date-fns';
import { formatCurrency } from '../utils/format';

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number; // 采购单价
}

export default function Purchases() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [operator, setOperator] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [paymentTerm, setPaymentTerm] = useState<number>(30); // 账期天数

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const productsData = await productsService.getAll();
    const suppliersData = await suppliersService.getAll();
    const transactionsData = await stockTransactionsService.getAll();
    setProducts(productsData);
    setSuppliers(suppliersData);
    setTransactions(
      transactionsData
        .filter(t => t.type === 'IN')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  };

  const addPurchaseItem = () => {
    if (!selectedProduct || quantity <= 0) {
      alert('请选择商品并输入有效数量');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    // 使用商品成本价，如果没有则使用售价
    const unitCost = product.cost || product.price;

    setPurchaseItems([
      ...purchaseItems,
      {
        productId: product.id,
        productName: product.name,
        quantity,
        unitCost,
      },
    ]);

    setSelectedProduct('');
    setQuantity(0);
  };

  const removePurchaseItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (purchaseItems.length === 0) {
      alert('请至少添加一个商品');
      return;
    }

    if (!operator.trim()) {
      alert('请输入操作人');
      return;
    }

    try {
      // 生成采购单号
      const purchaseNumber = `PO${format(new Date(), 'yyyyMMdd')}-${generateId().slice(-4)}`;
      
      // 为每个商品创建入库记录
      for (const item of purchaseItems) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;

        const beforeStock = product.currentStock;
        const afterStock = beforeStock + item.quantity;

        // 创建库存交易记录
        const transaction: StockTransaction = {
          id: generateId(),
          productId: product.id,
          productName: product.name,
          type: 'IN',
          quantity: item.quantity,
          beforeStock,
          afterStock,
          relatedType: 'adjustment',
          notes: `${notes ? notes + ' - ' : ''}采购单号: ${purchaseNumber}`,
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

      // 如果选择了供应商，自动创建应付账款
      if (selectedSupplier) {
        const supplier = suppliers.find(s => s.id === selectedSupplier);
        if (supplier) {
          // 计算总金额
          const totalAmount = purchaseItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

          const accountPayable: AccountPayable = {
            id: generateId(),
            supplierId: supplier.id,
            supplierName: supplier.name,
            relatedId: purchaseNumber,
            relatedType: 'purchase',
            relatedNumber: purchaseNumber,
            totalAmount,
            paidAmount: 0,
            remainingAmount: totalAmount,
            status: 'pending',
            dueDate: addDays(new Date(), paymentTerm),
            notes: `采购单 ${purchaseNumber} 的应付账款`,
            createdBy: operator.trim(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await accountsPayableService.add(accountPayable);
        }
      }

      const successMsg = selectedSupplier
        ? `进货成功！\n采购单号：${purchaseNumber}\n已自动创建应付账款`
        : `进货成功！\n采购单号：${purchaseNumber}`;
      
      alert(successMsg);
      setIsModalOpen(false);
      setPurchaseItems([]);
      setSelectedSupplier('');
      setNotes('');
      setOperator('');
      setPaymentTerm(30);
      loadData();
    } catch (error) {
      console.error('进货失败:', error);
      alert('进货失败，请重试');
    }
  };

  const totalItems = purchaseItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">进货管理</h1>
          <p className="text-gray-500 mt-1">记录商品入库</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>新增进货</span>
        </button>
      </div>

      {/* 进货记录列表 */}
      <div className="card overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">进货记录</h2>
        <table className="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>商品名称</th>
              <th>进货数量</th>
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
                <td className="text-green-600 font-semibold">+{transaction.quantity}</td>
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
            还没有进货记录
          </div>
        )}
      </div>

      {/* 进货模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">新增进货</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 供应商和账期 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">供应商（可选）</label>
                    <select
                      value={selectedSupplier}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      className="input"
                    >
                      <option value="">不选择（不创建应付账款）</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      选择供应商后会自动创建应付账款
                    </p>
                  </div>
                  <div>
                    <label className="label">账期（天）</label>
                    <input
                      type="number"
                      value={paymentTerm}
                      onChange={(e) => setPaymentTerm(Number(e.target.value))}
                      className="input"
                      min="0"
                      disabled={!selectedSupplier}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      付款到期日：{selectedSupplier ? format(addDays(new Date(), paymentTerm), 'yyyy-MM-dd') : '-'}
                    </p>
                  </div>
                </div>

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
                        onClick={addPurchaseItem}
                        className="btn btn-secondary w-full"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                </div>

                {/* 已添加商品列表 */}
                {purchaseItems.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">进货清单</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">商品</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">数量</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">单价</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">小计</th>
                            <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchaseItems.map((item, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2">{item.productName}</td>
                              <td className="px-4 py-2 text-right text-green-600 font-semibold">+{item.quantity}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(item.unitCost)}</td>
                              <td className="px-4 py-2 text-right font-semibold">{formatCurrency(item.quantity * item.unitCost)}</td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removePurchaseItem(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="bg-gray-50 px-4 py-3 border-t">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium text-gray-700">
                            总计: {purchaseItems.length} 种商品，共 {totalItems} 件
                          </p>
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(purchaseItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0))}
                          </p>
                        </div>
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
                      setPurchaseItems([]);
                      setNotes('');
                      setOperator('');
                    }}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success flex items-center space-x-2"
                    disabled={purchaseItems.length === 0}
                  >
                    <Check size={20} />
                    <span>确认进货</span>
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

