import { useState, useEffect } from 'react';
import { Download, Upload, Database, Clock, CheckCircle, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { exportData, importData } from '../services/db';
import { format } from 'date-fns';

interface BackupRecord {
  id: string;
  name: string;
  size: number;
  createdAt: Date;
  type: 'manual' | 'auto';
  status: 'success' | 'failed' | 'in_progress';
}

export default function DataBackup() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [lastBackup, setLastBackup] = useState<Date | null>(null);

  useEffect(() => {
    loadBackups();
    loadBackupSettings();
  }, []);

  const loadBackups = () => {
    const savedBackups = localStorage.getItem('backupRecords');
    if (savedBackups) {
      const parsedBackups = JSON.parse(savedBackups).map((backup: any) => ({
        ...backup,
        createdAt: new Date(backup.createdAt)
      }));
      setBackups(parsedBackups.sort((a: BackupRecord, b: BackupRecord) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    }
  };

  const loadBackupSettings = () => {
    const settings = localStorage.getItem('backupSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      setAutoBackupEnabled(parsed.autoBackup || false);
      setBackupFrequency(parsed.frequency || 'daily');
      setLastBackup(parsed.lastBackup ? new Date(parsed.lastBackup) : null);
    }
  };

  const saveBackupSettings = () => {
    const settings = {
      autoBackup: autoBackupEnabled,
      frequency: backupFrequency,
      lastBackup: lastBackup?.toISOString()
    };
    localStorage.setItem('backupSettings', JSON.stringify(settings));
  };

  const createBackup = async (type: 'manual' | 'auto' = 'manual') => {
    setLoading(true);
    try {
      const data = await exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const size = blob.size;
      
      const backupRecord: BackupRecord = {
        id: `backup_${Date.now()}`,
        name: `备份_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`,
        size,
        createdAt: new Date(),
        type,
        status: 'success'
      };

      // 保存备份记录
      const updatedBackups = [backupRecord, ...backups];
      setBackups(updatedBackups);
      localStorage.setItem('backupRecords', JSON.stringify(updatedBackups));

      // 更新最后备份时间
      setLastBackup(new Date());
      saveBackupSettings();

      // 自动下载备份文件
      if (type === 'manual') {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `erp_backup_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }

      alert('备份创建成功！');
    } catch (error) {
      console.error('创建备份失败:', error);
      alert('备份失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (!confirm('确定要恢复此备份吗？这将覆盖当前所有数据！')) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setLoading(true);
      try {
        const text = await file.text();
        await importData(text);
        alert('数据恢复成功！页面将刷新。');
        window.location.reload();
      } catch (error) {
        console.error('恢复备份失败:', error);
        alert('恢复失败，请检查文件格式');
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const deleteBackup = (backupId: string) => {
    if (!confirm('确定要删除此备份记录吗？')) return;
    
    const updatedBackups = backups.filter(b => b.id !== backupId);
    setBackups(updatedBackups);
    localStorage.setItem('backupRecords', JSON.stringify(updatedBackups));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'failed':
        return <AlertCircle className="text-red-500" size={16} />;
      case 'in_progress':
        return <RefreshCw className="text-blue-500 animate-spin" size={16} />;
      default:
        return <AlertCircle className="text-gray-500" size={16} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '成功';
      case 'failed':
        return '失败';
      case 'in_progress':
        return '进行中';
      default:
        return '未知';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据备份管理</h1>
          <p className="text-gray-500 mt-1">管理系统数据备份和恢复</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => createBackup('manual')}
            disabled={loading}
            className="btn btn-primary"
          >
            <Database className="mr-2" size={16} />
            {loading ? '备份中...' : '创建备份'}
          </button>
        </div>
      </div>

      {/* 备份设置 */}
      <div className="card mb-6">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">自动备份设置</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">启用自动备份</h4>
                <p className="text-sm text-gray-500">定期自动创建数据备份</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBackupEnabled}
                  onChange={(e) => {
                    setAutoBackupEnabled(e.target.checked);
                    saveBackupSettings();
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div>
              <label className="label">备份频率</label>
              <select
                value={backupFrequency}
                onChange={(e) => {
                  setBackupFrequency(e.target.value as any);
                  saveBackupSettings();
                }}
                className="input"
                disabled={!autoBackupEnabled}
              >
                <option value="daily">每日</option>
                <option value="weekly">每周</option>
                <option value="monthly">每月</option>
              </select>
            </div>
            <div>
              <label className="label">最后备份时间</label>
              <div className="input bg-gray-50">
                {lastBackup ? format(lastBackup, 'yyyy-MM-dd HH:mm:ss') : '从未备份'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 备份记录 */}
      <div className="card">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">备份记录</h3>
          {backups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Database size={48} className="mx-auto mb-4 text-gray-400" />
              <p>暂无备份记录</p>
              <p className="text-sm mt-2">点击"创建备份"开始备份数据</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>备份名称</th>
                    <th>类型</th>
                    <th>文件大小</th>
                    <th>创建时间</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.id}>
                      <td className="font-medium">{backup.name}</td>
                      <td>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          backup.type === 'manual' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {backup.type === 'manual' ? '手动' : '自动'}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600">{formatFileSize(backup.size)}</td>
                      <td className="text-sm text-gray-600">{format(backup.createdAt, 'yyyy-MM-dd HH:mm:ss')}</td>
                      <td>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(backup.status)}
                          <span className="text-sm">{getStatusText(backup.status)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => restoreBackup(backup.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="恢复备份"
                          >
                            <Upload size={16} />
                          </button>
                          <button
                            onClick={() => deleteBackup(backup.id)}
                            className="text-red-600 hover:text-red-800"
                            title="删除记录"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 备份说明 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">备份说明</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 备份文件包含所有系统数据，包括客户、商品、订单、财务等信息</li>
          <li>• 建议定期创建备份，特别是在重要操作前</li>
          <li>• 恢复备份将覆盖当前所有数据，请谨慎操作</li>
          <li>• 备份文件以JSON格式保存，便于查看和编辑</li>
          <li>• 自动备份功能将在后台定期执行，无需手动干预</li>
        </ul>
      </div>
    </div>
  );
}
