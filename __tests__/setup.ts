import { vi } from 'vitest'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock window for browser APIs
global.window = global.window || {} as any
global.window.dispatchEvent = vi.fn()
global.CustomEvent = class CustomEvent extends Event {
  detail: any
  constructor(type: string, options?: CustomEventInit) {
    super(type, options)
    this.detail = options?.detail
  }
} as any
