import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { Supplier } from '../types';
import { suppliersService, generateId } from '../services/db';
import { format } from 'date-fns';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const data = await suppliersService.getAll();
    setSuppliers(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const supplierData: Supplier = {
      id: editingSupplier?.id || generateId(),
      ...formData,
      products: editingSupplier?.products || [],
      createdAt: editingSupplier?.createdAt || new Date(),
    };

    if (editingSupplier) {
      await suppliersService.update(supplierData);
    } else {
      await suppliersService.add(supplierData);
    }

    setIsModalOpen(false);
    setEditingSupplier(null);
    resetForm();
    loadSuppliers();
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact: supplier.contact,
      phone: supplier.phone,
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个供应商吗？')) {
      await suppliersService.delete(id);
      loadSuppliers();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    });
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">供应商管理</h1>
          <p className="text-gray-500 mt-1">管理您的供应商信息</p>
        </div>
        <button
          onClick={() => {
            setEditingSupplier(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>添加供应商</span>
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜索供应商名称、联系人或电话..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* 供应商列表 */}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>供应商名称</th>
              <th>联系人</th>
              <th>电话</th>
              <th>邮箱</th>
              <th>地址</th>
              <th>创建时间</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td className="font-medium">{supplier.name}</td>
                <td>{supplier.contact}</td>
                <td>{supplier.phone}</td>
                <td className="text-sm">{supplier.email || '-'}</td>
                <td className="text-sm">{supplier.address || '-'}</td>
                <td className="text-sm">{format(new Date(supplier.createdAt), 'yyyy-MM-dd')}</td>
                <td className="text-sm text-gray-500">{supplier.notes || '-'}</td>
                <td>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id)}
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

        {filteredSuppliers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? '没有找到匹配的供应商' : '还没有添加供应商'}
          </div>
        )}
      </div>

      {/* 添加/编辑模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingSupplier ? '编辑供应商' : '添加供应商'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">供应商名称 *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">联系人 *</label>
                    <input
                      type="text"
                      required
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">电话 *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">邮箱</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">地址</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">备注</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingSupplier(null);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingSupplier ? '保存' : '添加'}
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

