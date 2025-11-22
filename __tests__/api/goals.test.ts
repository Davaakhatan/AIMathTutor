import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

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

vi.mock('@/services/goalService', () => ({
  createGoal: vi.fn(),
  getGoals: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
}))

import { GET, POST, PUT, DELETE } from '@/app/api/companion/goals/route'
import { getSupabaseServer } from '@/lib/supabase-server'
import { createGoal, getGoals, updateGoal, deleteGoal } from '@/services/goalService'

describe('/api/companion/goals', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabaseServer).mockReturnValue(mockSupabase as any)
  })

  describe('GET', () => {
    it('should return 400 if userId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/companion/goals')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('userId is required')
    })

    it('should return 401 if user not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })

      const request = new NextRequest('http://localhost:3000/api/companion/goals?userId=user-123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return goals for user', async () => {
      const mockGoals = [
        { id: 'goal-1', goal_type: 'problems', target_subject: 'algebra', status: 'active' },
        { id: 'goal-2', goal_type: 'streak', target_subject: 'geometry', status: 'completed' },
      ]

      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'user-123' }, error: null })
      vi.mocked(getGoals).mockResolvedValueOnce(mockGoals as any)

      const request = new NextRequest('http://localhost:3000/api/companion/goals?userId=user-123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.goals).toEqual(mockGoals)
      expect(getGoals).toHaveBeenCalledWith('user-123', null, undefined)
    })

    it('should filter goals by status', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'user-123' }, error: null })
      vi.mocked(getGoals).mockResolvedValueOnce([])

      const request = new NextRequest('http://localhost:3000/api/companion/goals?userId=user-123&status=active')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(getGoals).toHaveBeenCalledWith('user-123', null, 'active')
    })

    it('should pass profileId to getGoals', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'user-123' }, error: null })
      vi.mocked(getGoals).mockResolvedValueOnce([])

      const request = new NextRequest('http://localhost:3000/api/companion/goals?userId=user-123&profileId=profile-456')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(getGoals).toHaveBeenCalledWith('user-123', 'profile-456', undefined)
    })
  })

  describe('POST', () => {
    it('should return 400 if required fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/companion/goals', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-123' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('userId, goal_type, and target_subject are required')
    })

    it('should return 401 if user not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })

      const request = new NextRequest('http://localhost:3000/api/companion/goals', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          goal_type: 'problems',
          target_subject: 'algebra',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should create a new goal', async () => {
      const newGoal = {
        id: 'goal-new',
        goal_type: 'problems',
        target_subject: 'algebra',
        status: 'active',
      }

      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'user-123' }, error: null })
      vi.mocked(createGoal).mockResolvedValueOnce(newGoal as any)

      const request = new NextRequest('http://localhost:3000/api/companion/goals', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          goal_type: 'problems',
          target_subject: 'algebra',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.goal).toEqual(newGoal)
      expect(createGoal).toHaveBeenCalledWith('user-123', null, {
        goal_type: 'problems',
        target_subject: 'algebra',
        target_date: null,
        metadata: {},
      })
    })

    it('should return 500 if createGoal returns null', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'user-123' }, error: null })
      vi.mocked(createGoal).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/companion/goals', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          goal_type: 'problems',
          target_subject: 'algebra',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to create goal')
    })
  })

  describe('PUT', () => {
    it('should return 400 if userId or goalId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/companion/goals', {
        method: 'PUT',
        body: JSON.stringify({ userId: 'user-123' }),
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('userId and goalId are required')
    })

    it('should update a goal', async () => {
      const updatedGoal = {
        id: 'goal-1',
        progress: 50,
        status: 'active',
      }

      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'user-123' }, error: null })
      vi.mocked(updateGoal).mockResolvedValueOnce(updatedGoal as any)

      const request = new NextRequest('http://localhost:3000/api/companion/goals', {
        method: 'PUT',
        body: JSON.stringify({
          userId: 'user-123',
          goalId: 'goal-1',
          progress: 50,
        }),
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.goal).toEqual(updatedGoal)
      expect(updateGoal).toHaveBeenCalledWith('user-123', 'goal-1', { progress: 50 })
    })

    it('should return 500 if updateGoal returns null', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'user-123' }, error: null })
      vi.mocked(updateGoal).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/companion/goals', {
        method: 'PUT',
        body: JSON.stringify({
          userId: 'user-123',
          goalId: 'goal-1',
          progress: 50,
        }),
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update goal')
    })
  })

  describe('DELETE', () => {
    it('should return 400 if userId or goalId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/companion/goals?userId=user-123', {
        method: 'DELETE',
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('userId and goalId are required')
    })

    it('should delete a goal', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'user-123' }, error: null })
      vi.mocked(deleteGoal).mockResolvedValueOnce(true)

      const request = new NextRequest('http://localhost:3000/api/companion/goals?userId=user-123&goalId=goal-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(deleteGoal).toHaveBeenCalledWith('user-123', 'goal-1')
    })

    it('should return 500 if deleteGoal returns false', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'user-123' }, error: null })
      vi.mocked(deleteGoal).mockResolvedValueOnce(false)

      const request = new NextRequest('http://localhost:3000/api/companion/goals?userId=user-123&goalId=goal-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete goal')
    })
  })
})
