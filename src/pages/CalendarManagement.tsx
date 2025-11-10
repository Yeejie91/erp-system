import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarEvent, CalendarEventType } from '../types';
import { calendarEventsService, generateId } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { logOperation } from '../services/logger';
import { LogAction } from '../types';
import { format } from 'date-fns';

export default function CalendarManagement() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // 表单状态
  const [title, setTitle] = useState('');
  const [type, setType] = useState<CalendarEventType>(CalendarEventType.HOLIDAY);
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#ef4444');
  const [isRecurring, setIsRecurring] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const data = await calendarEventsService.getAll();
    setEvents(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const resetForm = () => {
    setTitle('');
    setType(CalendarEventType.HOLIDAY);
    setDate('');
    setEndDate('');
    setDescription('');
    setColor('#ef4444');
    setIsRecurring(false);
    setEditingEvent(null);
  };

  const handleEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setType(event.type);
    setDate(format(new Date(event.date), 'yyyy-MM-dd'));
    setEndDate(event.endDate ? format(new Date(event.endDate), 'yyyy-MM-dd') : '');
    setDescription(event.description || '');
    setColor(event.color || '#ef4444');
    setIsRecurring(event.isRecurring || false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!title.trim() || !date) {
      alert('请填写标题和日期');
      return;
    }

    setLoading(true);
    try {
      if (editingEvent) {
        // 更新
        const updated: CalendarEvent = {
          ...editingEvent,
          title: title.trim(),
          type,
          date: new Date(date),
          endDate: endDate ? new Date(endDate) : undefined,
          description: description.trim() || undefined,
          color: color || undefined,
          isRecurring,
          updatedAt: new Date(),
        };

        await calendarEventsService.update(updated);

        await logOperation({
          userId: user.id,
          userName: user.name,
          action: LogAction.UPDATE,
          module: '日历管理',
          targetId: updated.id,
          targetName: updated.title,
          description: `更新日历事件 ${updated.title}`,
        });

        alert('更新成功！');
      } else {
        // 新建
        const newEvent: CalendarEvent = {
          id: generateId(),
          title: title.trim(),
          type,
          date: new Date(date),
          endDate: endDate ? new Date(endDate) : undefined,
          description: description.trim() || undefined,
          color: color || undefined,
          isRecurring,
          createdBy: user.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await calendarEventsService.add(newEvent);

        await logOperation({
          userId: user.id,
          userName: user.name,
          action: LogAction.CREATE,
          module: '日历管理',
          targetId: newEvent.id,
          targetName: newEvent.title,
          description: `添加日历事件 ${newEvent.title}`,
        });

        alert('添加成功！');
      }

      setShowModal(false);
      resetForm();
      loadEvents();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!user) return;

    if (!confirm(`确定要删除"${event.title}"吗？`)) {
      return;
    }

    try {
      await calendarEventsService.delete(event.id);

      await logOperation({
        userId: user.id,
        userName: user.name,
        action: LogAction.DELETE,
        module: '日历管理',
        targetId: event.id,
        targetName: event.title,
        description: `删除日历事件 ${event.title}`,
      });

      alert('删除成功！');
      loadEvents();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const getTypeLabel = (type: CalendarEventType) => {
    const labels: Record<CalendarEventType, string> = {
      [CalendarEventType.HOLIDAY]: '公共假期',
      [CalendarEventType.STORE_CLOSURE]: '店休日',
      [CalendarEventType.SPECIAL_EVENT]: '特殊日子',
      [CalendarEventType.REMINDER]: '提醒事项',
    };
    return labels[type];
  };

  const getTypeColor = (type: CalendarEventType) => {
    const colors: Record<CalendarEventType, string> = {
      [CalendarEventType.HOLIDAY]: 'bg-red-100 text-red-800',
      [CalendarEventType.STORE_CLOSURE]: 'bg-gray-100 text-gray-800',
      [CalendarEventType.SPECIAL_EVENT]: 'bg-purple-100 text-purple-800',
      [CalendarEventType.REMINDER]: 'bg-blue-100 text-blue-800',
    };
    return colors[type];
  };

  const filteredEvents = filterType === 'all'
    ? events
    : events.filter(e => e.type === filterType);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">日历管理</h1>
          <p className="text-gray-600 mt-1">管理假期、店休日和特殊日子</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>添加事件</span>
        </button>
      </div>

      {/* 筛选 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">类型:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input text-sm"
          >
            <option value="all">全部</option>
            <option value={CalendarEventType.HOLIDAY}>公共假期</option>
            <option value={CalendarEventType.STORE_CLOSURE}>店休日</option>
            <option value={CalendarEventType.SPECIAL_EVENT}>特殊日子</option>
            <option value={CalendarEventType.REMINDER}>提醒事项</option>
          </select>
          <span className="text-sm text-gray-500">
            共 {filteredEvents.length} 个事件
          </span>
        </div>
      </div>

      {/* 事件列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">重复</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEvents.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: event.color || '#ef4444' }}
                    />
                    <span className="text-sm font-medium text-gray-900">{event.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(event.type)}`}>
                    {getTypeLabel(event.type)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(event.date), 'yyyy-MM-dd')}
                  {event.endDate && ` 至 ${format(new Date(event.endDate), 'MM-dd')}`}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {event.description || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {event.isRecurring ? '每年' : '一次性'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleEdit(event)}
                      className="text-blue-600 hover:text-blue-900"
                      title="编辑"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(event)}
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

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">暂无日历事件</p>
          </div>
        )}
      </div>

      {/* 添加/编辑模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingEvent ? '编辑事件' : '添加事件'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">标题 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                  placeholder="如：国庆节、店休日"
                  required
                />
              </div>

              <div>
                <label className="label">事件类型 *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CalendarEventType)}
                  className="input"
                  required
                >
                  <option value={CalendarEventType.HOLIDAY}>公共假期</option>
                  <option value={CalendarEventType.STORE_CLOSURE}>店休日</option>
                  <option value={CalendarEventType.SPECIAL_EVENT}>特殊日子</option>
                  <option value={CalendarEventType.REMINDER}>提醒事项</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">开始日期 *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">结束日期（可选）</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input"
                    min={date}
                  />
                  <p className="text-xs text-gray-500 mt-1">多天事件可设置结束日期</p>
                </div>
              </div>

              <div>
                <label className="label">描述</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="事件的详细说明"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">标记颜色</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">在日历上的显示颜色</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">每年重复</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-2">
                    （如：每年的国庆节）
                  </p>
                </div>
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

