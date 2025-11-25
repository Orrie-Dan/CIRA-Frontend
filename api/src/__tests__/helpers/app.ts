import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'

/**
 * Create a test Fastify app instance
 * Useful for testing routes with Fastify's inject method
 */
export async function createTestApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // Disable logging in tests
  })

  // Register any plugins needed for testing
  // Add plugins here as needed

  return app
}



