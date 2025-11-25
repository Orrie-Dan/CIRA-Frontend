import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createNotification,
  notifyUsers,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getOfficersAndAdmins,
  getReportNotificationRecipients,
} from '../../utils/notifications'
import { prisma } from '../../prisma'

// Mock Prisma
vi.mock('../../prisma', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    userAccount: {
      findMany: vi.fn(),
    },
    report: {
      findUnique: vi.fn(),
    },
  },
}))

describe('Notification Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createNotification', () => {
    it('should create a notification with all required fields', async () => {
      const mockNotification = {
        id: 'test-id',
        userId: 'user-123',
        type: 'report_created',
        title: 'Test Notification',
        body: 'Test body',
        data: { reportId: 'report-123' },
        read: false,
        createdAt: new Date(),
      }

      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification as any)

      const result = await createNotification({
        userId: 'user-123',
        type: 'report_created',
        title: 'Test Notification',
        body: 'Test body',
        data: { reportId: 'report-123' },
      })

      expect(result).toEqual(mockNotification)
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: 'report_created',
          title: 'Test Notification',
          body: 'Test body',
          data: { reportId: 'report-123' },
        },
      })
    })

    it('should create notification with empty data object when data is not provided', async () => {
      const mockNotification = {
        id: 'test-id',
        userId: 'user-123',
        type: 'report_created',
        title: 'Test Notification',
        body: 'Test body',
        data: {},
        read: false,
        createdAt: new Date(),
      }

      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification as any)

      await createNotification({
        userId: 'user-123',
        type: 'report_created',
        title: 'Test Notification',
        body: 'Test body',
      })

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: 'report_created',
          title: 'Test Notification',
          body: 'Test body',
          data: {},
        },
      })
    })
  })

  describe('notifyUsers', () => {
    it('should create notifications for multiple users', async () => {
      const mockResult = { count: 3 }
      vi.mocked(prisma.notification.createMany).mockResolvedValue(mockResult as any)

      const result = await notifyUsers(
        ['user-1', 'user-2', 'user-3'],
        'report_created',
        'New Report',
        'A new report has been created',
        { reportId: 'report-123' }
      )

      expect(result).toEqual(mockResult)
      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'user-1',
            type: 'report_created',
            title: 'New Report',
            body: 'A new report has been created',
            data: { reportId: 'report-123' },
          },
          {
            userId: 'user-2',
            type: 'report_created',
            title: 'New Report',
            body: 'A new report has been created',
            data: { reportId: 'report-123' },
          },
          {
            userId: 'user-3',
            type: 'report_created',
            title: 'New Report',
            body: 'A new report has been created',
            data: { reportId: 'report-123' },
          },
        ],
      })
    })

    it('should return empty array when no user IDs provided', async () => {
      const result = await notifyUsers(
        [],
        'report_created',
        'New Report',
        'A new report has been created'
      )

      expect(result).toEqual([])
      expect(prisma.notification.createMany).not.toHaveBeenCalled()
    })
  })

  describe('getUserNotifications', () => {
    it('should get notifications for a user with default options', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-123',
          type: 'report_created',
          title: 'Test',
          body: 'Test body',
          read: false,
          createdAt: new Date(),
        },
      ]
      const mockCount = 1

      vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications as any)
      vi.mocked(prisma.notification.count).mockResolvedValue(mockCount)

      const result = await getUserNotifications('user-123')

      expect(result).toEqual({
        notifications: mockNotifications,
        total: mockCount,
      })
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should filter unread notifications when unreadOnly is true', async () => {
      const mockNotifications: any[] = []
      const mockCount = 0

      vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications)
      vi.mocked(prisma.notification.count).mockResolvedValue(mockCount)

      await getUserNotifications('user-123', { unreadOnly: true })

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', read: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should respect limit and offset', async () => {
      const mockNotifications: any[] = []
      const mockCount = 10

      vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications)
      vi.mocked(prisma.notification.count).mockResolvedValue(mockCount)

      await getUserNotifications('user-123', { limit: 20, offset: 10 })

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 10,
      })
    })
  })

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      vi.mocked(prisma.notification.count).mockResolvedValue(5)

      const count = await getUnreadCount('user-123')

      expect(count).toBe(5)
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          read: false,
        },
      })
    })
  })

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const mockResult = { count: 1 }
      vi.mocked(prisma.notification.updateMany).mockResolvedValue(mockResult as any)

      const result = await markAsRead('notif-123', 'user-123')

      expect(result).toEqual(mockResult)
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'notif-123',
          userId: 'user-123',
        },
        data: {
          read: true,
        },
      })
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      const mockResult = { count: 3 }
      vi.mocked(prisma.notification.updateMany).mockResolvedValue(mockResult as any)

      const result = await markAllAsRead('user-123')

      expect(result).toEqual(mockResult)
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          read: false,
        },
        data: {
          read: true,
        },
      })
    })
  })

  describe('getOfficersAndAdmins', () => {
    it('should return officers and admins', async () => {
      const mockUsers = [
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' },
      ]
      vi.mocked(prisma.userAccount.findMany).mockResolvedValue(mockUsers as any)

      const result = await getOfficersAndAdmins()

      expect(result).toEqual(mockUsers)
      expect(prisma.userAccount.findMany).toHaveBeenCalledWith({
        where: {
          role: {
            in: ['officer', 'admin'],
          },
        },
        select: {
          id: true,
        },
      })
    })
  })

  describe('getReportNotificationRecipients', () => {
    it('should return reporter and assignee IDs', async () => {
      const mockReport = {
        id: 'report-123',
        reporter: { id: 'reporter-123' },
        assignments: [
          {
            assignee: { id: 'assignee-123' },
          },
        ],
      }
      vi.mocked(prisma.report.findUnique).mockResolvedValue(mockReport as any)

      const result = await getReportNotificationRecipients('report-123')

      expect(result).toEqual(['reporter-123', 'assignee-123'])
    })

    it('should remove duplicate IDs', async () => {
      const mockReport = {
        id: 'report-123',
        reporter: { id: 'user-123' },
        assignments: [
          {
            assignee: { id: 'user-123' }, // Same as reporter
          },
        ],
      }
      vi.mocked(prisma.report.findUnique).mockResolvedValue(mockReport as any)

      const result = await getReportNotificationRecipients('report-123')

      expect(result).toEqual(['user-123'])
    })

    it('should return empty array when report not found', async () => {
      vi.mocked(prisma.report.findUnique).mockResolvedValue(null)

      const result = await getReportNotificationRecipients('non-existent')

      expect(result).toEqual([])
    })
  })
})

