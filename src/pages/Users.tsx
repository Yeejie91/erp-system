import { useState, useEffect } from 'react';
import { UserPlus, Edit2, Key, Trash2, Shield } from 'lucide-react';
import { User, UserRole } from '../types';
import { usersService, generateId } from '../services/db';
import { createUser, getRoleLabel, getDefaultPermissions, resetPassword } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { logOperation } from '../services/logger';
import { LogAction } from '../types';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: UserRole.STAFF,
    phone: '',
    email: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await usersService.getAll();
    setUsers(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        // 更新用户
        const updated: User = {
          ...editingUser,
          name: formData.name,
          role: formData.role,
          permissions: getDefaultPermissions(formData.role),
          phone: formData.phone,
          email: formData.email,
          updatedAt: new Date(),
        };
        await usersService.update(updated);

        await logOperation({
          userId: currentUser!.id,
          userName: currentUser!.name,
          action: LogAction.UPDATE,
          module: '用户管理',
          targetId: updated.id,
          targetName: updated.name,
          description: `更新用户 ${updated.name}`,
        });

        alert('用户更新成功！');
      } else {
        // 创建新用户
        const newUser = await createUser(formData);

        await logOperation({
          userId: currentUser!.id,
          userName: currentUser!.name,
          action: LogAction.CREATE,
          module: '用户管理',
          targetId: newUser.id,
          targetName: newUser.name,
          description: `创建用户 ${newUser.name} (${getRoleLabel(newUser.role)})`,
        });

        alert('用户创建成功！');
      }

      setShowModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      name: user.name,
      role: user.role,
      phone: user.phone || '',
      email: user.email || '',
    });
    setShowModal(true);
  };

  const handleResetPassword = async (user: User) => {
    const newPassword = prompt(`重置 ${user.name} 的密码\n\n请输入新密码:`);
    if (!newPassword) return;

    if (newPassword.length < 6) {
      alert('密码长度至少6位');
      return;
    }

    const success = await resetPassword(user.id, newPassword);
    if (success) {
      await logOperation({
        userId: currentUser!.id,
        userName: currentUser!.name,
        action: LogAction.UPDATE,
        module: '用户管理',
        targetId: user.id,
        targetName: user.name,
        description: `重置 ${user.name} 的密码`,
      });

      alert('密码重置成功！');
    } else {
      alert('密码重置失败');
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const updated = { ...user, status: newStatus, updatedAt: new Date() };
    await usersService.update(updated);

    await logOperation({
      userId: currentUser!.id,
      userName: currentUser!.name,
      action: LogAction.UPDATE,
      module: '用户管理',
      targetId: user.id,
      targetName: user.name,
      description: `${newStatus === 'active' ? '启用' : '禁用'} 用户 ${user.name}`,
    });

    loadUsers();
  };

  const handleDelete = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert('不能删除当前登录用户');
      return;
    }

    if (!confirm(`确定要删除用户 ${user.name} 吗？\n\n此操作不可恢复！`)) {
      return;
    }

    await usersService.delete(user.id);

    await logOperation({
      userId: currentUser!.id,
      userName: currentUser!.name,
      action: LogAction.DELETE,
      module: '用户管理',
      targetId: user.id,
      targetName: user.name,
      description: `删除用户 ${user.name}`,
    });

    alert('用户已删除');
    loadUsers();
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      role: UserRole.STAFF,
      phone: '',
      email: '',
    });
    setEditingUser(null);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.OWNER:
        return 'bg-purple-100 text-purple-800';
      case UserRole.MANAGER:
        return 'bg-blue-100 text-blue-800';
      case UserRole.CASHIER:
        return 'bg-green-100 text-green-800';
      case UserRole.WAREHOUSE:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">用户管理</h1>
          <p className="text-gray-600 mt-1">管理系统用户和权限</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <UserPlus size={20} />
          <span>添加用户</span>
        </button>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">联系方式</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最后登录</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className={user.status === 'inactive' ? 'opacity-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">@{user.username}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.phone || user.email || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleStatus(user)}
                    className={`px-2 py-1 text-xs rounded-full ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.status === 'active' ? '启用' : '禁用'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '从未登录'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-900"
                      title="编辑"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleResetPassword(user)}
                      className="text-orange-600 hover:text-orange-900"
                      title="重置密码"
                    >
                      <Key size={18} />
                    </button>
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-red-600 hover:text-red-900"
                        title="删除"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Shield size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">暂无用户</p>
          </div>
        )}
      </div>

      {/* 添加/编辑用户模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingUser ? '编辑用户' : '添加用户'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingUser && (
                <div>
                  <label className="label">用户名 *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input"
                    required
                    placeholder="登录用户名"
                  />
                </div>
              )}

              {!editingUser && (
                <div>
                  <label className="label">密码 *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input"
                    required
                    minLength={6}
                    placeholder="至少6位"
                  />
                </div>
              )}

              <div>
                <label className="label">姓名 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                  placeholder="真实姓名"
                />
              </div>

              <div>
                <label className="label">角色 *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="input"
                  required
                >
                  <option value={UserRole.STAFF}>普通员工</option>
                  <option value={UserRole.CASHIER}>收银员</option>
                  <option value={UserRole.WAREHOUSE}>仓管员</option>
                  <option value={UserRole.MANAGER}>经理</option>
                  <option value={UserRole.OWNER}>老板</option>
                </select>
              </div>

              <div>
                <label className="label">电话</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="联系电话"
                />
              </div>

              <div>
                <label className="label">邮箱</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  placeholder="电子邮箱"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
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
                <button type="submit" className="btn btn-primary" disabled={loading}>
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

