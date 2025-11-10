import { OperationLog, LogAction } from '../types';
import { operationLogsService, generateId } from './db';

// 记录操作日志
export async function logOperation(params: {
  userId: string;
  userName: string;
  action: LogAction;
  module: string;
  targetId?: string;
  targetName?: string;
  oldValue?: any;
  newValue?: any;
  description: string;
}): Promise<void> {
  try {
    const log: OperationLog = {
      id: generateId(),
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      module: params.module,
      targetId: params.targetId,
      targetName: params.targetName,
      oldValue: params.oldValue ? JSON.stringify(params.oldValue) : undefined,
      newValue: params.newValue ? JSON.stringify(params.newValue) : undefined,
      description: params.description,
      createdAt: new Date(),
    };
    
    await operationLogsService.add(log);
  } catch (error) {
    console.error('记录日志失败:', error);
  }
}

// 获取操作类型显示名称
export function getActionLabel(action: LogAction): string {
  const labels: Record<LogAction, string> = {
    [LogAction.CREATE]: '创建',
    [LogAction.UPDATE]: '更新',
    [LogAction.DELETE]: '删除',
    [LogAction.CANCEL]: '作废',
    [LogAction.LOGIN]: '登录',
    [LogAction.LOGOUT]: '登出',
  };
  return labels[action] || action;
}

// 获取最近的操作日志
export async function getRecentLogs(limit: number = 100): Promise<OperationLog[]> {
  try {
    const logs = await operationLogsService.getAll();
    return logs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('获取日志失败:', error);
    return [];
  }
}

// 获取指定用户的操作日志
export async function getUserLogs(userId: string, limit: number = 50): Promise<OperationLog[]> {
  try {
    const logs = await operationLogsService.getByIndex('by-user', userId);
    return logs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('获取用户日志失败:', error);
    return [];
  }
}

// 获取指定模块的操作日志
export async function getModuleLogs(module: string, limit: number = 50): Promise<OperationLog[]> {
  try {
    const logs = await operationLogsService.getByIndex('by-module', module);
    return logs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('获取模块日志失败:', error);
    return [];
  }
}

// 获取指定时间范围的日志
export async function getLogsByDateRange(startDate: Date, endDate: Date): Promise<OperationLog[]> {
  try {
    const logs = await operationLogsService.getAll();
    return logs.filter(log => {
      const logDate = new Date(log.createdAt);
      return logDate >= startDate && logDate <= endDate;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('获取日志失败:', error);
    return [];
  }
}

// 清理旧日志（保留最近N天）
export async function cleanOldLogs(daysToKeep: number = 90): Promise<number> {
  try {
    const logs = await operationLogsService.getAll();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let deletedCount = 0;
    for (const log of logs) {
      if (new Date(log.createdAt) < cutoffDate) {
        await operationLogsService.delete(log.id);
        deletedCount++;
      }
    }
    
    return deletedCount;
  } catch (error) {
    console.error('清理日志失败:', error);
    return 0;
  }
}

