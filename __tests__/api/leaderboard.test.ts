import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServer: vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/services/rankingService', () => ({
  getRankForLevel: vi.fn((level) => ({
    title: `Rank ${level}`,
    badge: '🏆',
    color: '#gold',
  })),
}))

import { GET } from '@/app/api/leaderboard/route'
import { getSupabaseServer } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

describe('GET /api/leaderboard', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }

  const mockAdminSupabase = {
    auth: {
      admin: {
        getUserById: vi.fn(),
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabaseServer).mockReturnValue(mockSupabase as any)
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockAdminSupabase as any)
  })

  it('should return 400 if userId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/leaderboard')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('userId required')
  })

  it('should return 500 if Supabase is not configured', async () => {
    vi.mocked(getSupabaseServer).mockReturnValue(null as any)

    const request = new NextRequest('http://localhost:3000/api/leaderboard?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Database not configured')
  })

  it('should return empty leaderboard if no XP data', async () => {
    mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null })

    const request = new NextRequest('http://localhost:3000/api/leaderboard?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.topPlayers).toEqual([])
    expect(data.userRank).toBeNull()
    expect(data.totalPlayers).toBe(0)
  })

  it('should return leaderboard data', async () => {
    const mockXPData = [
      { user_id: 'user-1', total_xp: 500, level: 5, updated_at: '2024-01-01' },
      { user_id: 'user-2', total_xp: 300, level: 3, updated_at: '2024-01-02' },
      { user_id: 'user-123', total_xp: 100, level: 1, updated_at: '2024-01-03' },
    ]

    const mockProfiles = [
      { id: 'user-1', username: 'TopPlayer', display_name: 'Top Player' },
      { id: 'user-2', username: 'MidPlayer', display_name: 'Mid Player' },
      { id: 'user-123', username: 'CurrentUser', display_name: 'Current User' },
    ]

    const mockStreaks = [
      { user_id: 'user-1', current_streak: 10 },
      { user_id: 'user-2', current_streak: 5 },
      { user_id: 'user-123', current_streak: 3 },
    ]

    const mockProblems = [
      { user_id: 'user-1' },
      { user_id: 'user-1' },
      { user_id: 'user-2' },
    ]

    // Mock XP query
    mockSupabase.limit.mockResolvedValueOnce({ data: mockXPData, error: null })

    // Mock parallel queries (profiles, streaks, problems)
    mockSupabase.in.mockImplementation(() => ({
      ...mockSupabase,
      then: (resolve: any) => {
        // Return different data based on call order
        if (mockSupabase.in.mock.calls.length === 1) {
          resolve({ data: mockProfiles, error: null })
        } else if (mockSupabase.in.mock.calls.length === 2) {
          resolve({ data: mockStreaks, error: null })
        } else {
          resolve({ data: mockProblems, error: null })
        }
        return { catch: () => {} }
      }
    }))

    // Mock admin getUserById
    mockAdminSupabase.auth.admin.getUserById.mockResolvedValue({
      data: { user: { email: 'test@example.com' } },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/leaderboard?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.topPlayers).toBeDefined()
    expect(data.totalPlayers).toBeGreaterThan(0)
  })

  it('should handle database errors', async () => {
    mockSupabase.limit.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error', code: 'DB_ERR' }
    })

    const request = new NextRequest('http://localhost:3000/api/leaderboard?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Database error')
  })

  it('should respect limit parameter', async () => {
    mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null })

    const request = new NextRequest('http://localhost:3000/api/leaderboard?userId=user-123&limit=50')
    await GET(request)

    expect(mockSupabase.limit).toHaveBeenCalledWith(50)
  })

  it('should use default limit of 100', async () => {
    mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null })

    const request = new NextRequest('http://localhost:3000/api/leaderboard?userId=user-123')
    await GET(request)

    expect(mockSupabase.limit).toHaveBeenCalledWith(100)
  })

  it('should filter by null student_profile_id (main user only)', async () => {
    mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null })

    const request = new NextRequest('http://localhost:3000/api/leaderboard?userId=user-123')
    await GET(request)

    expect(mockSupabase.is).toHaveBeenCalledWith('student_profile_id', null)
  })
})
