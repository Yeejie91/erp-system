import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Award, TrendingUp, Gift, Eye } from 'lucide-react';
import { Member, MembershipTier, MembershipStatus, Customer, PointTransaction, MembershipTierConfig } from '../types';
import { membersService, customersService, pointTransactionsService, membershipTierConfigsService, generateId } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { logOperation } from '../services/logger';
import { LogAction } from '../types';
import { formatCurrency } from '../utils/format';
import { format, addYears } from 'date-fns';

export default function Members() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);
  const [tierConfigs, setTierConfigs] = useState<MembershipTierConfig[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPointModal, setShowPointModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [filterTier, setFilterTier] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // 会员表单
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [tier, setTier] = useState<MembershipTier>(MembershipTier.REGULAR);
  const [expiryDate, setExpiryDate] = useState('');
  const [birthday, setBirthday] = useState('');
  const [notes, setNotes] = useState('');

  // 积分表单
  const [pointsType, setPointsType] = useState<'earn' | 'redeem' | 'adjust'>('earn');
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsDescription, setPointsDescription] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [membersData, customersData, pointsData, tierConfigsData] = await Promise.all([
      membersService.getAll(),
      customersService.getAll(),
      pointTransactionsService.getAll(),
      membershipTierConfigsService.getAll()
    ]);

    setMembers(membersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setCustomers(customersData);
    setPointTransactions(pointsData);
    setTierConfigs(tierConfigsData);
  };

  const generateMemberNumber = (tier: MembershipTier): string => {
    const prefix = tier.toUpperCase().substring(0, 1); // R/S/G/P/D
    const timestamp = Date.now().toString().slice(-8);
    return `${prefix}${timestamp}`;
  };

  const resetForm = () => {
    setSelectedCustomer('');
    setTier(MembershipTier.REGULAR);
    setExpiryDate('');
    setBirthday('');
    setNotes('');
    setEditingMember(null);
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setSelectedCustomer(member.customerId);
    setTier(member.tier);
    setExpiryDate(member.expiryDate ? format(new Date(member.expiryDate), 'yyyy-MM-dd') : '');
    setBirthday(member.birthday ? format(new Date(member.birthday), 'yyyy-MM-dd') : '');
    setNotes(member.notes || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!selectedCustomer) {
      alert('请选择客户');
      return;
    }

    // 检查客户是否已是会员
    if (!editingMember) {
      const existing = members.find(m => m.customerId === selectedCustomer);
      if (existing) {
        alert('该客户已是会员！');
        return;
      }
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;

    setLoading(true);
    try {
      if (editingMember) {
        // 更新
        const updated: Member = {
          ...editingMember,
          tier,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          birthday: birthday ? new Date(birthday) : undefined,
          notes: notes.trim() || undefined,
          updatedAt: new Date(),
        };

        await membersService.update(updated);

        await logOperation({
          userId: user.id,
          userName: user.name,
          action: LogAction.UPDATE,
          module: '会员管理',
          targetId: updated.id,
          targetName: updated.memberNumber,
          description: `更新会员 ${updated.customerName} (${updated.memberNumber})`,
        });

        alert('会员更新成功！');
      } else {
        // 新建
        const memberNumber = generateMemberNumber(tier);

        const newMember: Member = {
          id: generateId(),
          memberNumber,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          tier,
          points: 0,
          totalSpent: 0,
          status: 'active',
          joinDate: new Date(),
          expiryDate: expiryDate ? new Date(expiryDate) : addYears(new Date(), 1),
          birthday: birthday ? new Date(birthday) : undefined,
          notes: notes.trim() || undefined,
          createdBy: user.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await membersService.add(newMember);

        await logOperation({
          userId: user.id,
          userName: user.name,
          action: LogAction.CREATE,
          module: '会员管理',
          targetId: newMember.id,
          targetName: newMember.memberNumber,
          description: `添加会员 ${newMember.customerName} (${newMember.memberNumber})`,
        });

        alert(`会员添加成功！\n会员号：${memberNumber}`);
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustPoints = async () => {
    if (!selectedMember || !user) return;

    if (pointsAmount === 0) {
      alert('请输入积分数量');
      return;
    }

    setLoading(true);
    try {
      const beforePoints = selectedMember.points;
      let afterPoints = beforePoints;

      if (pointsType === 'earn') {
        afterPoints = beforePoints + Math.abs(pointsAmount);
      } else if (pointsType === 'redeem') {
        afterPoints = Math.max(0, beforePoints - Math.abs(pointsAmount));
      } else {
        afterPoints = beforePoints + pointsAmount; // adjust可以是正负
      }

      // 创建积分记录
      const transaction: PointTransaction = {
        id: generateId(),
        memberId: selectedMember.id,
        memberNumber: selectedMember.memberNumber,
        type: pointsType,
        points: Math.abs(pointsAmount),
        beforePoints,
        afterPoints,
        description: pointsDescription || `${pointsType === 'earn' ? '获得' : pointsType === 'redeem' ? '兑换' : '调整'}积分`,
        operator: user.name,
        createdAt: new Date(),
      };

      await pointTransactionsService.add(transaction);

      // 更新会员积分
      const updatedMember: Member = {
        ...selectedMember,
        points: afterPoints,
        updatedAt: new Date(),
      };

      await membersService.update(updatedMember);

      await logOperation({
        userId: user.id,
        userName: user.name,
        action: LogAction.UPDATE,
        module: '会员管理',
        targetId: selectedMember.id,
        targetName: selectedMember.memberNumber,
        description: `${pointsType === 'earn' ? '增加' : pointsType === 'redeem' ? '扣减' : '调整'}积分 ${Math.abs(pointsAmount)}分`,
      });

      alert('积分调整成功！');
      setShowPointModal(false);
      setPointsAmount(0);
      setPointsDescription('');
      loadData();
    } catch (error) {
      console.error('积分调整失败:', error);
      alert('积分调整失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (member: Member) => {
    if (!user) return;

    if (!confirm(`确定要删除会员"${member.customerName}"吗？`)) {
      return;
    }

    try {
      await membersService.delete(member.id);

      await logOperation({
        userId: user.id,
        userName: user.name,
        action: LogAction.DELETE,
        module: '会员管理',
        targetId: member.id,
        targetName: member.memberNumber,
        description: `删除会员 ${member.customerName} (${member.memberNumber})`,
      });

      alert('删除成功！');
      loadData();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const getTierLabel = (tier: MembershipTier) => {
    const config = tierConfigs.find(c => c.tier === tier && c.isActive);
    return config ? config.name : '未知';
  };

  const getTierConfig = (tier: MembershipTier) => {
    return tierConfigs.find(c => c.tier === tier && c.isActive) || null;
  };

  const getTierColor = (tier: MembershipTier) => {
    const config = getTierConfig(tier);
    if (config) {
      // 使用配置中的颜色，转换为合适的背景色
      const color = config.color;
      return `text-white`; // 使用白色文字，背景色通过style设置
    }
    return 'bg-gray-100 text-gray-800'; // 默认颜色
  };

  const getStatusLabel = (status: MembershipStatus) => {
    const labels: Record<MembershipStatus, string> = {
      active: '有效',
      expired: '已过期',
      suspended: '已暂停',
    };
    return labels[status];
  };

  const getStatusColor = (status: MembershipStatus) => {
    const colors: Record<MembershipStatus, string> = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      suspended: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status];
  };

  const getTierDiscount = (tier: MembershipTier): number => {
    const config = getTierConfig(tier);
    return config ? config.discountRate : 0;
  };

  const getTierPointsRate = (tier: MembershipTier): number => {
    const config = getTierConfig(tier);
    return config ? config.pointsRate : 1;
  };

  const filteredMembers = filterTier === 'all'
    ? members
    : members.filter(m => m.tier === filterTier);

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === 'active').length;
  const totalPoints = members.reduce((sum, m) => sum + m.points, 0);

  const memberPoints = selectedMember
    ? pointTransactions.filter(p => p.memberId === selectedMember.id)
    : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">会员管理</h1>
          <p className="text-gray-600 mt-1">管理会员信息、等级和积分</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>添加会员</span>
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">会员总数</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalMembers}</p>
              <p className="text-xs text-gray-500 mt-1">有效会员 {activeMembers}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Award className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">积分总额</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalPoints.toLocaleString()}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <TrendingUp className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">累计消费</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(members.reduce((sum, m) => sum + m.totalSpent, 0))}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Gift className="text-green-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* 筛选 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">会员等级:</label>
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="input text-sm"
          >
            <option value="all">全部</option>
            {tierConfigs.filter(config => config.isActive).map(config => (
              <option key={config.tier} value={config.tier}>
                {config.name}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            共 {filteredMembers.length} 位会员
          </span>
        </div>
      </div>

      {/* 会员权益说明 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">🎁 会员权益说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {tierConfigs.filter(config => config.isActive).map(config => (
            <div 
              key={config.tier}
              className="bg-white rounded p-3 border-2"
              style={{ borderColor: config.color + '40' }}
            >
              <p 
                className="font-semibold"
                style={{ color: config.color }}
              >
                {config.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">消费积分：{config.pointsRate}倍</p>
              <p className="text-xs text-green-600">折扣：{config.discountRate}%</p>
              {config.minSpent > 0 && (
                <p className="text-xs text-gray-500">最低消费：RM{config.minSpent.toLocaleString()}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 会员列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">会员号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">等级</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">积分</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">累计消费</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">到期日</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMembers.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {member.memberNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>
                    {member.customerName}
                    <p className="text-xs text-gray-500">{member.customerPhone}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(() => {
                    const tierConfig = getTierConfig(member.tier);
                    return (
                      <span 
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTierColor(member.tier)}`}
                        style={{ backgroundColor: tierConfig?.color || '#6B7280' }}
                      >
                        {getTierLabel(member.tier)}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                  {member.points.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(member.totalSpent)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(member.status)}`}>
                    {getStatusLabel(member.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.expiryDate ? format(new Date(member.expiryDate), 'yyyy-MM-dd') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setShowDetailModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      title="查看详情"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setShowPointModal(true);
                      }}
                      className="text-purple-600 hover:text-purple-900"
                      title="调整积分"
                    >
                      <Gift size={18} />
                    </button>
                    <button
                      onClick={() => handleEdit(member)}
                      className="text-green-600 hover:text-green-900"
                      title="编辑"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(member)}
                      className="text-red-600 hover:text-red-900"
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <Award size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">暂无会员</p>
          </div>
        )}
      </div>

      {/* 添加/编辑会员模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingMember ? '编辑会员' : '添加会员'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">选择客户 *</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="input"
                  required
                  disabled={!!editingMember}
                >
                  <option value="">请选择客户</option>
                  {customers.map(customer => {
                    const isMember = members.some(m => m.customerId === customer.id && m.id !== editingMember?.id);
                    return (
                      <option key={customer.id} value={customer.id} disabled={isMember}>
                        {customer.name} - {customer.phone} {isMember ? '(已是会员)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="label">会员等级 *</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as MembershipTier)}
                  className="input"
                  required
                >
                  {tierConfigs.filter(config => config.isActive).map(config => (
                    <option key={config.tier} value={config.tier}>
                      {config.name} ({config.discountRate}%折扣, {config.pointsRate}倍积分)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  选定等级将享有相应的折扣和积分倍率
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">到期日期</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">不填默认1年后</p>
                </div>
                <div>
                  <label className="label">生日</label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">生日当月可享优惠</p>
                </div>
              </div>

              <div>
                <label className="label">备注</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 积分调整模态框 */}
      {showPointModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">调整积分</h2>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-600">会员</p>
              <p className="font-medium">{selectedMember.customerName}</p>
              <p className="text-sm text-gray-600 mt-2">当前积分</p>
              <p className="text-2xl font-bold text-blue-600">{selectedMember.points.toLocaleString()}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">操作类型 *</label>
                <select
                  value={pointsType}
                  onChange={(e) => setPointsType(e.target.value as 'earn' | 'redeem' | 'adjust')}
                  className="input"
                >
                  <option value="earn">获得积分（增加）</option>
                  <option value="redeem">兑换积分（扣减）</option>
                  <option value="adjust">手动调整（可正可负）</option>
                </select>
              </div>

              <div>
                <label className="label">积分数量 *</label>
                <input
                  type="number"
                  value={pointsAmount || ''}
                  onChange={(e) => setPointsAmount(Number(e.target.value))}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">说明</label>
                <input
                  type="text"
                  value={pointsDescription}
                  onChange={(e) => setPointsDescription(e.target.value)}
                  className="input"
                  placeholder="如：购物赠送、兑换礼品、系统调整"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-gray-700">
                  调整后积分：
                  <span className="font-bold text-blue-600 ml-2">
                    {pointsType === 'earn' 
                      ? (selectedMember.points + Math.abs(pointsAmount)).toLocaleString()
                      : pointsType === 'redeem'
                      ? Math.max(0, selectedMember.points - Math.abs(pointsAmount)).toLocaleString()
                      : (selectedMember.points + pointsAmount).toLocaleString()
                    }
                  </span>
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowPointModal(false);
                  setPointsAmount(0);
                  setPointsDescription('');
                }}
                className="btn btn-secondary"
                disabled={loading}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAdjustPoints}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? '处理中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 会员详情模态框 */}
      {showDetailModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">会员详情</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">会员号</p>
                  <p className="font-medium">{selectedMember.memberNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">等级</p>
                  {(() => {
                    const tierConfig = getTierConfig(selectedMember.tier);
                    return (
                      <span 
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTierColor(selectedMember.tier)}`}
                        style={{ backgroundColor: tierConfig?.color || '#6B7280' }}
                      >
                        {getTierLabel(selectedMember.tier)}
                      </span>
                    );
                  })()}
                </div>
                <div>
                  <p className="text-sm text-gray-600">姓名</p>
                  <p className="font-medium">{selectedMember.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">电话</p>
                  <p className="font-medium">{selectedMember.customerPhone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">当前积分</p>
                  <p className="text-lg font-bold text-blue-600">{selectedMember.points.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">累计消费</p>
                  <p className="font-medium">{formatCurrency(selectedMember.totalSpent)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">加入日期</p>
                  <p className="font-medium">{format(new Date(selectedMember.joinDate), 'yyyy-MM-dd')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">到期日期</p>
                  <p className="font-medium">
                    {selectedMember.expiryDate ? format(new Date(selectedMember.expiryDate), 'yyyy-MM-dd') : '-'}
                  </p>
                </div>
                {selectedMember.birthday && (
                  <div>
                    <p className="text-sm text-gray-600">生日</p>
                    <p className="font-medium">{format(new Date(selectedMember.birthday), 'MM-dd')}</p>
                  </div>
                )}
              </div>

              {/* 会员权益 */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">会员权益</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">购物折扣</p>
                    <p className="font-bold text-green-600">{getTierDiscount(selectedMember.tier)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">积分倍率</p>
                    <p className="font-bold text-blue-600">{getTierPointsRate(selectedMember.tier)}倍</p>
                  </div>
                </div>
              </div>

              {/* 积分记录 */}
              <div>
                <h3 className="font-semibold mb-2">积分记录</h3>
                {memberPoints.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">日期</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">积分</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">说明</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {memberPoints.slice(0, 10).map((pt) => (
                          <tr key={pt.id}>
                            <td className="px-4 py-3 text-xs text-gray-900">
                              {format(new Date(pt.createdAt), 'yyyy-MM-dd')}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {pt.type === 'earn' && <span className="text-green-600">获得</span>}
                              {pt.type === 'redeem' && <span className="text-red-600">兑换</span>}
                              {pt.type === 'adjust' && <span className="text-blue-600">调整</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-right font-medium">
                              {pt.type === 'earn' && <span className="text-green-600">+{pt.points}</span>}
                              {pt.type === 'redeem' && <span className="text-red-600">-{pt.points}</span>}
                              {pt.type === 'adjust' && <span className="text-blue-600">{pt.points > 0 ? '+' : ''}{pt.points}</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">{pt.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">暂无积分记录</p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedMember(null);
                }}
                className="btn btn-secondary"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

