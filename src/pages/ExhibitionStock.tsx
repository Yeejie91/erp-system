import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Calendar, MapPin, Package, AlertCircle } from 'lucide-react';
import { ExhibitionStock as ExhibitionStockType, Product } from '../types';
import { exhibitionStockService, productsService, generateId } from '../services/db';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { format } from 'date-fns';

export default function ExhibitionStock() {
  const { formatCurrency, formatDate } = useSystemSettings();
  const [exhibitions, setExhibitions] = useState<ExhibitionStockType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExhibition, setEditingExhibition] = useState<ExhibitionStockType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'planned' | 'active' | 'completed' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    productId: '',
    quantity: 1,
    eventType: 'exhibition' as const,
    eventName: '',
    eventDate: format(new Date(), 'yyyy-MM-dd'),
    location: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [exhibitionsData, productsData] = await Promise.all([
        exhibitionStockService.getAll(),
        productsService.getAll()
      ]);
      
      setExhibitions(exhibitionsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setProducts(productsData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      quantity: 1,
      eventType: 'exhibition',
      eventName: '',
      eventDate: format(new Date(), 'yyyy-MM-dd'),
      location: '',
      notes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedProduct = products.find(p => p.id === formData.productId);
    
    if (!selectedProduct) {
      alert('请选择有效的商品');
      return;
    }

    // 检查库存是否足够
    if (selectedProduct.currentStock < formData.quantity) {
      alert(`库存不足！当前库存：${selectedProduct.currentStock}，需要：${formData.quantity}`);
      return;
    }

    const exhibitionData: ExhibitionStockType = {
      id: editingExhibition?.id || generateId(),
      productId: formData.productId,
      productName: selectedProduct.name,
      quantity: formData.quantity,
      eventType: formData.eventType,
      eventName: formData.eventName,
      eventDate: new Date(formData.eventDate),
      location: formData.location,
      status: 'planned',
      notes: formData.notes,
      createdBy: 'system',
      createdAt: editingExhibition?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    try {
      if (editingExhibition) {
        await exhibitionStockService.update(exhibitionData);
        alert('展览库存记录更新成功！');
      } else {
        await exhibitionStockService.add(exhibitionData);
        
        // 减少库存
        const updatedProduct = {
          ...selectedProduct,
          currentStock: selectedProduct.currentStock - formData.quantity,
          updatedAt: new Date(),
        };
        await productsService.update(updatedProduct);
        
        alert('展览库存预留成功！库存已自动减少');
      }
      
      setIsModalOpen(false);
      setEditingExhibition(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('保存展览库存记录失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleEdit = (exhibition: ExhibitionStockType) => {
    setEditingExhibition(exhibition);
    setFormData({
      productId: exhibition.productId,
      quantity: exhibition.quantity,
      eventType: exhibition.eventType,
      eventName: exhibition.eventName,
      eventDate: format(exhibition.eventDate, 'yyyy-MM-dd'),
      location: exhibition.location,
      notes: exhibition.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此展览库存记录吗？')) return;
    
    try {
      const exhibition = exhibitions.find(e => e.id === id);
      if (exhibition && (exhibition.status === 'planned' || exhibition.status === 'active')) {
        // 恢复库存
        const product = products.find(p => p.id === exhibition.productId);
        if (product) {
          const updatedProduct = {
            ...product,
            currentStock: product.currentStock + exhibition.quantity,
            updatedAt: new Date(),
          };
          await productsService.update(updatedProduct);
        }
      }
      
      await exhibitionStockService.delete(id);
      alert('展览库存记录删除成功！库存已恢复');
      loadData();
    } catch (error) {
      console.error('删除展览库存记录失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleStatusChange = async (exhibition: ExhibitionStockType, newStatus: 'planned' | 'active' | 'completed' | 'cancelled') => {
    try {
      const updatedExhibition = {
        ...exhibition,
        status: newStatus,
        updatedAt: new Date(),
      };
      
      await exhibitionStockService.update(updatedExhibition);
      
      // 如果状态改为已完成或取消，恢复库存
      if ((newStatus === 'completed' || newStatus === 'cancelled') && 
          (exhibition.status === 'planned' || exhibition.status === 'active')) {
        const product = products.find(p => p.id === exhibition.productId);
        if (product) {
          const updatedProduct = {
            ...product,
            currentStock: product.currentStock + exhibition.quantity,
            updatedAt: new Date(),
          };
          await productsService.update(updatedProduct);
        }
      }
      
      alert('状态更新成功！');
      loadData();
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新失败，请重试');
    }
  };

  const filteredExhibitions = exhibitions.filter(exhibition => {
    const matchesSearch = exhibition.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exhibition.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exhibition.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exhibition.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planned':
        return '计划中';
      case 'active':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">展览库存管理</h1>
          <p className="text-gray-500 mt-1">管理展览和活动的商品库存预留</p>
        </div>
        <button
          onClick={() => {
            setEditingExhibition(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus className="mr-2" size={20} />
          新增展览库存
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="card mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="搜索商品、事件名称或地点..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input"
            >
              <option value="all">全部状态</option>
              <option value="planned">计划中</option>
              <option value="active">进行中</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
            <div className="text-sm text-gray-500 flex items-center">
              <AlertCircle className="mr-2" size={16} />
              共 {filteredExhibitions.length} 条记录
            </div>
          </div>
        </div>
      </div>

      {/* 展览库存列表 */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>商品名称</th>
                <th>事件名称</th>
                <th>数量</th>
                <th>事件日期</th>
                <th>地点</th>
                <th>状态</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredExhibitions.map((exhibition) => (
                <tr key={exhibition.id}>
                  <td className="font-medium">{exhibition.productName}</td>
                  <td>{exhibition.eventName}</td>
                  <td>{exhibition.quantity}</td>
                  <td>{formatDate(exhibition.eventDate)}</td>
                  <td className="flex items-center">
                    <MapPin className="mr-1" size={14} />
                    {exhibition.location}
                  </td>
                  <td>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(exhibition.status)}`}>
                      {getStatusLabel(exhibition.status)}
                    </span>
                  </td>
                  <td className="max-w-xs truncate">{exhibition.notes || '-'}</td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(exhibition)}
                        className="text-blue-600 hover:text-blue-800"
                        title="编辑"
                      >
                        <Edit size={16} />
                      </button>
                      {exhibition.status === 'planned' && (
                        <button
                          onClick={() => handleStatusChange(exhibition, 'active')}
                          className="text-green-600 hover:text-green-800"
                          title="开始展览"
                        >
                          开始
                        </button>
                      )}
                      {exhibition.status === 'active' && (
                        <button
                          onClick={() => handleStatusChange(exhibition, 'completed')}
                          className="text-gray-600 hover:text-gray-800"
                          title="完成展览"
                        >
                          完成
                        </button>
                      )}
                      {(exhibition.status === 'planned' || exhibition.status === 'active') && (
                        <button
                          onClick={() => handleStatusChange(exhibition, 'cancelled')}
                          className="text-red-600 hover:text-red-800"
                          title="取消展览"
                        >
                          取消
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(exhibition.id)}
                        className="text-red-600 hover:text-red-800"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredExhibitions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
              <p>暂无展览库存记录</p>
            </div>
          )}
        </div>
      </div>

      {/* 展览库存表单模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingExhibition ? '编辑展览库存记录' : '新增展览库存记录'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">商品 *</label>
                    <select
                      value={formData.productId}
                      onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                      className="input"
                      required
                    >
                      <option value="">选择商品</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} (库存: {product.currentStock})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="label">预留数量 *</label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                      className="input"
                      min="1"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">事件类型 *</label>
                      <select
                        value={formData.eventType}
                        onChange={(e) => setFormData({ ...formData, eventType: e.target.value as any })}
                        className="input"
                        required
                      >
                        <option value="exhibition">展览</option>
                        <option value="promotion">促销</option>
                        <option value="workshop">工作坊</option>
                        <option value="seminar">研讨会</option>
                        <option value="other">其他</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">事件名称 *</label>
                      <input
                        type="text"
                        value={formData.eventName}
                        onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                        className="input"
                        placeholder="请输入事件名称"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="label">事件日期 *</label>
                    <input
                      type="date"
                      value={formData.eventDate}
                      onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="label">事件地点 *</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="input"
                      placeholder="请输入事件地点"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="label">备注</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="input"
                      rows={3}
                      placeholder="请输入备注信息..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingExhibition(null);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    {editingExhibition ? '更新' : '创建'}
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
