import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Star, Trophy, Filter, Calendar, Search, Share2 } from 'lucide-react';
import { useBadge } from '../contexts/BadgeContext';

interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  mintedAt: string;
  tokenId: string;
}

interface BadgeStats {
  totalCount: number;
  rareCount: number;
  recentBadges: Badge[];
}

const BadgeWall: React.FC = () => {
  const navigate = useNavigate();
  const { userBadges, loading, error, fetchUserBadges, clearError } = useBadge();
  const userId = 'user123'; // Mock user ID
  
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredBadges, setFilteredBadges] = useState<any[]>([]);

  useEffect(() => {
    // Fetch user badges on component mount
    fetchUserBadges(userId);
  }, [fetchUserBadges, userId]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      if (error) {
        clearError();
      }
    };
  }, [error, clearError]);

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

  // Filter badges based on selected rarity and search term
  useEffect(() => {
    let filtered = userBadges;
    
    if (selectedRarity !== 'all') {
      filtered = filtered.filter(badge => badge.rarity === selectedRarity);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(badge => 
        badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        badge.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredBadges(filtered);
  }, [userBadges, selectedRarity, searchTerm]);

  // Calculate stats
  const stats = {
    totalCount: userBadges.length,
    rareCount: userBadges.filter(b => b.rarity !== 'common').length,
    recentBadges: userBadges.slice(-2)
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRarityText = (rarity: string) => {
    switch (rarity) {
      case 'common': return '普通';
      case 'rare': return '稀有';
      case 'epic': return '史诗';
      case 'legendary': return '传说';
      default: return rarity;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">加载勋章数据中...</p>
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
            onClick={() => fetchUserBadges(userId)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-3 rounded-full">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">我的勋章墙</h1>
                <p className="text-blue-200 mt-1">展示您的成就与荣誉</p>
              </div>
            </div>
            <button className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg">
              <Share2 className="h-5 w-5" />
              <span>分享勋章墙</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-800 to-blue-900 rounded-xl p-6 shadow-xl border border-blue-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">总勋章数</p>
                <p className="text-white text-3xl font-bold">{stats.totalCount}</p>
              </div>
              <Award className="h-12 w-12 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-800 to-purple-900 rounded-xl p-6 shadow-xl border border-purple-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm font-medium">稀有勋章</p>
                <p className="text-white text-3xl font-bold">{stats.rareCount}</p>
              </div>
              <Star className="h-12 w-12 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-xl p-6 shadow-xl border border-green-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm font-medium">最新获得</p>
                <p className="text-white text-lg font-bold">
                  {stats.recentBadges.length > 0 ? stats.recentBadges[stats.recentBadges.length - 1].name : '暂无'}
                </p>
              </div>
              <Trophy className="h-12 w-12 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 shadow-xl border border-slate-700 mb-8">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索勋章名称或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
            </div>
            
            {/* Rarity Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {['all', 'common', 'rare', 'epic', 'legendary'].map((rarity) => (
                  <button
                    key={rarity}
                    onClick={() => setSelectedRarity(rarity)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      selectedRarity === rarity
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {rarity === 'all' ? '全部' : 
                     rarity === 'common' ? '普通' :
                     rarity === 'rare' ? '稀有' :
                     rarity === 'epic' ? '史诗' : '传说'}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <Filter className="h-5 w-5" />
                <span className="text-sm">显示: {filteredBadges.length} 个勋章</span>
              </div>
            </div>
          </div>
        </div>

        {/* Badges Grid */}
        {filteredBadges.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-12 shadow-xl border border-slate-700">
              <Award className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {userBadges.length === 0 ? '暂无勋章' : '没有找到匹配的勋章'}
              </h3>
              <p className="text-slate-400">
                {userBadges.length === 0 ? '继续努力，获得你的第一个勋章吧！' : '尝试调整筛选条件或搜索关键词'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBadges.map((badge) => (
              <div
                key={badge.id}
                onClick={() => navigate(`/badges/${badge.id}`)}
                className={`group cursor-pointer bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 shadow-xl border transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                   getRarityBorder(badge.rarity)
                 }`}
              >
                <div className="text-center">
                  <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                    getRarityColor(badge.rarity)
                  }`}>
                    <Award className="h-10 w-10 text-white" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-yellow-400 transition-colors">
                    {badge.name}
                  </h3>
                  
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                    {badge.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-1 rounded-full font-medium ${
                      getRarityColor(badge.rarity)
                    }`}>
                      {getRarityText(badge.rarity)}
                    </span>
                    
                    <span className="text-slate-500">
                       {formatDate(badge.mintedAt)}
                     </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BadgeWall;