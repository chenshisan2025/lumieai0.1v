import React, { useState, useEffect } from 'react';
import { Trophy, Award, Star, Filter, Search, Grid, List } from 'lucide-react';
import { UserBadge, BadgeRarity, UserBadgeStatus } from '../../shared/types/badge';

interface BadgeWallProps {
  userId?: string;
}

const Badges: React.FC<BadgeWallProps> = ({ userId = 'current-user' }) => {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRarity, setFilterRarity] = useState<BadgeRarity | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [stats, setStats] = useState({
    total: 0,
    earned: 0,
    inProgress: 0,
    locked: 0
  });

  useEffect(() => {
    fetchUserBadges();
  }, [userId]);

  const fetchUserBadges = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/badges/user/${userId}`);
      const data = await response.json();
      setBadges(data.badges || []);
      setStats(data.stats || stats);
    } catch (error) {
      console.error('Failed to fetch badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBadges = badges.filter(badge => {
    const matchesSearch = badge.badgeType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         badge.badgeType.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRarity = filterRarity === 'all' || badge.badgeType.rarity === filterRarity;
    return matchesSearch && matchesRarity;
  });

  const getRarityColor = (rarity: BadgeRarity) => {
    switch (rarity) {
      case BadgeRarity.COMMON: return 'from-gray-400 to-gray-600';
      case BadgeRarity.RARE: return 'from-blue-400 to-blue-600';
      case BadgeRarity.EPIC: return 'from-purple-400 to-purple-600';
      case BadgeRarity.LEGENDARY: return 'from-yellow-400 to-yellow-600';
      case BadgeRarity.MYTHIC: return 'from-red-400 to-red-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getStatusIcon = (status: UserBadgeStatus) => {
    switch (status) {
      case UserBadgeStatus.EARNED: return <Trophy className="w-5 h-5 text-yellow-400" />;
      case UserBadgeStatus.IN_PROGRESS: return <Star className="w-5 h-5 text-blue-400" />;
      case UserBadgeStatus.LOCKED: return <Award className="w-5 h-5 text-gray-400" />;
      default: return <Award className="w-5 h-5 text-gray-400" />;
    }
  };

  const BadgeCard: React.FC<{ badge: UserBadge }> = ({ badge }) => {
    const isEarned = badge.status === UserBadgeStatus.EARNED;
    const rarityGradient = getRarityColor(badge.badgeType.rarity);
    
    return (
      <div className={`
        relative group cursor-pointer transition-all duration-300 transform hover:scale-105
        ${isEarned ? 'opacity-100' : 'opacity-60'}
        ${viewMode === 'grid' ? 'aspect-square' : 'h-24'}
      `}>
        <div className={`
          h-full w-full rounded-xl p-4 bg-gradient-to-br ${rarityGradient}
          shadow-lg hover:shadow-xl border border-white/20
        `}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-white font-semibold text-sm">
              {badge.badgeType.rarity}
            </div>
            {getStatusIcon(badge.status)}
          </div>
          
          <div className="text-center">
            <div className="text-4xl mb-2">{badge.badgeType?.icon || '🏆'}</div>
            <h3 className="text-white font-bold text-lg mb-1">
              {badge.badgeType.name}
            </h3>
            <p className="text-white/80 text-sm">
              {badge.badgeType.description}
            </p>
          </div>
          
          {badge.status === UserBadgeStatus.IN_PROGRESS && (
            <div className="mt-3">
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${badge.progress || 0}%` }}
                />
              </div>
              <div className="text-white/80 text-xs mt-1 text-center">
                {badge.progress || 0}% 完成
              </div>
            </div>
          )}
          
          {badge.earnedAt && (
            <div className="absolute top-2 right-2">
              <div className="bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold">
                已获得
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white">加载勋章中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold">{stats.total}</div>
          <div className="text-blue-200">总勋章</div>
        </div>
        <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold">{stats.earned}</div>
          <div className="text-green-200">已获得</div>
        </div>
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-800 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold">{stats.inProgress}</div>
          <div className="text-yellow-200">进行中</div>
        </div>
        <div className="bg-gradient-to-r from-gray-600 to-gray-800 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold">{stats.locked}</div>
          <div className="text-gray-200">未解锁</div>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索勋章..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          
          <div className="flex gap-4">
            <select
              value={filterRarity}
              onChange={(e) => setFilterRarity(e.target.value as BadgeRarity | 'all')}
              className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">所有稀有度</option>
              <option value={BadgeRarity.COMMON}>普通</option>
              <option value={BadgeRarity.RARE}>稀有</option>
              <option value={BadgeRarity.EPIC}>史诗</option>
              <option value={BadgeRarity.LEGENDARY}>传说</option>
              <option value={BadgeRarity.MYTHIC}>神话</option>
            </select>
            
            <div className="flex bg-white/20 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-yellow-400 text-black' : 'text-white'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-yellow-400 text-black' : 'text-white'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 勋章网格 */}
      <div className={`
        grid gap-6
        ${viewMode === 'grid' 
          ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
          : 'grid-cols-1'
        }
      `}>
        {filteredBadges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>

      {filteredBadges.length === 0 && (
        <div className="text-center py-12">
          <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">没有找到勋章</h3>
          <p className="text-gray-400">尝试调整搜索条件或过滤器</p>
        </div>
      )}
    </div>
  );
};

export default Badges;