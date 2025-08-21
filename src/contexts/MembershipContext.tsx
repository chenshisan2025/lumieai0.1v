import React, { createContext, useContext, useReducer, useEffect } from 'react';

interface MembershipLevel {
  id: string;
  name: string;
  min_points: number;
  discount_rate: number;
  benefits: string[];
  color: string;
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

interface MembershipState {
  levels: MembershipLevel[];
  userMembership: UserMembership | null;
  loading: boolean;
  error: string | null;
}

type MembershipAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LEVELS'; payload: MembershipLevel[] }
  | { type: 'SET_USER_MEMBERSHIP'; payload: UserMembership | null }
  | { type: 'UPDATE_POINTS'; payload: number }
  | { type: 'UPDATE_SPENT'; payload: number };

const initialState: MembershipState = {
  levels: [],
  userMembership: null,
  loading: false,
  error: null,
};

function membershipReducer(state: MembershipState, action: MembershipAction): MembershipState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_LEVELS':
      return { ...state, levels: action.payload };
    case 'SET_USER_MEMBERSHIP':
      return { ...state, userMembership: action.payload, loading: false };
    case 'UPDATE_POINTS':
      return {
        ...state,
        userMembership: state.userMembership
          ? { ...state.userMembership, points: action.payload }
          : null,
      };
    case 'UPDATE_SPENT':
      return {
        ...state,
        userMembership: state.userMembership
          ? { ...state.userMembership, total_spent: action.payload }
          : null,
      };
    default:
      return state;
  }
}

interface MembershipContextType {
  state: MembershipState;
  fetchMembershipLevels: () => Promise<void>;
  fetchUserMembership: () => Promise<void>;
  updateUserPoints: (points: number) => Promise<void>;
  updateUserSpent: (amount: number) => Promise<void>;
  calculateDiscount: (amount: number) => number;
  getNextLevel: () => MembershipLevel | null;
  getProgressToNextLevel: () => { current: number; required: number; percentage: number } | null;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(membershipReducer, initialState);

  const fetchMembershipLevels = async () => {
    try {
      const response = await fetch('/api/memberships/levels');
      if (!response.ok) throw new Error('Failed to fetch membership levels');
      
      const data = await response.json();
      dispatch({ type: 'SET_LEVELS', payload: data.levels });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const fetchUserMembership = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch('/api/memberships/user', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch user membership');
      
      const data = await response.json();
      dispatch({ type: 'SET_USER_MEMBERSHIP', payload: data.membership });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const updateUserPoints = async (points: number) => {
    try {
      const response = await fetch('/api/memberships/points', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ points }),
      });
      
      if (!response.ok) throw new Error('Failed to update points');
      
      const data = await response.json();
      dispatch({ type: 'SET_USER_MEMBERSHIP', payload: data.membership });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const updateUserSpent = async (amount: number) => {
    try {
      const response = await fetch('/api/memberships/spent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ amount }),
      });
      
      if (!response.ok) throw new Error('Failed to update spent amount');
      
      const data = await response.json();
      dispatch({ type: 'SET_USER_MEMBERSHIP', payload: data.membership });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const calculateDiscount = (amount: number): number => {
    if (!state.userMembership) return 0;
    return amount * state.userMembership.level.discount_rate;
  };

  const getNextLevel = (): MembershipLevel | null => {
    if (!state.userMembership || !state.levels.length) return null;
    
    const currentLevel = state.userMembership.level;
    const sortedLevels = [...state.levels].sort((a, b) => a.min_points - b.min_points);
    const currentIndex = sortedLevels.findIndex(level => level.id === currentLevel.id);
    
    return currentIndex < sortedLevels.length - 1 ? sortedLevels[currentIndex + 1] : null;
  };

  const getProgressToNextLevel = (): { current: number; required: number; percentage: number } | null => {
    const nextLevel = getNextLevel();
    if (!nextLevel || !state.userMembership) return null;
    
    const current = state.userMembership.points;
    const required = nextLevel.min_points;
    const currentLevelMin = state.userMembership.level.min_points;
    
    const progress = current - currentLevelMin;
    const total = required - currentLevelMin;
    const percentage = Math.min((progress / total) * 100, 100);
    
    return {
      current: progress,
      required: total,
      percentage,
    };
  };

  useEffect(() => {
    fetchMembershipLevels();
    fetchUserMembership();
  }, []);

  const value: MembershipContextType = {
    state,
    fetchMembershipLevels,
    fetchUserMembership,
    updateUserPoints,
    updateUserSpent,
    calculateDiscount,
    getNextLevel,
    getProgressToNextLevel,
  };

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
}

export function useMembership() {
  const context = useContext(MembershipContext);
  if (context === undefined) {
    throw new Error('useMembership must be used within a MembershipProvider');
  }
  return context;
}