import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { ProblemType } from '@/types'

// Mock dependencies
vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServer: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/services/dailyProblemService', () => ({
  saveDailyProblem: vi.fn(),
  getDailyProblem: vi.fn(),
}))

vi.mock('@/lib/eventBus', () => ({
  default: {
    emit: vi.fn(),
  },
}))

vi.mock('@/services/supabaseDataService', () => ({
  saveProblem: vi.fn(),
}))

import { GET, POST } from '@/app/api/daily-problem/route'
import { getSupabaseServer } from '@/lib/supabase-server'
import { getDailyProblem, saveDailyProblem } from '@/services/dailyProblemService'

describe('/api/daily-problem', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabaseServer).mockReturnValue(mockSupabase as any)
  })

  describe('GET - getProblem action', () => {
    it('should return existing daily problem', async () => {
      const mockProblem = {
        date: '2024-01-15',
        problem: { text: 'Solve 2x + 3 = 7', type: ProblemType.ALGEBRA, confidence: 1.0 },
        difficulty: 'middle school' as const,
        topic: 'algebra',
      }

      vi.mocked(getDailyProblem).mockResolvedValueOnce(mockProblem)

      const request = new NextRequest('http://localhost:3000/api/daily-problem?action=getProblem&date=2024-01-15')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.problem).toEqual(mockProblem)
      expect(getDailyProblem).toHaveBeenCalledWith('2024-01-15')
    })

    it('should use today\'s date if not provided', async () => {
      vi.mocked(getDailyProblem).mockResolvedValueOnce({
        date: new Date().toISOString().split('T')[0],
        problem: { text: 'Test', type: ProblemType.ALGEBRA, confidence: 1.0 },
        difficulty: 'middle school' as const,
        topic: 'algebra',
      })

      const request = new NextRequest('http://localhost:3000/api/daily-problem?action=getProblem')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(getDailyProblem).toHaveBeenCalled()
    })
  })

  describe('GET - checkCompletion (default)', () => {
    it('should return 400 if userId is missing for completion check', async () => {
      const request = new NextRequest('http://localhost:3000/api/daily-problem?date=2024-01-15')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('userId is required for completion check')
    })

    it('should return isSolved true if completion exists', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'completion-1', problem_text: 'Test problem', user_id: 'user-123' },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/daily-problem?date=2024-01-15&userId=user-123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.isSolved).toBe(true)
      expect(data.problemText).toBe('Test problem')
    })

    it('should return isSolved false if no completion', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/daily-problem?date=2024-01-15&userId=user-123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.isSolved).toBe(false)
    })

    it('should handle timeout gracefully', async () => {
      // Simulate a slow query that times out
      mockSupabase.maybeSingle.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 5000))
      )

      const request = new NextRequest('http://localhost:3000/api/daily-problem?date=2024-01-15&userId=user-123')
      const response = await GET(request)
      const data = await response.json()

      // Should return not solved due to timeout
      expect(response.status).toBe(200)
      expect(data.isSolved).toBe(false)
    }, 10000)

    it('should detect user mismatch in completion data', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'completion-1', problem_text: 'Test', user_id: 'different-user' },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/daily-problem?date=2024-01-15&userId=user-123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isSolved).toBe(false)
      expect(data.error).toBe('User mismatch')
    })
  })

  describe('GET - countCompletions action', () => {
    it('should return 400 if userId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/daily-problem?action=countCompletions')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('userId is required for completion check')
    })
  })

  describe('POST - markSolved action', () => {
    it('should return 400 if required fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/daily-problem', {
        method: 'POST',
        body: JSON.stringify({ action: 'markSolved', date: '2024-01-15' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing required fields for markSolved')
    })

    it('should return 404 if daily problem not found', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' }
      })

      const request = new NextRequest('http://localhost:3000/api/daily-problem', {
        method: 'POST',
        body: JSON.stringify({
          action: 'markSolved',
          date: '2024-01-15',
          userId: 'user-123',
          problemText: 'Test problem',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Daily problem not found for this date')
    })
  })

  describe('POST - saveDailyProblem', () => {
    it('should return 400 if required fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/daily-problem', {
        method: 'POST',
        body: JSON.stringify({ date: '2024-01-15' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing required fields')
    })

    it('should save daily problem', async () => {
      vi.mocked(saveDailyProblem).mockResolvedValueOnce(true)

      const request = new NextRequest('http://localhost:3000/api/daily-problem', {
        method: 'POST',
        body: JSON.stringify({
          date: '2024-01-15',
          problem: { text: 'Test problem', type: 'ALGEBRA', confidence: 1.0 },
          difficulty: 'middle school',
          topic: 'algebra',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(saveDailyProblem).toHaveBeenCalled()
    })

    it('should return 500 if saving fails', async () => {
      vi.mocked(saveDailyProblem).mockResolvedValueOnce(false)

      const request = new NextRequest('http://localhost:3000/api/daily-problem', {
        method: 'POST',
        body: JSON.stringify({
          date: '2024-01-15',
          problem: { text: 'Test problem', type: 'ALGEBRA', confidence: 1.0 },
          difficulty: 'middle school',
          topic: 'algebra',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to save daily problem')
    })
  })
})
