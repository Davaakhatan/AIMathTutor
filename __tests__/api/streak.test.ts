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

import { GET } from '@/app/api/streak/route'
import { getSupabaseServer } from '@/lib/supabase-server'

describe('GET /api/streak', () => {
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
    const request = new NextRequest('http://localhost:3000/api/streak')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('userId required')
  })

  it('should return 500 if Supabase is not configured', async () => {
    vi.mocked(getSupabaseServer).mockReturnValue(null as any)

    const request = new NextRequest('http://localhost:3000/api/streak?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Database not configured')
  })

  it('should return default streak data if no data found', async () => {
    mockSupabase.is.mockResolvedValueOnce({ data: [], error: null })

    const request = new NextRequest('http://localhost:3000/api/streak?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.streakData).toEqual({
      current_streak: 0,
      longest_streak: 0,
      last_study_date: null,
    })
  })

  it('should return streak data for user', async () => {
    const mockStreakData = [{
      user_id: 'user-123',
      current_streak: 5,
      longest_streak: 10,
      last_study_date: '2024-01-15',
    }]

    mockSupabase.is.mockResolvedValueOnce({ data: mockStreakData, error: null })

    const request = new NextRequest('http://localhost:3000/api/streak?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.streakData).toEqual({
      current_streak: 5,
      longest_streak: 10,
      last_study_date: '2024-01-15',
    })
  })

  it('should handle profileId parameter', async () => {
    const mockStreakData = [{
      user_id: 'user-123',
      student_profile_id: 'profile-456',
      current_streak: 3,
      longest_streak: 5,
      last_study_date: '2024-01-10',
    }]

    // When profileId is provided, the route uses .eq() instead of .is()
    // The chain is: from().select().eq(user_id).eq(student_profile_id)
    const profileMock = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => {
        return {
          ...profileMock,
          eq: vi.fn().mockResolvedValue({ data: mockStreakData, error: null }),
        }
      }),
      is: vi.fn().mockResolvedValue({ data: mockStreakData, error: null }),
    }
    vi.mocked(getSupabaseServer).mockReturnValue(profileMock as any)

    const request = new NextRequest('http://localhost:3000/api/streak?userId=user-123&profileId=profile-456')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.streakData.current_streak).toBe(3)
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

    const request = new NextRequest('http://localhost:3000/api/streak?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Database connection failed')
  })

  it('should handle null values in streak data', async () => {
    const mockStreakData = [{
      user_id: 'user-123',
      current_streak: null,
      longest_streak: null,
      last_study_date: null,
    }]

    const nullMock = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ data: mockStreakData, error: null }),
    }
    vi.mocked(getSupabaseServer).mockReturnValue(nullMock as any)

    const request = new NextRequest('http://localhost:3000/api/streak?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.streakData).toEqual({
      current_streak: 0,
      longest_streak: 0,
      last_study_date: null,
    })
  })

  it('should ignore "null" string for profileId', async () => {
    const mockStreakData = [{
      user_id: 'user-123',
      current_streak: 7,
      longest_streak: 15,
      last_study_date: '2024-01-20',
    }]

    mockSupabase.is.mockResolvedValueOnce({ data: mockStreakData, error: null })

    const request = new NextRequest('http://localhost:3000/api/streak?userId=user-123&profileId=null')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    // Should use .is(null) for profileId when "null" string is passed
    expect(mockSupabase.is).toHaveBeenCalledWith('student_profile_id', null)
  })
})
