import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';
import { Space, SpaceType, SpaceStatus } from '../types';
import { spacesService, generateId } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { logOperation } from '../services/logger';
import { LogAction } from '../types';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';

export default function Spaces() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(false);

  // 表单状态
  const [name, setName] = useState('');
  const [type, setType] = useState<SpaceType>(SpaceType.CLASSROOM);
  const [capacity, setCapacity] = useState(0);
  const [area, setArea] = useState(0);
  const [floor, setFloor] = useState('');
  const [facilities, setFacilities] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState(0);
  const [dailyRate, setDailyRate] = useState(0);
  const [monthlyRate, setMonthlyRate] = useState(0);
  const [status, setStatus] = useState<SpaceStatus>('available');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    const data = await spacesService.getAll();
    setSpaces(data.sort((a, b) => a.name.localeCompare(b.name)));
  };

  const resetForm = () => {
    setName('');
    setType(SpaceType.CLASSROOM);
    setCapacity(0);
    setArea(0);
    setFloor('');
    setFacilities('');
    setHourlyRate(0);
    setDailyRate(0);
    setMonthlyRate(0);
    setStatus('available');
    setDescription('');
    setEditingSpace(null);
  };

  const handleEdit = (space: Space) => {
    setEditingSpace(space);
    setName(space.name);
    setType(space.type);
    setCapacity(space.capacity);
    setArea(space.area);
    setFloor(space.floor || '');
    setFacilities(space.facilities.join(', '));
    setHourlyRate(space.hourlyRate);
    setDailyRate(space.dailyRate);
    setMonthlyRate(space.monthlyRate);
    setStatus(space.status);
    setDescription(space.description || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!name.trim()) {
      alert('请输入空间名称');
      return;
    }

    setLoading(true);
    try {
      const facilitiesArray = facilities
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      if (editingSpace) {
        // 更新
        const updated: Space = {
          ...editingSpace,
          name: name.trim(),
          type,
          capacity,
          area,
          floor: floor.trim() || undefined,
          facilities: facilitiesArray,
          hourlyRate,
          dailyRate,
          monthlyRate,
          status,
          description: description.trim() || undefined,
          updatedAt: new Date(),
        };

        await spacesService.update(updated);

        await logOperation({
          userId: user.id,
          userName: user.name,
          action: LogAction.UPDATE,
          module: '空间管理',
          targetId: updated.id,
          targetName: updated.name,
          description: `更新空间 ${updated.name}`,
        });

        alert('空间更新成功！');
      } else {
        // 新建
        const newSpace: Space = {
          id: generateId(),
          name: name.trim(),
          type,
          capacity,
          area,
          floor: floor.trim() || undefined,
          facilities: facilitiesArray,
          hourlyRate,
          dailyRate,
          monthlyRate,
          status,
          description: description.trim() || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await spacesService.add(newSpace);

        await logOperation({
          userId: user.id,
          userName: user.name,
          action: LogAction.CREATE,
          module: '空间管理',
          targetId: newSpace.id,
          targetName: newSpace.name,
          description: `添加空间 ${newSpace.name}`,
        });

        alert('空间添加成功！');
      }

      setShowModal(false);
      resetForm();
      loadSpaces();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (space: Space) => {
    if (!user) return;

    if (!confirm(`确定要删除空间"${space.name}"吗？`)) {
      return;
    }

    try {
      await spacesService.delete(space.id);

      await logOperation({
        userId: user.id,
        userName: user.name,
        action: LogAction.DELETE,
        module: '空间管理',
        targetId: space.id,
        targetName: space.name,
        description: `删除空间 ${space.name}`,
      });

      alert('删除成功！');
      loadSpaces();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const getTypeLabel = (type: SpaceType) => {
    const labels: Record<SpaceType, string> = {
      [SpaceType.CLASSROOM]: '教室',
      [SpaceType.MEETING_ROOM]: '会议室',
      [SpaceType.ACTIVITY_SPACE]: '活动空间',
      [SpaceType.STUDY_ROOM]: '自习室',
      [SpaceType.EVENT_HALL]: '活动大厅',
      [SpaceType.OTHER]: '其他',
    };
    return labels[type];
  };

  const getStatusLabel = (status: SpaceStatus) => {
    const labels: Record<SpaceStatus, string> = {
      available: '可用',
      occupied: '使用中',
      maintenance: '维护中',
    };
    return labels[status];
  };

  const getStatusColor = (status: SpaceStatus) => {
    const colors: Record<SpaceStatus, string> = {
      available: 'bg-green-100 text-green-800',
      occupied: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status];
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">空间管理</h1>
          <p className="text-gray-600 mt-1">管理可出租的空间和场地</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>添加空间</span>
        </button>
      </div>

      {/* 空间列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {spaces.map((space) => (
          <div key={space.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{space.name}</h3>
                  <p className="text-sm text-gray-500">{getTypeLabel(space.type)}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(space.status)}`}>
                  {getStatusLabel(space.status)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin size={16} className="mr-2" />
                  <span>容纳人数：{space.capacity}人 | 面积：{space.area}㎡</span>
                </div>
                {space.floor && (
                  <div className="text-sm text-gray-600">
                    楼层：{space.floor}
                  </div>
                )}
                {space.facilities.length > 0 && (
                  <div className="text-sm text-gray-600">
                    设施：{space.facilities.join('、')}
                  </div>
                )}
              </div>

              <div className="border-t pt-4 mb-4">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">时租</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(space.hourlyRate)}/时</p>
                  </div>
                  <div>
                    <p className="text-gray-500">日租</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(space.dailyRate)}/天</p>
                  </div>
                  <div>
                    <p className="text-gray-500">月租</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(space.monthlyRate)}/月</p>
                  </div>
                </div>
              </div>

              {space.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{space.description}</p>
              )}

              <div className="flex items-center justify-end space-x-2 pt-4 border-t">
                <button
                  onClick={() => handleEdit(space)}
                  className="text-blue-600 hover:text-blue-800 p-2"
                  title="编辑"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDelete(space)}
                  className="text-red-600 hover:text-red-800 p-2"
                  title="删除"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {spaces.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <MapPin size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">还没有添加空间</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary mt-4"
          >
            添加第一个空间
          </button>
        </div>
      )}

      {/* 添加/编辑模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingSpace ? '编辑空间' : '添加空间'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">空间名称 *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">空间类型 *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as SpaceType)}
                    className="input"
                    required
                  >
                    <option value={SpaceType.CLASSROOM}>教室</option>
                    <option value={SpaceType.MEETING_ROOM}>会议室</option>
                    <option value={SpaceType.ACTIVITY_SPACE}>活动空间</option>
                    <option value={SpaceType.STUDY_ROOM}>自习室</option>
                    <option value={SpaceType.EVENT_HALL}>活动大厅</option>
                    <option value={SpaceType.OTHER}>其他</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">容纳人数 *</label>
                  <input
                    type="number"
                    value={capacity || ''}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="input"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="label">面积(㎡) *</label>
                  <input
                    type="number"
                    value={area || ''}
                    onChange={(e) => setArea(Number(e.target.value))}
                    className="input"
                    min="1"
                    step="0.1"
                    required
                  />
                </div>
                <div>
                  <label className="label">楼层</label>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="input"
                    placeholder="如：2楼"
                  />
                </div>
              </div>

              <div>
                <label className="label">设施</label>
                <input
                  type="text"
                  value={facilities}
                  onChange={(e) => setFacilities(e.target.value)}
                  className="input"
                  placeholder="用逗号分隔，如：投影仪, 白板, 音响"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">时租(RM/小时) *</label>
                  <input
                    type="number"
                    value={hourlyRate || ''}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="input"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="label">日租(RM/天) *</label>
                  <input
                    type="number"
                    value={dailyRate || ''}
                    onChange={(e) => setDailyRate(Number(e.target.value))}
                    className="input"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="label">月租(RM/月) *</label>
                  <input
                    type="number"
                    value={monthlyRate || ''}
                    onChange={(e) => setMonthlyRate(Number(e.target.value))}
                    className="input"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">状态 *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SpaceStatus)}
                  className="input"
                  required
                >
                  <option value="available">可用</option>
                  <option value="occupied">使用中</option>
                  <option value="maintenance">维护中</option>
                </select>
              </div>

              <div>
                <label className="label">描述</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="空间的详细描述"
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
    </div>
  );
}

