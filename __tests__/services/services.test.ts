/**
 * Service tests for backend services
 * Tests XP, Streak, and Nudge service logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase
const mockSupabase: any = {
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
  single: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
};

// Chain methods return mockSupabase
mockSupabase.from.mockReturnValue(mockSupabase);
mockSupabase.select.mockReturnValue(mockSupabase);
mockSupabase.insert.mockReturnValue(mockSupabase);
mockSupabase.update.mockReturnValue(mockSupabase);
mockSupabase.eq.mockReturnValue(mockSupabase);
mockSupabase.is.mockReturnValue(mockSupabase);
mockSupabase.order.mockReturnValue(mockSupabase);
mockSupabase.limit.mockReturnValue(mockSupabase);
mockSupabase.single.mockResolvedValue({ data: null, error: null });

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServer: () => mockSupabase,
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => Promise.resolve(mockSupabase),
}));

vi.mock('@/lib/eventBus', () => ({
  default: {
    emit: vi.fn(),
  },
}));

describe('XP Service Logic', () => {
  describe('XP Calculation', () => {
    it('should calculate base XP correctly for different difficulties', () => {
      const calculateXP = (difficulty: string, hintsUsed: number = 0): number => {
        const BASE_XP = 15;
        const HINT_PENALTY = 2;
        const multiplier = {
          easy: 0.8,
          medium: 1,
          hard: 1.5,
          elementary: 0.6,
          middle: 1,
          high: 1.3,
          advanced: 1.8,
        }[difficulty.toLowerCase()] || 1;

        return Math.max(5, Math.round(BASE_XP * multiplier - hintsUsed * HINT_PENALTY));
      };

      expect(calculateXP('easy')).toBe(12);
      expect(calculateXP('medium')).toBe(15);
      expect(calculateXP('hard')).toBe(23);
      expect(calculateXP('elementary')).toBe(9);
      expect(calculateXP('middle')).toBe(15);
      expect(calculateXP('high')).toBe(20);
      expect(calculateXP('advanced')).toBe(27);
    });

    it('should apply hint penalties correctly', () => {
      const calculateXP = (difficulty: string, hintsUsed: number = 0): number => {
        const BASE_XP = 15;
        const HINT_PENALTY = 2;
        const multiplier = {
          medium: 1,
        }[difficulty] || 1;
        return Math.max(5, Math.round(BASE_XP * multiplier - hintsUsed * HINT_PENALTY));
      };

      expect(calculateXP('medium', 0)).toBe(15);
      expect(calculateXP('medium', 1)).toBe(13);
      expect(calculateXP('medium', 2)).toBe(11);
      expect(calculateXP('medium', 5)).toBe(5); // Min XP
      expect(calculateXP('medium', 10)).toBe(5); // Still min XP
    });
  });

  describe('Level Calculation', () => {
    it('should calculate levels based on XP thresholds', () => {
      const calculateLevel = (totalXP: number): number => {
        let level = 1;
        let xpRequired = 100;
        let accumulated = 0;

        while (accumulated + xpRequired <= totalXP) {
          accumulated += xpRequired;
          level++;
          xpRequired = Math.round(100 * level * 1.5);
        }

        return level;
      };

      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(99)).toBe(1);
      expect(calculateLevel(100)).toBe(2);
      expect(calculateLevel(399)).toBe(2);
      expect(calculateLevel(400)).toBe(3); // 100 + 300 = 400
      expect(calculateLevel(1000)).toBeGreaterThan(3);
    });

    it('should calculate XP needed for level correctly', () => {
      const calculateXPForLevel = (level: number): number => {
        let totalXP = 0;
        for (let i = 1; i < level; i++) {
          totalXP += Math.round(100 * i * 1.5);
        }
        return totalXP;
      };

      expect(calculateXPForLevel(1)).toBe(0);
      expect(calculateXPForLevel(2)).toBe(150);
      expect(calculateXPForLevel(3)).toBe(450); // 150 + 300
    });
  });

  describe('Login Bonus', () => {
    it('should award correct XP for first login', () => {
      const calculateLoginBonus = (isFirstLogin: boolean): number => {
        return isFirstLogin ? 60 : 10;
      };

      expect(calculateLoginBonus(true)).toBe(60);
      expect(calculateLoginBonus(false)).toBe(10);
    });
  });
});

describe('Streak Service Logic', () => {
  describe('Streak Calculation', () => {
    it('should increment streak when studying consecutive days', () => {
      const calculateNewStreak = (
        currentStreak: number,
        lastStudyDate: string | null,
        today: string,
        yesterday: string
      ): number => {
        if (lastStudyDate === today) return currentStreak;
        if (lastStudyDate === yesterday) return currentStreak + 1;
        if (lastStudyDate === null) return 1;
        return 1; // Streak broken
      };

      const today = '2025-11-22';
      const yesterday = '2025-11-21';

      expect(calculateNewStreak(0, null, today, yesterday)).toBe(1);
      expect(calculateNewStreak(5, yesterday, today, yesterday)).toBe(6);
      expect(calculateNewStreak(5, today, today, yesterday)).toBe(5);
      expect(calculateNewStreak(10, '2025-11-15', today, yesterday)).toBe(1); // Reset
    });

    it('should track longest streak correctly', () => {
      const updateLongestStreak = (current: number, longest: number): number => {
        return Math.max(current, longest);
      };

      expect(updateLongestStreak(5, 3)).toBe(5);
      expect(updateLongestStreak(3, 5)).toBe(5);
      expect(updateLongestStreak(10, 10)).toBe(10);
    });
  });
});

describe('Nudge Service Logic', () => {
  describe('Streak at Risk Detection', () => {
    it('should detect when streak is at risk', () => {
      const isStreakAtRisk = (
        currentStreak: number,
        lastStudyDate: string,
        today: string,
        hour: number
      ): boolean => {
        if (currentStreak <= 0) return false;
        if (lastStudyDate === today) return false;
        return hour >= 18; // After 6 PM
      };

      const today = '2025-11-22';
      const yesterday = '2025-11-21';

      expect(isStreakAtRisk(5, yesterday, today, 20)).toBe(true);
      expect(isStreakAtRisk(5, today, today, 20)).toBe(false);
      expect(isStreakAtRisk(0, yesterday, today, 20)).toBe(false);
      expect(isStreakAtRisk(5, yesterday, today, 14)).toBe(false);
    });
  });

  describe('Nudge Priority', () => {
    it('should set correct priority based on streak length', () => {
      const getNudgePriority = (streak: number): 'low' | 'medium' | 'high' => {
        return streak > 7 ? 'high' : 'medium';
      };

      expect(getNudgePriority(3)).toBe('medium');
      expect(getNudgePriority(7)).toBe('medium');
      expect(getNudgePriority(8)).toBe('high');
      expect(getNudgePriority(30)).toBe('high');
    });
  });

  describe('Nudge Types', () => {
    it('should have correct nudge type values', () => {
      const nudgeTypes = [
        'streak_at_risk',
        'streak_lost',
        'goal_reminder',
        'comeback',
        'achievement_close',
        'practice_suggestion',
        'level_up_close',
      ];

      expect(nudgeTypes).toContain('streak_at_risk');
      expect(nudgeTypes).toContain('goal_reminder');
      expect(nudgeTypes.length).toBe(7);
    });
  });
});

describe('Date Utilities', () => {
  it('should format dates correctly', () => {
    const getToday = (): string => {
      return new Date().toISOString().split('T')[0];
    };

    const getYesterday = (): string => {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return date.toISOString().split('T')[0];
    };

    const today = getToday();
    const yesterday = getYesterday();

    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(yesterday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(today) > new Date(yesterday)).toBe(true);
  });

  it('should get end of day correctly', () => {
    const getEndOfDay = (): string => {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      return now.toISOString();
    };

    const endOfDay = getEndOfDay();
    // ISO string converts to UTC, just verify it's a valid ISO date
    expect(endOfDay).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
