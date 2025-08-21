import React, { useEffect, useState } from 'react';
import { Crown, Star, Gift, TrendingUp, Award, Zap, Shield, Truck } from 'lucide-react';
import { useMembership } from '@/contexts/MembershipContext';
import { motion } from 'framer-motion';

interface MembershipLevel {
  id: string;
  name: string;
  min_points: number;
  discount_rate: number;
  benefits: string[];
  color: string;
  icon: React.ComponentType<any>;
}

interface UserMembership {
  id: string;
  user_id: string;
  level_id: string;
  points: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
  level: MembershipLevel;
}

const levelIcons = {
  bronze: Star,
  silver: Award,
  gold: Crown,
  platinum: Zap,
};

const levelColors = {
  bronze: 'from-amber-600 to-amber-800',
  silver: 'from-slate-400 to-slate-600',
  gold: 'from-yellow-400 to-yellow-600',
  platinum: 'from-purple-400 to-purple-600',
};

export default function Membership() {
  const { state, getNextLevel, getProgressToNextLevel } = useMembership();
  const { levels: membershipLevels, userMembership, loading: contextLoading, error: contextError } = state;
  
  const loading = contextLoading;
  const error = contextError;
  const [selectedTab, setSelectedTab] = useState<'overview' | 'benefits' | 'history'>('overview');

  const getUpgradeProgress = () => {
    return getProgressToNextLevel();
  };

  const loadMembershipData = async () => {
    // Data loading is now handled by the context
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const nextLevel = getNextLevel();
  const upgradeProgress = getUpgradeProgress();
  const currentLevel = userMembership?.level;
  const CurrentLevelIcon = currentLevel ? levelIcons[currentLevel.name.toLowerCase() as keyof typeof levelIcons] || Crown : Crown;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-white">会员中心</h1>
          <p className="text-slate-400">管理您的会员权益和积分</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Current Membership Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${
            currentLevel ? levelColors[currentLevel.name.toLowerCase() as keyof typeof levelColors] : levelColors.bronze
          } p-8 text-white`}>
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
              <CurrentLevelIcon className="w-full h-full" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <CurrentLevelIcon className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {currentLevel?.name || 'Bronze'} 会员
                  </h2>
                  <p className="opacity-90">
                    享受 {((currentLevel?.discount_rate || 0) * 100).toFixed(0)}% 折扣优惠
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm opacity-80 mb-1">当前积分</p>
                  <p className="text-2xl font-bold">{userMembership?.points || 0}</p>
                </div>
                <div>
                  <p className="text-sm opacity-80 mb-1">累计消费</p>
                  <p className="text-2xl font-bold">{userMembership?.total_spent || 0} LUM</p>
                </div>
                <div>
                  <p className="text-sm opacity-80 mb-1">会员等级</p>
                  <p className="text-2xl font-bold">{currentLevel?.name || 'Bronze'}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Upgrade Progress */}
        {nextLevel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 bg-slate-800/50 rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">升级进度</h3>
              <span className="text-slate-400 text-sm">
                距离 {nextLevel.name} 还需 {nextLevel.min_points - (userMembership?.points || 0)} 积分
              </span>
            </div>
            
            <div className="relative">
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(upgradeProgress.percentage, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2 text-sm text-slate-400">
                <span>{currentLevel?.name || 'Bronze'}</span>
                <span>{upgradeProgress.percentage.toFixed(1)}%</span>
                <span>{nextLevel.name}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex gap-2 border-b border-slate-700">
            {[
              { key: 'overview', label: '概览', icon: TrendingUp },
              { key: 'benefits', label: '会员权益', icon: Gift },
              { key: 'history', label: '积分历史', icon: Award },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTab(tab.key as any)}
                  className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                    selectedTab === tab.key
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {selectedTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Quick Stats */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4">快速统计</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-3 mb-2">
                      <Star className="w-5 h-5 text-yellow-400" />
                      <span className="text-slate-400 text-sm">当前积分</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{userMembership?.points || 0}</p>
                  </div>
                  
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      <span className="text-slate-400 text-sm">累计消费</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{userMembership?.total_spent || 0} LUM</p>
                  </div>
                  
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-3 mb-2">
                      <Gift className="w-5 h-5 text-purple-400" />
                      <span className="text-slate-400 text-sm">折扣率</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {((currentLevel?.discount_rate || 0) * 100).toFixed(0)}%
                    </p>
                  </div>
                  
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-3 mb-2">
                      <Crown className="w-5 h-5 text-blue-400" />
                      <span className="text-slate-400 text-sm">会员等级</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{currentLevel?.name || 'Bronze'}</p>
                  </div>
                </div>
              </div>

              {/* Current Benefits */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4">当前权益</h3>
                <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                  <div className="space-y-3">
                    {(currentLevel?.benefits || ['基础会员权益']).map((benefit, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-white">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'benefits' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-6">所有会员等级权益</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {membershipLevels.map((level) => {
                  const LevelIcon = levelIcons[level.name.toLowerCase() as keyof typeof levelIcons] || Crown;
                  const isCurrentLevel = currentLevel?.id === level.id;
                  
                  return (
                    <motion.div
                      key={level.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`relative overflow-hidden rounded-xl p-6 border-2 transition-all duration-300 ${
                        isCurrentLevel 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      {isCurrentLevel && (
                        <div className="absolute top-2 right-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Crown className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                      
                      <div className="text-center mb-4">
                        <div className={`w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r ${
                          levelColors[level.name.toLowerCase() as keyof typeof levelColors]
                        } flex items-center justify-center`}>
                          <LevelIcon className="w-8 h-8 text-white" />
                        </div>
                        <h4 className="text-lg font-bold text-white">{level.name}</h4>
                        <p className="text-slate-400 text-sm">需要 {level.min_points} 积分</p>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="text-center">
                          <span className="text-2xl font-bold text-yellow-400">
                            {(level.discount_rate * 100).toFixed(0)}%
                          </span>
                          <p className="text-slate-400 text-sm">折扣优惠</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="text-sm font-semibold text-white mb-2">专属权益</h5>
                        {level.benefits.slice(0, 3).map((benefit, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                            <span className="text-slate-300 text-xs">{benefit}</span>
                          </div>
                        ))}
                        {level.benefits.length > 3 && (
                          <p className="text-slate-400 text-xs">+{level.benefits.length - 3} 更多权益</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedTab === 'history' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-6">积分历史</h3>
              
              {/* Mock History Data */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="p-6">
                  <div className="text-center py-12">
                    <Award className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-white mb-2">积分历史记录</h4>
                    <p className="text-slate-400">您的积分变动记录将在这里显示</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}