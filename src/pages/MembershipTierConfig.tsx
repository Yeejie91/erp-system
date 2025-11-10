import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Settings, Award, Percent, Star } from 'lucide-react';
import { MembershipTierConfig, MembershipTier } from '../types';
import { membershipTierConfigsService, generateId } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { logOperation } from '../services/logger';
import { LogAction } from '../types';

export default function MembershipTierConfigPage() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<MembershipTierConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<MembershipTierConfig | null>(null);
  const [formData, setFormData] = useState({
    tier: MembershipTier.REGULAR,
    name: '',
    discountRate: 0,
    pointsRate: 1,
    minSpent: 0,
    color: '#3B82F6',
    description: '',
    isActive: true,
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const data = await membershipTierConfigsService.getAll();
    setConfigs(data.sort((a, b) => a.tier.localeCompare(b.tier)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    const configData: MembershipTierConfig = {
      id: editingConfig?.id || generateId(),
      ...formData,
      createdBy: user.name,
      createdAt: editingConfig?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    try {
      if (editingConfig) {
        await membershipTierConfigsService.update(configData);
        await logOperation({
          userId: user.id,
          userName: user.name,
          action: LogAction.UPDATE,
          module: '会员等级配置',
          targetId: configData.id,
          targetName: configData.name,
          description: `更新会员等级配置：${configData.name}`,
        });
        alert('会员等级配置更新成功！');
      } else {
        await membershipTierConfigsService.add(configData);
        await logOperation({
          userId: user.id,
          userName: user.name,
          action: LogAction.CREATE,
          module: '会员等级配置',
          targetId: configData.id,
          targetName: configData.name,
          description: `创建会员等级配置：${configData.name}`,
        });
        alert('会员等级配置创建成功！');
      }

      setIsModalOpen(false);
      setEditingConfig(null);
      setFormData({
        tier: MembershipTier.REGULAR,
        name: '',
        discountRate: 0,
        pointsRate: 1,
        minSpent: 0,
        color: '#3B82F6',
        description: '',
        isActive: true,
      });
      loadConfigs();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleEdit = (config: MembershipTierConfig) => {
    setEditingConfig(config);
    setFormData({
      tier: config.tier,
      name: config.name,
      discountRate: config.discountRate,
      pointsRate: config.pointsRate,
      minSpent: config.minSpent,
      color: config.color,
      description: config.description || '',
      isActive: config.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    if (!confirm('确定要删除这个会员等级配置吗？')) return;

    try {
      await membershipTierConfigsService.delete(id);
      await logOperation({
        userId: user.id,
        userName: user.name,
        action: LogAction.DELETE,
        module: '会员等级配置',
        targetId: id,
        targetName: '会员等级配置',
        description: '删除会员等级配置',
      });
      alert('会员等级配置删除成功！');
      loadConfigs();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const getTierIcon = (tier: MembershipTier) => {
    switch (tier) {
      case MembershipTier.REGULAR:
        return <Award size={20} className="text-gray-500" />;
      case MembershipTier.VIP:
        return <Star size={20} className="text-blue-500" />;
      case MembershipTier.SVIP:
        return <Star size={20} className="text-purple-500" />;
      case MembershipTier.PROJECT:
        return <Settings size={20} className="text-orange-500" />;
      default:
        return <Award size={20} className="text-gray-500" />;
    }
  };

  const getTierLabel = (tier: MembershipTier) => {
    switch (tier) {
      case MembershipTier.REGULAR:
        return '普通会员';
      case MembershipTier.VIP:
        return 'VIP会员';
      case MembershipTier.SVIP:
        return 'SVIP会员';
      case MembershipTier.PROJECT:
        return '专案会员';
      default:
        return '未知';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">会员等级配置</h1>
        <button
          onClick={() => {
            setEditingConfig(null);
            setFormData({
              tier: MembershipTier.REGULAR,
              name: '',
              discountRate: 0,
              pointsRate: 1,
              minSpent: 0,
              color: '#3B82F6',
              description: '',
              isActive: true,
            });
            setIsModalOpen(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>新增等级配置</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {configs.map((config) => (
          <div
            key={config.id}
            className="card p-4 border-l-4"
            style={{ borderLeftColor: config.color }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getTierIcon(config.tier)}
                <h3 className="font-semibold" style={{ color: config.color }}>
                  {config.name}
                </h3>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleEdit(config)}
                  className="text-blue-600 hover:text-blue-800"
                  title="编辑"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(config.id)}
                  className="text-red-600 hover:text-red-800"
                  title="删除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">等级类型:</span>
                <span className="font-medium">{getTierLabel(config.tier)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">折扣率:</span>
                <span className="font-medium text-green-600">{config.discountRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">积分倍率:</span>
                <span className="font-medium text-blue-600">{config.pointsRate}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">最低消费:</span>
                <span className="font-medium">RM{config.minSpent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">状态:</span>
                <span className={`font-medium ${config.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {config.isActive ? '启用' : '禁用'}
                </span>
              </div>
              {config.description && (
                <div className="text-gray-500 text-xs mt-2">
                  {config.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {configs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Award size={48} className="mx-auto mb-4 text-gray-400" />
          <p>还没有会员等级配置</p>
          <p className="text-sm">点击"新增等级配置"开始设置</p>
        </div>
      )}

      {/* 配置表单模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingConfig ? '编辑等级配置' : '新增等级配置'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">等级类型 *</label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value as MembershipTier })}
                    className="input"
                    required
                  >
                    <option value={MembershipTier.REGULAR}>普通会员</option>
                    <option value={MembershipTier.VIP}>VIP会员</option>
                    <option value={MembershipTier.SVIP}>SVIP会员</option>
                    <option value={MembershipTier.PROJECT}>专案会员</option>
                  </select>
                </div>

                <div>
                  <label className="label">显示名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="例如：VIP会员"
                    required
                  />
                </div>

                <div>
                  <label className="label">折扣率 (%) *</label>
                  <input
                    type="number"
                    value={formData.discountRate}
                    onChange={(e) => setFormData({ ...formData, discountRate: Number(e.target.value) })}
                    className="input"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                  />
                </div>

                <div>
                  <label className="label">积分倍率 *</label>
                  <input
                    type="number"
                    value={formData.pointsRate}
                    onChange={(e) => setFormData({ ...formData, pointsRate: Number(e.target.value) })}
                    className="input"
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>

                <div>
                  <label className="label">最低消费要求 (RM)</label>
                  <input
                    type="number"
                    value={formData.minSpent}
                    onChange={(e) => setFormData({ ...formData, minSpent: Number(e.target.value) })}
                    className="input"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="label">显示颜色</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-8 border rounded"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="input flex-1"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows={3}
                    placeholder="等级描述..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    启用此等级配置
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingConfig(null);
                    }}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingConfig ? '保存' : '创建'}
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
