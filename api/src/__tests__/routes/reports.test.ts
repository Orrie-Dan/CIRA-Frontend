import { describe, it, expect, beforeEach, vi } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { reportsRoutes } from '../../routes/reports'
import { prisma } from '../../prisma'
import { authenticateUser } from '../../utils/authMiddleware'
import { checkRateLimit, getClientIp } from '../../utils/rateLimit'
import { updateReportPriorityScore } from '../../utils/reportPriority'
import { notifyUsers, getOfficersAndAdmins } from '../../utils/notifications'
import { sendPushNotificationsToUsers } from '../../utils/pushNotifications'
import { broadcastNotificationToUser } from '../../routes/notifications'

// Mock dependencies
vi.mock('../../prisma', () => ({
  prisma: {
    report: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    reportStatusHistory: {
      create: vi.fn(),
    },
    userAccount: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('../../utils/authMiddleware', () => ({
  authenticateUser: vi.fn(),
}))

vi.mock('../../utils/rateLimit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('../../utils/reportPriority', () => ({
  updateReportPriorityScore: vi.fn(),
}))

vi.mock('../../utils/notifications', () => ({
  notifyUsers: vi.fn(),
  getOfficersAndAdmins: vi.fn(),
}))

vi.mock('../../utils/pushNotifications', () => ({
  sendPushNotificationsToUsers: vi.fn(),
}))

vi.mock('../../routes/notifications', () => ({
  broadcastNotificationToUser: vi.fn(),
}))

vi.mock('../../utils/auditLogger', () => ({
  logAuditEvent: vi.fn(),
  AuditActions: {
    REPORT_CREATED: 'REPORT_CREATED',
  },
  ResourceTypes: {
    REPORT: 'REPORT',
  },
}))

describe('Reports Routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = Fastify({ logger: false })
    await app.register(reportsRoutes)
    await app.ready()
    vi.clearAllMocks()
    // Reset rate limit to allowed by default
    vi.mocked(checkRateLimit).mockReturnValue({
      allowed: true,
      resetAt: new Date().toISOString(),
    })
  })

  afterEach(async () => {
    await app.close()
  })

  describe('POST /reports', () => {
    it('should create a report successfully', async () => {
      const mockReport = {
        id: 'report-123',
        title: 'Test Report',
        description: 'Test description',
        type: 'roads',
        severity: 'high',
        status: 'new',
        latitude: 1.0,
        longitude: 2.0,
        createdAt: new Date(),
        reporterId: null,
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'citizen',
      }

      vi.mocked(prisma.userAccount.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.report.create).mockResolvedValue(mockReport as any)
      vi.mocked(getOfficersAndAdmins).mockResolvedValue([])
      vi.mocked(updateReportPriorityScore).mockResolvedValue()
      
      // Mock status history creation
      vi.mocked(prisma.reportStatusHistory as any).create = vi.fn().mockResolvedValue({})

      const response = await app.inject({
        method: 'POST',
        url: '/reports',
        payload: {
          title: 'Test Report',
          description: 'Test description',
          type: 'roads',
          severity: 'high',
          latitude: 1.0,
          longitude: 2.0,
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.id).toBe('report-123')
      expect(body.title).toBe('Test Report')
    })

    it('should return 400 for invalid request data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/reports',
        payload: {
          // Missing required fields (description, type, severity, latitude, longitude)
          title: 'Test',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      // Fastify schema validation returns different format, just check status code
      expect(response.statusCode).toBe(400)
    })

    it('should return 429 when rate limit exceeded', async () => {
      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: false,
        resetAt: new Date().toISOString(),
      })

      const response = await app.inject({
        method: 'POST',
        url: '/reports',
        payload: {
          title: 'Test Report',
          description: 'Test description',
          type: 'roads',
          severity: 'high',
          latitude: 1.0,
          longitude: 2.0,
        },
      })

      expect(response.statusCode).toBe(429)
      const body = JSON.parse(response.body)
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('should notify officers and admins when report is created', async () => {
      const mockReport = {
        id: 'report-123',
        title: 'Test Report',
        description: 'Test description',
        type: 'roads',
        severity: 'high',
        status: 'new',
        latitude: 1.0,
        longitude: 2.0,
        createdAt: new Date(),
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'citizen',
      }

      const mockOfficers = [
        { id: 'officer-1' },
        { id: 'officer-2' },
      ]

      vi.mocked(prisma.userAccount.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.report.create).mockResolvedValue(mockReport as any)
      vi.mocked(prisma.reportStatusHistory.create).mockResolvedValue({} as any)
      vi.mocked(getOfficersAndAdmins).mockResolvedValue(mockOfficers as any)
      vi.mocked(notifyUsers).mockResolvedValue({ count: 2 } as any)
      vi.mocked(sendPushNotificationsToUsers).mockResolvedValue()
      vi.mocked(updateReportPriorityScore).mockResolvedValue()

      const response = await app.inject({
        method: 'POST',
        url: '/reports',
        payload: {
          title: 'Test Report',
          description: 'Test description',
          type: 'roads',
          severity: 'high',
          latitude: 1.0,
          longitude: 2.0,
        },
      })

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(response.statusCode).toBe(201)
      expect(notifyUsers).toHaveBeenCalledWith(
        ['officer-1', 'officer-2'],
        'report_created',
        'New Report Created',
        expect.stringContaining('Test Report'),
        expect.objectContaining({ reportId: 'report-123' })
      )
    })
  })
})

