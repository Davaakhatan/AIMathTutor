import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventBus, type EcosystemEventType, type EcosystemEvent } from '@/lib/eventBus'

describe('EventBus', () => {
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = new EventBus()
  })

  describe('Subscription', () => {
    it('should register a handler for an event type', () => {
      const handler = vi.fn()
      eventBus.on('problem_completed', handler)

      expect(eventBus.getHandlerCount('problem_completed')).toBe(1)
    })

    it('should allow multiple handlers for the same event type', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      eventBus.on('problem_completed', handler1)
      eventBus.on('problem_completed', handler2)

      expect(eventBus.getHandlerCount('problem_completed')).toBe(2)
    })

    it('should return an unsubscribe function', () => {
      const handler = vi.fn()
      const unsubscribe = eventBus.on('problem_completed', handler)

      expect(eventBus.getHandlerCount('problem_completed')).toBe(1)

      unsubscribe()

      expect(eventBus.getHandlerCount('problem_completed')).toBe(0)
    })

    it('should handle unsubscribing multiple times safely', () => {
      const handler = vi.fn()
      const unsubscribe = eventBus.on('problem_completed', handler)

      unsubscribe()
      unsubscribe() // Should not throw

      expect(eventBus.getHandlerCount('problem_completed')).toBe(0)
    })
  })

  describe('Event Emission', () => {
    it('should call handler when event is emitted', async () => {
      const handler = vi.fn()
      eventBus.on('problem_completed', handler)

      await eventBus.emit('problem_completed', 'user-123', { problemText: 'Test' })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'problem_completed',
          userId: 'user-123',
          data: { problemText: 'Test' },
        })
      )
    })

    it('should call all handlers for an event type', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      eventBus.on('problem_completed', handler1)
      eventBus.on('problem_completed', handler2)

      await eventBus.emit('problem_completed', 'user-123', { test: true })

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should not call handlers for different event types', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      eventBus.on('problem_completed', handler1)
      eventBus.on('goal_completed', handler2)

      await eventBus.emit('problem_completed', 'user-123', {})

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should include metadata and profileId in event', async () => {
      const handler = vi.fn()
      eventBus.on('problem_completed', handler)

      await eventBus.emit('problem_completed', 'user-123', { test: true }, {
        profileId: 'profile-456',
        metadata: { custom: 'data' },
      })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          profileId: 'profile-456',
          metadata: { custom: 'data' },
        })
      )
    })

    it('should handle events with no handlers gracefully', async () => {
      // Should not throw
      await eventBus.emit('problem_completed', 'user-123', {})
    })

    it('should catch and log handler errors without affecting other handlers', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'))
      const successHandler = vi.fn()

      eventBus.on('problem_completed', errorHandler)
      eventBus.on('problem_completed', successHandler)

      await eventBus.emit('problem_completed', 'user-123', {})

      expect(errorHandler).toHaveBeenCalled()
      expect(successHandler).toHaveBeenCalled()
    })

    it('should execute handlers in parallel', async () => {
      const executionOrder: number[] = []

      const handler1 = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        executionOrder.push(1)
      })

      const handler2 = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        executionOrder.push(2)
      })

      eventBus.on('problem_completed', handler1)
      eventBus.on('problem_completed', handler2)

      await eventBus.emit('problem_completed', 'user-123', {})

      // Handler 2 should complete first due to shorter delay
      expect(executionOrder).toEqual([2, 1])
    })
  })

  describe('Event History', () => {
    it('should track emitted events', async () => {
      await eventBus.emit('problem_completed', 'user-123', { test: 1 })
      await eventBus.emit('goal_completed', 'user-456', { test: 2 })

      const history = eventBus.getHistory()

      expect(history).toHaveLength(2)
      expect(history[0].type).toBe('problem_completed')
      expect(history[1].type).toBe('goal_completed')
    })

    it('should filter history by event type', async () => {
      await eventBus.emit('problem_completed', 'user-123', {})
      await eventBus.emit('goal_completed', 'user-456', {})
      await eventBus.emit('problem_completed', 'user-789', {})

      const history = eventBus.getHistory({ eventType: 'problem_completed' })

      expect(history).toHaveLength(2)
      expect(history.every(e => e.type === 'problem_completed')).toBe(true)
    })

    it('should filter history by userId', async () => {
      await eventBus.emit('problem_completed', 'user-123', {})
      await eventBus.emit('goal_completed', 'user-123', {})
      await eventBus.emit('problem_completed', 'user-456', {})

      const history = eventBus.getHistory({ userId: 'user-123' })

      expect(history).toHaveLength(2)
      expect(history.every(e => e.userId === 'user-123')).toBe(true)
    })

    it('should limit history results', async () => {
      await eventBus.emit('problem_completed', 'user-1', {})
      await eventBus.emit('problem_completed', 'user-2', {})
      await eventBus.emit('problem_completed', 'user-3', {})

      const history = eventBus.getHistory({ limit: 2 })

      expect(history).toHaveLength(2)
      // Should return the last 2 events
      expect(history[0].userId).toBe('user-2')
      expect(history[1].userId).toBe('user-3')
    })

    it('should enforce max history size (100)', async () => {
      // Emit 105 events
      for (let i = 0; i < 105; i++) {
        await eventBus.emit('problem_completed', `user-${i}`, {})
      }

      const history = eventBus.getHistory()

      expect(history).toHaveLength(100)
      // First 5 should be removed
      expect(history[0].userId).toBe('user-5')
    })
  })

  describe('Clear', () => {
    it('should clear all handlers and history', async () => {
      const handler = vi.fn()
      eventBus.on('problem_completed', handler)
      await eventBus.emit('problem_completed', 'user-123', {})

      eventBus.clear()

      expect(eventBus.getHandlerCount('problem_completed')).toBe(0)
      expect(eventBus.getHistory()).toHaveLength(0)
    })

    it('should not call handlers after clear', async () => {
      const handler = vi.fn()
      eventBus.on('problem_completed', handler)

      eventBus.clear()
      await eventBus.emit('problem_completed', 'user-123', {})

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('All Event Types', () => {
    const eventTypes: EcosystemEventType[] = [
      'problem_completed',
      'problem_started',
      'hint_requested',
      'session_started',
      'session_ended',
      'achievement_unlocked',
      'challenge_created',
      'challenge_completed',
      'share_created',
      'referral_completed',
      'goal_created',
      'goal_completed',
      'goal_achieved',
      'goal_progress_updated',
      'streak_at_risk',
      'streak_saved',
      'user_online',
      'user_offline',
      'leaderboard_rank_changed',
    ]

    it.each(eventTypes)('should handle %s event', async (eventType) => {
      const handler = vi.fn()
      eventBus.on(eventType, handler)

      await eventBus.emit(eventType, 'user-123', { eventType })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: eventType,
          data: { eventType },
        })
      )
    })
  })

  describe('Timestamp', () => {
    it('should include timestamp in emitted events', async () => {
      const handler = vi.fn()
      eventBus.on('problem_completed', handler)

      const before = new Date()
      await eventBus.emit('problem_completed', 'user-123', {})
      const after = new Date()

      const event = handler.mock.calls[0][0] as EcosystemEvent
      expect(event.timestamp).toBeInstanceOf(Date)
      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('Integration Scenarios', () => {
    it('should support pub/sub pattern across multiple subscribers', async () => {
      const results: string[] = []

      // Subscriber 1: XP System
      eventBus.on('problem_completed', async (event) => {
        results.push(`XP: +${event.data.xp}`)
      })

      // Subscriber 2: Streak System
      eventBus.on('problem_completed', async (event) => {
        results.push('Streak: updated')
      })

      // Subscriber 3: Goal System
      eventBus.on('problem_completed', async (event) => {
        results.push(`Goal: ${event.data.problemType} progress`)
      })

      await eventBus.emit('problem_completed', 'user-123', {
        xp: 10,
        problemType: 'algebra',
      })

      expect(results).toHaveLength(3)
      expect(results).toContain('XP: +10')
      expect(results).toContain('Streak: updated')
      expect(results).toContain('Goal: algebra progress')
    })

    it('should handle rapid consecutive emissions', async () => {
      const handler = vi.fn()
      eventBus.on('problem_completed', handler)

      // Emit 100 events rapidly
      await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          eventBus.emit('problem_completed', `user-${i}`, { index: i })
        )
      )

      expect(handler).toHaveBeenCalledTimes(100)
    })
  })
})
