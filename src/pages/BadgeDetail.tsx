import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Hash, ExternalLink, Share2, Award, Star, Trophy, Target, CheckCircle } from 'lucide-react';
import { useBadge } from '../contexts/BadgeContext';
import { UserBadge, UserBadgeStatus, BadgeStatus, BadgeRarity } from '../../shared/types/badge';



const BadgeDetail: React.FC = () => {
  const { badgeId } = useParams<{ badgeId: string }>();
  const navigate = useNavigate();
  const { userBadges, loading, error, fetchUserBadges } = useBadge();
  const [badge, setBadge] = useState<UserBadge | null>(null);
  const userId = 'user123'; // Mock user ID

  useEffect(() => {
    if (userBadges.length === 0) {
      fetchUserBadges(userId);
    }
  }, [userBadges.length, fetchUserBadges, userId]);

  useEffect(() => {
    if (badgeId && userBadges.length > 0) {
      const foundBadge = userBadges.find(b => b.id === badgeId);
      if (foundBadge) {
        // 将Badge转换为UserBadge格式
        const userBadge: UserBadge = {
          id: parseInt(foundBadge.id),
          userId: 'current-user', // 临时用户ID
          badgeTypeId: parseInt(foundBadge.id),
          mintedAt: new Date(),
          status: UserBadgeStatus.EARNED,
          badgeType: {
            id: parseInt(foundBadge.id),
            name: foundBadge.name,
            description: foundBadge.description,
            imageUrl: foundBadge.imageUrl,
            rarity: foundBadge.rarity as BadgeRarity,
            status: BadgeStatus.ACTIVE,
            maxSupply: 1000,
            currentSupply: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };
        setBadge(userBadge);
      } else {
        setBadge(null);
      }
    }
  }, [badgeId, userBadges]);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-400 to-gray-600';
      case 'rare': return 'from-blue-400 to-blue-600';
      case 'epic': return 'from-purple-400 to-purple-600';
      case 'legendary': return 'from-yellow-400 to-yellow-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-400';
      case 'rare': return 'border-blue-400';
      case 'epic': return 'border-purple-400';
      case 'legendary': return 'border-yellow-400';
      default: return 'border-gray-400';
    }
  };

  const getRarityText = (rarity: string) => {
    switch (rarity) {
      case 'common': return '普通';
      case 'rare': return '稀有';
      case 'epic': return '史诗';
      case 'legendary': return '传说';
      default: return '普通';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  const handleShare = () => {
    if (navigator.share && badge) {
      navigator.share({
        title: `我获得了${badge.badgeType?.name || '勋章'}勋章！`,
        text: badge.badgeType?.description || '获得了一个勋章',
        url: window.location.href
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板！');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">加载勋章详情中...</p>
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
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!badge && userBadges.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Award className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <p className="text-white text-lg mb-4">勋章不存在或您尚未获得此勋章</p>
          <button
            onClick={() => navigate('/badges')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            返回勋章墙
          </button>
        </div>
      </div>
    );
  }

  if (!badge) {
    return null; // Still loading user badges
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/badges')}
                className="bg-blue-700 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">勋章详情</h1>
                <p className="text-blue-200 text-sm">查看您的成就详细信息</p>
              </div>
            </div>
            <button
              onClick={handleShare}
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2"
            >
              <Share2 className="h-4 w-4" />
              <span>分享</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Badge Display */}
          <div className="flex justify-center">
            <div className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 shadow-2xl border-4 ${getRarityBorder(badge.badgeType?.rarity || 'common')} max-w-md w-full`}>
              <div className="text-center">
                <div className={`w-48 h-48 mx-auto mb-6 rounded-full bg-gradient-to-br ${getRarityColor(badge.badgeType?.rarity || 'common')} p-2 animate-pulse`}>
                  <img
                    src={badge.badgeType?.imageUrl || ''}
                    alt={badge.badgeType?.name || ''}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9Ijk2IiBjeT0iOTYiIHI9Ijk2IiBmaWxsPSIjRjU5RTBCIi8+CjxzdmcgeD0iNjQiIHk9IjY0IiB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPgo8cGF0aCBkPSJtNiA5IDYgNiA2LTYiLz4KPC9zdmc+Cjwvc3ZnPg==';
                    }}
                  />
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 bg-gradient-to-r ${getRarityColor(badge.badgeType?.rarity || 'common')} text-white`}>
                  <Star className="h-4 w-4 mr-1" />
                  {getRarityText(badge.badgeType?.rarity || 'common')}
                </div>
              </div>
            </div>
          </div>

          {/* Badge Information */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 shadow-xl border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-3">{badge.badgeType?.name || ''}</h2>
              <p className="text-gray-300 leading-relaxed">{badge.badgeType?.description || ''}</p>
            </div>

            {/* Badge Attributes */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 shadow-xl border border-slate-700">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Star className="h-6 w-6 text-yellow-400 mr-2" />
                勋章属性
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">稀有度</p>
                  <p className="text-white font-medium">{getRarityText(badge.badgeType?.rarity || 'common')}</p>
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">获得时间</p>
                  <p className="text-white font-medium">{formatDate(badge.mintedAt.toString())}</p>
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">勋章ID</p>
                  <p className="text-white font-medium">{badge.id}</p>
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">类型</p>
                  <p className="text-white font-medium">{badge.badgeType?.name || '健康管理'}</p>
                </div>
              </div>
            </div>

            {/* Earning Conditions */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 shadow-xl border border-slate-700">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Target className="h-6 w-6 text-yellow-400 mr-2" />
                获得条件
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium">完成健康目标</p>
                    <p className="text-slate-400 text-sm">连续7天完成每日健康任务</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium">数据记录</p>
                    <p className="text-slate-400 text-sm">记录完整的健康数据</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadgeDetail;