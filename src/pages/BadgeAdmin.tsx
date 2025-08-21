import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X, Settings, Award, Target, Calendar } from 'lucide-react';
import { useBadge } from '../contexts/BadgeContext';
import { BadgeRarity } from '../../shared/types/badge';

interface BadgeType {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: BadgeRarity;
  isActive: boolean;
  createdAt: string;
}

interface BadgeCondition {
  id: string;
  badgeTypeId: string;
  conditionType: string;
  conditionConfig: any;
  isActive: boolean;
}

const BadgeAdmin: React.FC = () => {
  const { availableBadges, loading, error, refreshBadges } = useBadge();
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [conditions, setConditions] = useState<BadgeCondition[]>([]);
  const [activeTab, setActiveTab] = useState<'types' | 'conditions'>('types');
  const [editingType, setEditingType] = useState<BadgeType | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state for creating/editing badge types
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    rarity: BadgeRarity.COMMON
  });

  // Mock data for development
  const mockBadgeTypes: BadgeType[] = [
    {
      id: '1',
      name: '连续打卡7天',
      description: '连续7天完成健康打卡任务',
      imageUrl: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=golden%20trophy%20badge%20calendar%20icon&image_size=square',
      rarity: BadgeRarity.COMMON,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: '步数达人',
      description: '单日步数达到10000步',
      imageUrl: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=golden%20medal%20footsteps%20icon&image_size=square',
      rarity: BadgeRarity.RARE,
      isActive: true,
      createdAt: '2024-01-02T00:00:00Z'
    },
    {
      id: '3',
      name: '早期用户',
      description: '前1000名注册用户专属勋章',
      imageUrl: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=legendary%20golden%20crown%20badge%20star&image_size=square',
      rarity: BadgeRarity.LEGENDARY,
      isActive: true,
      createdAt: '2024-01-03T00:00:00Z'
    }
  ];

  const mockBadgeConditions: BadgeCondition[] = [
    {
      id: '1',
      badgeTypeId: '1',
      conditionType: 'consecutive_checkin',
      conditionConfig: { days: 7 },
      isActive: true
    },
    {
      id: '2',
      badgeTypeId: '2',
      conditionType: 'daily_steps',
      conditionConfig: { steps: 10000 },
      isActive: true
    }
  ];

  // Initialize data from BadgeProvider
  useEffect(() => {
    if (availableBadges.length > 0) {
      // Convert available badges to badge types format
      const types: BadgeType[] = availableBadges.map(badge => ({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        imageUrl: badge.imageUrl || 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=golden%20badge%20trophy&image_size=square',
        rarity: badge.rarity as BadgeRarity,
        isActive: true,
        createdAt: new Date().toISOString()
      }));
      setBadgeTypes(types);
    } else {
      // Use mock data if no badges available
      setBadgeTypes(mockBadgeTypes);
    }
    setConditions(mockBadgeConditions);
  }, [availableBadges]);

  useEffect(() => {
    refreshBadges();
  }, []);

  const getRarityColor = (rarity: BadgeRarity) => {
    switch (rarity) {
      case BadgeRarity.COMMON: return 'bg-gray-500';
      case BadgeRarity.RARE: return 'bg-blue-500';
      case BadgeRarity.EPIC: return 'bg-purple-500';
      case BadgeRarity.LEGENDARY: return 'bg-yellow-500';
      case BadgeRarity.MYTHIC: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRarityText = (rarity: BadgeRarity) => {
    switch (rarity) {
      case BadgeRarity.COMMON: return '普通';
      case BadgeRarity.RARE: return '稀有';
      case BadgeRarity.EPIC: return '史诗';
      case BadgeRarity.LEGENDARY: return '传说';
      case BadgeRarity.MYTHIC: return '神话';
      default: return '普通';
    }
  };

  const handleCreateBadgeType = () => {
    if (!formData.name || !formData.description) {
      alert('请填写完整信息');
      return;
    }

    const newBadgeType: BadgeType = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      imageUrl: formData.imageUrl || 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=golden%20badge%20trophy&image_size=square',
      rarity: formData.rarity,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    setBadgeTypes([...badgeTypes, newBadgeType]);
    setFormData({ name: '', description: '', imageUrl: '', rarity: BadgeRarity.COMMON });
    setShowCreateForm(false);
  };

  const handleEditBadgeType = (badgeType: BadgeType) => {
    setEditingType(badgeType);
    setFormData({
      name: badgeType.name,
      description: badgeType.description,
      imageUrl: badgeType.imageUrl,
      rarity: badgeType.rarity as BadgeRarity
    });
  };

  const handleUpdateBadgeType = () => {
    if (!editingType) return;

    const updatedBadgeTypes = badgeTypes.map(bt =>
      bt.id === editingType.id
        ? { ...bt, ...formData }
        : bt
    );

    setBadgeTypes(updatedBadgeTypes);
    setEditingType(null);
    setFormData({ name: '', description: '', imageUrl: '', rarity: BadgeRarity.COMMON });
  };

  const handleDeleteBadgeType = (id: string) => {
    if (confirm('确定要删除这个勋章类型吗？')) {
      setBadgeTypes(badgeTypes.filter(bt => bt.id !== id));
    }
  };

  const toggleBadgeTypeStatus = (id: string) => {
    const updatedBadgeTypes = badgeTypes.map(bt =>
      bt.id === id ? { ...bt, isActive: !bt.isActive } : bt
    );
    setBadgeTypes(updatedBadgeTypes);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">加载勋章管理数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">{error}</div>
          <button
            onClick={() => refreshBadges()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-3 rounded-full">
                <Settings className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">勋章管理</h1>
                <p className="text-blue-200 mt-1">管理勋章类型和获得条件</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('types')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
              activeTab === 'types'
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg'
                : 'bg-blue-800 text-blue-200 hover:bg-blue-700'
            }`}
          >
            <Award className="h-5 w-5" />
            <span>勋章类型</span>
          </button>
          <button
            onClick={() => setActiveTab('conditions')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
              activeTab === 'conditions'
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg'
                : 'bg-blue-800 text-blue-200 hover:bg-blue-700'
            }`}
          >
            <Target className="h-5 w-5" />
            <span>获得条件</span>
          </button>
        </div>

        {/* Badge Types Tab */}
        {activeTab === 'types' && (
          <div>
            {/* Create Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg"
              >
                <Plus className="h-5 w-5" />
                <span>创建新勋章类型</span>
              </button>
            </div>

            {/* Create/Edit Form */}
            {(showCreateForm || editingType) && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 shadow-xl border border-slate-700 mb-6">
                <h3 className="text-xl font-semibold text-white mb-4">
                  {editingType ? '编辑勋章类型' : '创建新勋章类型'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">勋章名称</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="输入勋章名称"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">稀有度</label>
                    <select
                      value={formData.rarity}
                      onChange={(e) => setFormData({ ...formData, rarity: e.target.value as BadgeRarity })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                      <option value={BadgeRarity.COMMON}>普通</option>
                      <option value={BadgeRarity.RARE}>稀有</option>
                      <option value={BadgeRarity.EPIC}>史诗</option>
                      <option value={BadgeRarity.LEGENDARY}>传说</option>
                      <option value={BadgeRarity.MYTHIC}>神话</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">勋章描述</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      rows={3}
                      placeholder="输入勋章描述"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">图片URL（可选）</label>
                    <input
                      type="text"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="输入图片URL或留空使用默认图片"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={editingType ? handleUpdateBadgeType : handleCreateBadgeType}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{editingType ? '更新' : '创建'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingType(null);
                      setFormData({ name: '', description: '', imageUrl: '', rarity: BadgeRarity.COMMON });
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>取消</span>
                  </button>
                </div>
              </div>
            )}

            {/* Badge Types Table */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">勋章</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">名称</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">稀有度</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">状态</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">创建时间</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600">
                    {badgeTypes.map((badgeType) => (
                      <tr key={badgeType.id} className="hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4">
                          <img
                            src={badgeType.imageUrl}
                            alt={badgeType.name}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiNGNTlFMEIiLz4KPHN2ZyB4PSIxMiIgeT0iMTIiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxwYXRoIGQ9Im02IDkgNiA2IDYtNiIvPgo8L3N2Zz4KPC9zdmc+';
                            }}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-white font-medium">{badgeType.name}</div>
                            <div className="text-gray-400 text-sm truncate max-w-xs">{badgeType.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getRarityColor(badgeType.rarity)}`}>
                            {getRarityText(badgeType.rarity)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleBadgeTypeStatus(badgeType.id)}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              badgeType.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {badgeType.isActive ? '启用' : '禁用'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
                          {formatDate(badgeType.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditBadgeType(badgeType)}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBadgeType(badgeType.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Conditions Tab */}
        {activeTab === 'conditions' && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 shadow-xl border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-4">勋章获得条件</h3>
            <div className="space-y-4">
              {conditions.map((condition) => {
                const badgeType = badgeTypes.find(bt => bt.id === condition.badgeTypeId);
                return (
                  <div key={condition.id} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">{badgeType?.name}</h4>
                        <p className="text-gray-400 text-sm">
                          条件类型: {condition.conditionType} | 
                          配置: {JSON.stringify(condition.conditionConfig)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          condition.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {condition.isActive ? '启用' : '禁用'}
                        </span>
                        <button className="text-blue-400 hover:text-blue-300">
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BadgeAdmin;