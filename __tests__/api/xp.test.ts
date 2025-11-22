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

import { GET } from '@/app/api/xp/route'
import { getSupabaseServer } from '@/lib/supabase-server'

describe('GET /api/xp', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabaseServer).mockReturnValue(mockSupabase as any)
  })

  it('should return 400 if userId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/xp')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('userId required')
  })

  it('should return 500 if Supabase is not configured', async () => {
    vi.mocked(getSupabaseServer).mockReturnValue(null as any)

    const request = new NextRequest('http://localhost:3000/api/xp?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Database not configured')
  })

  it('should return null xpData if no data found', async () => {
    mockSupabase.is.mockResolvedValueOnce({ data: [], error: null })

    const request = new NextRequest('http://localhost:3000/api/xp?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.xpData).toBeNull()
  })

  it('should return XP data for user', async () => {
    const mockXPData = [{
      user_id: 'user-123',
      total_xp: 150,
      level: 2,
      xp_to_next_level: 50,
      xp_history: [
        { date: '2024-01-01', xp: 10, reason: 'Problem solved' },
        { date: '2024-01-02', xp: 20, reason: 'Problem solved' },
      ],
      updated_at: '2024-01-02T00:00:00Z',
    }]

    mockSupabase.is.mockResolvedValueOnce({ data: mockXPData, error: null })

    const request = new NextRequest('http://localhost:3000/api/xp?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.xpData).toBeDefined()
    expect(data.xpData.total_xp).toBe(150)
    expect(data.xpData.level).toBe(2)
    expect(data.xpData.xp_history).toHaveLength(2)
    expect(data.xpData.recent_gains).toBeDefined()
  })

  it('should handle profileId parameter', async () => {
    const mockXPData = [{
      user_id: 'user-123',
      student_profile_id: 'profile-456',
      total_xp: 100,
      level: 1,
      xp_to_next_level: 100,
      xp_history: [],
    }]

    mockSupabase.eq.mockReturnThis()
    mockSupabase.is.mockResolvedValueOnce({ data: mockXPData, error: null })

    const request = new NextRequest('http://localhost:3000/api/xp?userId=user-123&profileId=profile-456')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockSupabase.eq).toHaveBeenCalledWith('student_profile_id', 'profile-456')
  })

  it('should handle database errors', async () => {
    const errorMock = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      }),
    }
    vi.mocked(getSupabaseServer).mockReturnValue(errorMock as any)

    const request = new NextRequest('http://localhost:3000/api/xp?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Database connection failed')
  })

  it('should sort by updated_at and return latest record if duplicates exist', async () => {
    const mockXPData = [
      {
        user_id: 'user-123',
        total_xp: 100,
        level: 1,
        xp_history: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        user_id: 'user-123',
        total_xp: 200,
        level: 2,
        xp_history: [],
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ]

    const sortMock = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ data: mockXPData, error: null }),
    }
    vi.mocked(getSupabaseServer).mockReturnValue(sortMock as any)

    const request = new NextRequest('http://localhost:3000/api/xp?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.xpData.total_xp).toBe(200) // Should return the latest
    expect(data.xpData.level).toBe(2)
  })

  it('should calculate recent_gains from xp_history', async () => {
    const mockXPData = [{
      user_id: 'user-123',
      total_xp: 150,
      level: 2,
      xp_to_next_level: 50,
      xp_history: [
        { date: '2024-01-01', xp: 10, reason: 'Problem 1' },
        { date: '2024-01-02', xp: 20, reason: 'Problem 2' },
        { date: '2024-01-03', xp: 30, reason: 'Problem 3' },
      ],
    }]

    mockSupabase.is.mockResolvedValueOnce({ data: mockXPData, error: null })

    const request = new NextRequest('http://localhost:3000/api/xp?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(data.xpData.recent_gains).toBeDefined()
    expect(data.xpData.recent_gains.length).toBeLessThanOrEqual(10)
    // Should be sorted by timestamp descending
    if (data.xpData.recent_gains.length > 1) {
      expect(data.xpData.recent_gains[0].timestamp).toBeGreaterThanOrEqual(
        data.xpData.recent_gains[1].timestamp
      )
    }
  })
})
