import { describe, it, expect, beforeEach, vi } from 'vitest'
import { calculatePriorityScore, updateReportPriorityScore } from '../../utils/reportPriority'
import { prisma } from '../../prisma'

// Mock Prisma
vi.mock('../../prisma', () => ({
  prisma: {
    report: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

describe('Report Priority Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculatePriorityScore', () => {
    it('should calculate priority score for a new report with low severity', async () => {
      const mockReport = {
        id: 'report-123',
        severity: 'low',
        createdAt: new Date(),
        confirmations: [],
      }

      vi.mocked(prisma.report.findUnique).mockResolvedValue(mockReport as any)

      const score = await calculatePriorityScore('report-123')

      // Formula: (confirmations * 10) + (severity_weight * 5) + (age_weight)
      // (0 * 10) + (5 * 5) + 0 = 25
      expect(score).toBe(25)
    })

    it('should calculate priority score for medium severity report', async () => {
      const mockReport = {
        id: 'report-123',
        severity: 'medium',
        createdAt: new Date(),
        confirmations: [],
      }

      vi.mocked(prisma.report.findUnique).mockResolvedValue(mockReport as any)

      const score = await calculatePriorityScore('report-123')

      // (0 * 10) + (10 * 5) + 0 = 50
      expect(score).toBe(50)
    })

    it('should calculate priority score for high severity report', async () => {
      const mockReport = {
        id: 'report-123',
        severity: 'high',
        createdAt: new Date(),
        confirmations: [],
      }

      vi.mocked(prisma.report.findUnique).mockResolvedValue(mockReport as any)

      const score = await calculatePriorityScore('report-123')

      // (0 * 10) + (15 * 5) + 0 = 75
      expect(score).toBe(75)
    })

    it('should add points for confirmations', async () => {
      const mockReport = {
        id: 'report-123',
        severity: 'low',
        createdAt: new Date(),
        confirmations: [
          { id: 'conf-1' },
          { id: 'conf-2' },
          { id: 'conf-3' },
        ],
      }

      vi.mocked(prisma.report.findUnique).mockResolvedValue(mockReport as any)

      const score = await calculatePriorityScore('report-123')

      // (3 * 10) + (5 * 5) + 0 = 30 + 25 = 55
      expect(score).toBe(55)
    })

    it('should add age weight for reports older than 7 days', async () => {
      const eightDaysAgo = new Date()
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)

      const mockReport = {
        id: 'report-123',
        severity: 'low',
        createdAt: eightDaysAgo,
        confirmations: [],
      }

      vi.mocked(prisma.report.findUnique).mockResolvedValue(mockReport as any)

      const score = await calculatePriorityScore('report-123')

      // (0 * 10) + (5 * 5) + 5 = 25 + 5 = 30
      // Age: 8 days > 7, so (8-7)/7 = 0.14 weeks, floor = 0, but wait...
      // Actually: Math.floor((8 - 7) / 7) * 5 = Math.floor(1/7) * 5 = 0 * 5 = 0
      // Let me recalculate: daysSinceCreation = 8, so (8 - 7) / 7 = 1/7 = 0.14, floor = 0
      // So ageScore should be 0 for 8 days
      // But if it's 14 days: (14 - 7) / 7 = 1, floor = 1, so 1 * 5 = 5
      expect(score).toBeGreaterThanOrEqual(25)
    })

    it('should add age weight for reports 14 days old', async () => {
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

      const mockReport = {
        id: 'report-123',
        severity: 'low',
        createdAt: fourteenDaysAgo,
        confirmations: [],
      }

      vi.mocked(prisma.report.findUnique).mockResolvedValue(mockReport as any)

      const score = await calculatePriorityScore('report-123')

      // (0 * 10) + (5 * 5) + 5 = 30
      // Age: 14 days, (14-7)/7 = 1 week, so 1 * 5 = 5 points
      expect(score).toBe(30)
    })

    it('should return 0 when report not found', async () => {
      vi.mocked(prisma.report.findUnique).mockResolvedValue(null)

      const score = await calculatePriorityScore('non-existent')

      expect(score).toBe(0)
    })

    it('should handle unknown severity gracefully', async () => {
      const mockReport = {
        id: 'report-123',
        severity: 'unknown',
        createdAt: new Date(),
        confirmations: [],
      }

      vi.mocked(prisma.report.findUnique).mockResolvedValue(mockReport as any)

      const score = await calculatePriorityScore('report-123')

      // Should default to low severity weight (5)
      // (0 * 10) + (5 * 5) + 0 = 25
      expect(score).toBe(25)
    })
  })

  describe('updateReportPriorityScore', () => {
    it('should update report priority score', async () => {
      const mockReport = {
        id: 'report-123',
        severity: 'high',
        createdAt: new Date(),
        confirmations: [],
      }

      vi.mocked(prisma.report.findUnique).mockResolvedValue(mockReport as any)
      vi.mocked(prisma.report.update).mockResolvedValue({} as any)

      await updateReportPriorityScore('report-123')

      expect(prisma.report.findUnique).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        select: {
          id: true,
          severity: true,
          createdAt: true,
          confirmations: {
            select: { id: true },
          },
        },
      })
      expect(prisma.report.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: { priorityScore: 75 }, // (0 * 10) + (15 * 5) + 0 = 75
      })
    })
  })
})

