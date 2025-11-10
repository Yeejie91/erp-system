import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, AlertTriangle, Building2 } from 'lucide-react';
import { Product, Supplier } from '../types';
import { productsService, suppliersService, generateId } from '../services/db';
import { formatCurrency } from '../utils/format';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [showCustomUnit, setShowCustomUnit] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  
  // 快速添加供应商表单
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unit: '',
    minStock: 0,
    currentStock: 0,
    costPrice: 0,
    sellingPrice: 0,
    description: '',
    supplier: '',
    barcode: '',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const [productsData, suppliersData] = await Promise.all([
      productsService.getAll(),
      suppliersService.getAll(),
    ]);
    setProducts(productsData);
    setSuppliers(suppliersData);
    
    // 提取所有唯一的分类
    const uniqueCategories = Array.from(new Set(productsData.map(p => p.category).filter(c => c)));
    setCategories(uniqueCategories.sort());
    
    // 提取所有唯一的单位
    const uniqueUnits = Array.from(new Set(productsData.map(p => p.unit).filter(u => u)));
    setUnits(uniqueUnits.sort());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData: Product = {
      id: editingProduct?.id || generateId(),
      ...formData,
      createdAt: editingProduct?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (editingProduct) {
      await productsService.update(productData);
    } else {
      await productsService.add(productData);
    }

    setIsModalOpen(false);
    setEditingProduct(null);
    resetForm();
    loadProducts();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      minStock: product.minStock,
      currentStock: product.currentStock,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      description: product.description || '',
      supplier: product.supplier || '',
      barcode: product.barcode || '',
    });
    // 检查是否为自定义分类/单位
    if (product.category && !categories.includes(product.category)) {
      setShowCustomCategory(true);
    } else {
      setShowCustomCategory(false);
    }
    if (product.unit && !units.includes(product.unit)) {
      setShowCustomUnit(true);
    } else {
      setShowCustomUnit(false);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个商品吗？')) {
      await productsService.delete(id);
      loadProducts();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category: '',
      unit: '',
      minStock: 0,
      currentStock: 0,
      costPrice: 0,
      sellingPrice: 0,
      description: '',
      supplier: '',
      barcode: '',
    });
    setShowCustomCategory(false);
    setShowCustomUnit(false);
  };

  // 快速添加供应商
  const handleQuickAddSupplier = async () => {
    if (!newSupplier.name || !newSupplier.phone) {
      alert('请填写供应商名称和电话');
      return;
    }

    try {
      const supplier: Supplier = {
        id: generateId(),
        ...newSupplier,
        products: [],
        createdAt: new Date(),
      };

      await suppliersService.add(supplier);
      await loadProducts();
      setFormData({ ...formData, supplier: supplier.name });
      setShowAddSupplier(false);
      setNewSupplier({ name: '', contact: '', phone: '', email: '', address: '' });
      alert('供应商添加成功！');
    } catch (error) {
      console.error('添加供应商失败:', error);
      alert('添加供应商失败，请重试');
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockProducts = products.filter(p => p.currentStock <= p.minStock);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
          <p className="text-gray-500 mt-1">管理您的商品信息和库存</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>添加商品</span>
        </button>
      </div>

      {/* 库存预警 */}
      {lowStockProducts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
            <div>
              <h3 className="font-medium text-yellow-900">库存预警</h3>
              <p className="text-sm text-yellow-700 mt-1">
                有 {lowStockProducts.length} 个商品库存不足：
                {lowStockProducts.slice(0, 3).map(p => p.name).join('、')}
                {lowStockProducts.length > 3 && ' 等'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 搜索栏 */}
      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜索商品名称、SKU或分类..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* 商品列表 */}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>商品名称</th>
              <th>分类</th>
              <th>单位</th>
              <th>当前库存</th>
              <th>预警值</th>
              <th>成本价</th>
              <th>售价</th>
              <th>条形码</th>
              <th>供应商</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td className="font-mono text-xs">{product.sku}</td>
                <td className="font-medium">{product.name}</td>
                <td>{product.category}</td>
                <td>{product.unit}</td>
                <td>
                  <span className={product.currentStock <= product.minStock ? 'text-red-600 font-semibold' : ''}>
                    {product.currentStock}
                  </span>
                </td>
                <td>{product.minStock}</td>
                <td>{formatCurrency(product.costPrice)}</td>
                <td>{formatCurrency(product.sellingPrice)}</td>
                <td className="font-mono text-xs">{product.barcode || '-'}</td>
                <td>{product.supplier || '-'}</td>
                <td>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? '没有找到匹配的商品' : '还没有添加商品，点击上方按钮添加'}
          </div>
        )}
      </div>

      {/* 添加/编辑模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingProduct ? '编辑商品' : '添加商品'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">商品名称 *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">SKU编号 *</label>
                    <input
                      type="text"
                      required
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">分类 *</label>
                    {!showCustomCategory ? (
                      <div className="flex gap-2">
                        <select
                          required={!showCustomCategory}
                          value={formData.category}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setShowCustomCategory(true);
                              setFormData({ ...formData, category: '' });
                            } else {
                              setFormData({ ...formData, category: e.target.value });
                            }
                          }}
                          className="input flex-1"
                        >
                          <option value="">选择分类</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                          <option value="__custom__">+ 新增分类</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="input flex-1"
                          placeholder="输入新分类名称"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomCategory(false);
                            setFormData({ ...formData, category: '' });
                          }}
                          className="btn btn-secondary"
                        >
                          取消
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {showCustomCategory ? '输入新分类后保存将自动添加到列表' : '选择已有分类或新增'}
                    </p>
                  </div>
                  <div>
                    <label className="label">单位 *</label>
                    {!showCustomUnit ? (
                      <div className="flex gap-2">
                        <select
                          required={!showCustomUnit}
                          value={formData.unit}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setShowCustomUnit(true);
                              setFormData({ ...formData, unit: '' });
                            } else {
                              setFormData({ ...formData, unit: e.target.value });
                            }
                          }}
                          className="input flex-1"
                        >
                          <option value="">选择单位</option>
                          {units.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                          <option value="__custom__">+ 新增单位</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          className="input flex-1"
                          placeholder="输入新单位"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomUnit(false);
                            setFormData({ ...formData, unit: '' });
                          }}
                          className="btn btn-secondary"
                        >
                          取消
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {showCustomUnit ? '输入新单位后保存将自动添加到列表' : '常用：件、个、箱、kg、米'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">当前库存</label>
                    <input
                      type="number"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                      className="input"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="label">库存预警值 *</label>
                    <input
                      type="number"
                      required
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                      className="input"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">成本价 (RM)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                      className="input"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="label">销售价 (RM)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                      className="input"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">供应商</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="input flex-1"
                    >
                      <option value="">选择供应商（可选）</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.name}>
                          {supplier.name} - {supplier.phone}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddSupplier(true)}
                      className="btn btn-secondary flex items-center space-x-1 whitespace-nowrap"
                    >
                      <Building2 size={18} />
                      <span>新增</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">条形码 (Barcode)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="input"
                    placeholder="选填，用于价格标签打印"
                  />
                </div>

                <div>
                  <label className="label">商品描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingProduct ? '保存' : '添加'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 快速添加供应商模态框 */}
      {showAddSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">快速添加供应商</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">供应商名称 *</label>
                  <input
                    type="text"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    className="input"
                    placeholder="例如：XX电子有限公司"
                  />
                </div>
                <div>
                  <label className="label">联系人</label>
                  <input
                    type="text"
                    value={newSupplier.contact}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contact: e.target.value })}
                    className="input"
                    placeholder="例如：张经理"
                  />
                </div>
                <div>
                  <label className="label">电话 *</label>
                  <input
                    type="tel"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    className="input"
                    placeholder="例如：012-3456789"
                  />
                </div>
                <div>
                  <label className="label">邮箱</label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    className="input"
                    placeholder="选填"
                  />
                </div>
                <div>
                  <label className="label">地址</label>
                  <input
                    type="text"
                    value={newSupplier.address}
                    onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                    className="input"
                    placeholder="选填"
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-xs text-blue-800">
                    💡 添加后会自动选中该供应商，可在"供应商管理"中查看和编辑详细信息
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSupplier(false);
                    setNewSupplier({ name: '', contact: '', phone: '', email: '', address: '' });
                  }}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleQuickAddSupplier}
                  className="btn btn-primary"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

