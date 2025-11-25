import { PrismaClient } from '@prisma/client'

/**
 * Create a test Prisma client instance
 * In tests, you can use this with a test database or mock it
 */
export function createTestPrismaClient() {
  return new PrismaClient({
    log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
  })
}

/**
 * Clean up test data
 */
export async function cleanupTestData(prisma: PrismaClient) {
  // Clean up in reverse order of dependencies
  await prisma.notification.deleteMany({})
  await prisma.reportConfirmation.deleteMany({})
  await prisma.reportComment.deleteMany({})
  await prisma.reportPhoto.deleteMany({})
  await prisma.reportStatusHistory.deleteMany({})
  await prisma.reportAssignment.deleteMany({})
  await prisma.report.deleteMany({})
  await prisma.deviceToken.deleteMany({})
  await prisma.userAccount.deleteMany({})
}



