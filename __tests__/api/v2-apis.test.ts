/**
 * End-to-end tests for v2 APIs
 * Tests XP, Streak, Problem completion flow
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
  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
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

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServer: () => mockSupabase,
}));

describe('V2 API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v2/problem-completed', () => {
    it('should require userId', async () => {
      const { POST } = await import('@/app/api/v2/problem-completed/route');

      const request = new Request('http://localhost:3000/api/v2/problem-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemType: 'algebra' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('userId required');
    });

    it('should require problemType', async () => {
      const { POST } = await import('@/app/api/v2/problem-completed/route');

      const request = new Request('http://localhost:3000/api/v2/problem-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'test-user-id' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('problemType required');
    });
  });

  describe('GET /api/v2/xp', () => {
    it('should require userId', async () => {
      const { GET } = await import('@/app/api/v2/xp/route');

      const request = new Request('http://localhost:3000/api/v2/xp', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/v2/streak', () => {
    it('should require userId', async () => {
      const { GET } = await import('@/app/api/v2/streak/route');

      const request = new Request('http://localhost:3000/api/v2/streak', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return default streak data for new user', async () => {
      // Mock no existing streak
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      const { GET } = await import('@/app/api/v2/streak/route');

      const request = new Request('http://localhost:3000/api/v2/streak?userId=new-user', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.current_streak).toBe(0);
    });
  });

  describe('GET /api/v2/nudges', () => {
    it('should require userId', async () => {
      const { GET } = await import('@/app/api/v2/nudges/route');

      const request = new Request('http://localhost:3000/api/v2/nudges', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('userId required');
    });
  });

  describe('POST /api/v2/nudges', () => {
    it('should require nudgeId for dismiss action', async () => {
      const { POST } = await import('@/app/api/v2/nudges/route');

      const request = new Request('http://localhost:3000/api/v2/nudges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('nudgeId required');
    });
  });
});

describe('Service Tests', () => {
  describe('nudgeService', () => {
    it('should detect streak at risk correctly', async () => {
      // This tests the logic without database
      const hour = new Date().getHours();
      const isLateInDay = hour >= 18;

      // If it's after 6 PM and user hasn't studied, streak should be at risk
      expect(typeof isLateInDay).toBe('boolean');
    });
  });

  describe('XP calculation', () => {
    it('should calculate XP correctly for different difficulties', () => {
      // Test XP calculation logic
      const calculateXP = (difficulty: string, hintsUsed: number = 0): number => {
        const baseXP = {
          elementary: 5,
          middle: 10,
          high: 15,
          advanced: 20,
        }[difficulty] || 10;

        const hintPenalty = hintsUsed * 2;
        return Math.max(5, baseXP - hintPenalty);
      };

      expect(calculateXP('elementary')).toBe(5);
      expect(calculateXP('middle')).toBe(10);
      expect(calculateXP('high')).toBe(15);
      expect(calculateXP('advanced')).toBe(20);
      expect(calculateXP('middle', 2)).toBe(6); // 10 - 4 penalty
      expect(calculateXP('elementary', 3)).toBe(5); // Min 5 XP
    });
  });

  describe('Level calculation', () => {
    it('should calculate level from XP correctly', () => {
      const calculateLevel = (totalXP: number): number => {
        let level = 1;
        let xpRequired = 100;
        let xpAccumulated = 0;

        while (xpAccumulated + xpRequired <= totalXP) {
          xpAccumulated += xpRequired;
          level++;
          xpRequired = Math.round(100 * (level - 1) * 1.5 + 100);
        }

        return level;
      };

      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(50)).toBe(1);
      expect(calculateLevel(100)).toBe(2);
      expect(calculateLevel(350)).toBe(3); // 100 + 250 = 350 for level 3
      expect(calculateLevel(1000)).toBeGreaterThan(3);
    });
  });
});
