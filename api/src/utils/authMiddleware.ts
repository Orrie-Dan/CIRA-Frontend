import type { FastifyRequest, FastifyReply } from 'fastify'
import { JWTPayload } from './auth'

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload
  }
}

export async function authenticateUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Try to get token from cookie first
    let token = request.cookies.token

    // If no cookie, try Authorization header
    if (!token) {
      const authHeader = request.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: request.id,
        },
      })
    }

    // Verify JWT token using Fastify JWT
    // Temporarily set the token in the request for jwtVerify
    const originalToken = request.headers.authorization
    request.headers.authorization = `Bearer ${token}`
    
    try {
      const decoded = await request.jwtVerify<JWTPayload>()
      // Attach user info to request
      request.user = decoded
    } finally {
      // Restore original authorization header
      request.headers.authorization = originalToken || undefined
    }
  } catch (error) {
    return reply.code(401).send({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
        requestId: request.id,
      },
    })
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: request.id,
        },
      })
    }

    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          requestId: request.id,
        },
      })
    }
  }
}

