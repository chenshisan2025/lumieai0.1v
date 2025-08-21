import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  obtainedAt: string;
  tokenId?: string;
  transactionHash?: string;
}

interface BadgeType {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isActive: boolean;
  createdAt: string;
}

interface BadgeProgress {
  badgeTypeId: string;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  lastUpdated: string;
}

interface BadgeContextType {
  // State
  userBadges: Badge[];
  availableBadges: BadgeType[];
  badgeProgress: BadgeProgress[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchUserBadges: (userId: string) => Promise<void>;
  fetchAvailableBadges: () => Promise<void>;
  fetchBadgeProgress: (userId: string) => Promise<void>;
  mintBadge: (badgeTypeId: string, userId: string) => Promise<boolean>;
  refreshBadgeData: (userId: string) => Promise<void>;
  refreshBadges: () => Promise<void>;
  clearError: () => void;

  // Computed values
  getBadgeById: (badgeId: string) => Badge | undefined;
  getBadgeTypeById: (badgeTypeId: string) => BadgeType | undefined;
  getProgressForBadge: (badgeTypeId: string) => BadgeProgress | undefined;
  getTotalBadgesCount: () => number;
  getBadgesByRarity: (rarity: string) => Badge[];
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

export const useBadge = () => {
  const context = useContext(BadgeContext);
  if (context === undefined) {
    throw new Error('useBadge must be used within a BadgeProvider');
  }
  return context;
};

interface BadgeProviderProps {
  children: ReactNode;
}

export const BadgeProvider: React.FC<BadgeProviderProps> = ({ children }) => {
  const [userBadges, setUserBadges] = useState<Badge[]>([]);
  const [availableBadges, setAvailableBadges] = useState<BadgeType[]>([]);
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock API functions - replace with real API calls
  const fetchUserBadges = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUserBadges: Badge[] = [
        {
          id: '1',
          name: '连续打卡7天',
          description: '连续7天完成健康打卡任务',
          imageUrl: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=golden%20trophy%20badge%20calendar%20icon&image_size=square',
          rarity: 'common',
          obtainedAt: '2024-01-15T10:30:00Z',
          tokenId: '1001',
          transactionHash: '0x123...abc'
        },
        {
          id: '2',
          name: '步数达人',
          description: '单日步数达到10000步',
          imageUrl: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=golden%20medal%20footsteps%20icon&image_size=square',
          rarity: 'rare',
          obtainedAt: '2024-01-20T14:45:00Z',
          tokenId: '1002',
          transactionHash: '0x456...def'
        }
      ];
      
      setUserBadges(mockUserBadges);
    } catch (err) {
      setError('获取用户勋章失败');
      console.error('Error fetching user badges:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBadges = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockAvailableBadges: BadgeType[] = [
        {
          id: '1',
          name: '连续打卡7天',
          description: '连续7天完成健康打卡任务',
          imageUrl: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=golden%20trophy%20badge%20calendar%20icon&image_size=square',
          rarity: 'common',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: '步数达人',
          description: '单日步数达到10000步',
          imageUrl: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=golden%20medal%20footsteps%20icon&image_size=square',
          rarity: 'rare',
          isActive: true,
          createdAt: '2024-01-02T00:00:00Z'
        },
        {
          id: '3',
          name: '早期用户',
          description: '前1000名注册用户专属勋章',
          imageUrl: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=legendary%20golden%20crown%20badge%20star&image_size=square',
          rarity: 'legendary',
          isActive: true,
          createdAt: '2024-01-03T00:00:00Z'
        },
        {
          id: '4',
          name: '健康专家',
          description: '连续30天保持健康数据记录',
          imageUrl: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=epic%20health%20expert%20badge%20medical&image_size=square',
          rarity: 'epic',
          isActive: true,
          createdAt: '2024-01-04T00:00:00Z'
        }
      ];
      
      setAvailableBadges(mockAvailableBadges);
    } catch (err) {
      setError('获取可用勋章失败');
      console.error('Error fetching available badges:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBadgeProgress = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const mockBadgeProgress: BadgeProgress[] = [
        {
          badgeTypeId: '3',
          currentValue: 1,
          targetValue: 1000,
          progressPercentage: 0.1,
          lastUpdated: '2024-01-25T12:00:00Z'
        },
        {
          badgeTypeId: '4',
          currentValue: 15,
          targetValue: 30,
          progressPercentage: 50,
          lastUpdated: '2024-01-25T12:00:00Z'
        }
      ];
      
      setBadgeProgress(mockBadgeProgress);
    } catch (err) {
      setError('获取勋章进度失败');
      console.error('Error fetching badge progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const mintBadge = async (badgeTypeId: string, userId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API call for minting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const badgeType = availableBadges.find(bt => bt.id === badgeTypeId);
      if (!badgeType) {
        throw new Error('勋章类型不存在');
      }

      // Check if user already has this badge
      const existingBadge = userBadges.find(badge => badge.name === badgeType.name);
      if (existingBadge) {
        throw new Error('用户已拥有此勋章');
      }

      // Create new badge
      const newBadge: Badge = {
        id: Date.now().toString(),
        name: badgeType.name,
        description: badgeType.description,
        imageUrl: badgeType.imageUrl,
        rarity: badgeType.rarity,
        obtainedAt: new Date().toISOString(),
        tokenId: (1000 + userBadges.length + 1).toString(),
        transactionHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 8)}`
      };

      setUserBadges(prev => [...prev, newBadge]);
      
      // Remove from progress if exists
      setBadgeProgress(prev => prev.filter(p => p.badgeTypeId !== badgeTypeId));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '铸造勋章失败');
      console.error('Error minting badge:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshBadgeData = async (userId: string) => {
    await Promise.all([
      fetchUserBadges(userId),
      fetchAvailableBadges(),
      fetchBadgeProgress(userId)
    ]);
  };

  const refreshBadges = async () => {
    await fetchAvailableBadges();
  };

  const clearError = () => {
    setError(null);
  };

  // Computed values
  const getBadgeById = (badgeId: string) => {
    return userBadges.find(badge => badge.id === badgeId);
  };

  const getBadgeTypeById = (badgeTypeId: string) => {
    return availableBadges.find(badgeType => badgeType.id === badgeTypeId);
  };

  const getProgressForBadge = (badgeTypeId: string) => {
    return badgeProgress.find(progress => progress.badgeTypeId === badgeTypeId);
  };

  const getTotalBadgesCount = () => {
    return userBadges.length;
  };

  const getBadgesByRarity = (rarity: string) => {
    return userBadges.filter(badge => badge.rarity === rarity);
  };

  // Initialize data on mount
  useEffect(() => {
    // Auto-fetch available badges on mount
    fetchAvailableBadges();
  }, []);

  const value: BadgeContextType = {
    // State
    userBadges,
    availableBadges,
    badgeProgress,
    loading,
    error,

    // Actions
    fetchUserBadges,
    fetchAvailableBadges,
    fetchBadgeProgress,
    mintBadge,
    refreshBadgeData,
    refreshBadges,
    clearError,

    // Computed values
    getBadgeById,
    getBadgeTypeById,
    getProgressForBadge,
    getTotalBadgesCount,
    getBadgesByRarity
  };

  return (
    <BadgeContext.Provider value={value}>
      {children}
    </BadgeContext.Provider>
  );
};

export default BadgeProvider;