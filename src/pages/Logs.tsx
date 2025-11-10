import { useState, useEffect } from 'react';
import { FileText, Filter, Download, Trash2 } from 'lucide-react';
import { OperationLog, LogAction } from '../types';
import { operationLogsService } from '../services/db';
import { getActionLabel } from '../services/logger';
import { format, startOfDay, endOfDay } from 'date-fns';

export default function Logs() {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<OperationLog[]>([]);
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filterModule, filterAction, filterUser, dateRange]);

  const loadLogs = async () => {
    const data = await operationLogsService.getAll();
    setLogs(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // 时间范围过滤
    const startDate = startOfDay(new Date(dateRange.start));
    const endDate = endOfDay(new Date(dateRange.end));
    filtered = filtered.filter(log => {
      const logDate = new Date(log.createdAt);
      return logDate >= startDate && logDate <= endDate;
    });

    // 模块过滤
    if (filterModule !== 'all') {
      filtered = filtered.filter(log => log.module === filterModule);
    }

    // 操作类型过滤
    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action === filterAction);
    }

    // 用户过滤
    if (filterUser) {
      filtered = filtered.filter(log =>
        log.userName.toLowerCase().includes(filterUser.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  const getModules = () => {
    const modules = new Set(logs.map(log => log.module));
    return Array.from(modules);
  };

  const getActionBadgeColor = (action: LogAction) => {
    switch (action) {
      case LogAction.CREATE:
        return 'bg-green-100 text-green-800';
      case LogAction.UPDATE:
        return 'bg-blue-100 text-blue-800';
      case LogAction.DELETE:
        return 'bg-red-100 text-red-800';
      case LogAction.CANCEL:
        return 'bg-orange-100 text-orange-800';
      case LogAction.LOGIN:
        return 'bg-purple-100 text-purple-800';
      case LogAction.LOGOUT:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['时间', '用户', '操作', '模块', '目标', '描述'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        log.userName,
        getActionLabel(log.action),
        log.module,
        log.targetName || '-',
        log.description,
      ].join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `操作日志_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearOldLogs = async () => {
    if (!confirm('确定要清除30天前的日志吗？\n\n此操作不可恢复！')) {
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    let count = 0;
    for (const log of logs) {
      if (new Date(log.createdAt) < cutoffDate) {
        await operationLogsService.delete(log.id);
        count++;
      }
    }

    alert(`已清除 ${count} 条旧日志`);
    loadLogs();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">操作日志</h1>
          <p className="text-gray-600 mt-1">系统操作记录追溯</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={exportLogs}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <Download size={20} />
            <span>导出CSV</span>
          </button>
          <button
            onClick={clearOldLogs}
            className="btn bg-red-600 text-white hover:bg-red-700 flex items-center space-x-2"
          >
            <Trash2 size={20} />
            <span>清除旧日志</span>
          </button>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h3 className="font-semibold text-gray-800">筛选条件</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="label text-xs">开始日期</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="label text-xs">结束日期</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="label text-xs">模块</label>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="input text-sm"
            >
              <option value="all">全部</option>
              {getModules().map(module => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">操作类型</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="input text-sm"
            >
              <option value="all">全部</option>
              <option value={LogAction.CREATE}>创建</option>
              <option value={LogAction.UPDATE}>更新</option>
              <option value={LogAction.DELETE}>删除</option>
              <option value={LogAction.CANCEL}>作废</option>
              <option value={LogAction.LOGIN}>登录</option>
              <option value={LogAction.LOGOUT}>登出</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">用户</label>
            <input
              type="text"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="input text-sm"
              placeholder="搜索用户名"
            />
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          显示 <span className="font-semibold text-primary-600">{filteredLogs.length}</span> 条记录
          （共 {logs.length} 条）
        </div>
      </div>

      {/* 日志列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模块</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">目标</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {log.userName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.module}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.targetName || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">暂无日志记录</p>
          </div>
        )}
      </div>
    </div>
  );
}

