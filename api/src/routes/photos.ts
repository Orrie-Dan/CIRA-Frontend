import type { FastifyInstance, FastifyRequest } from 'fastify'
import { prisma } from '../prisma'
import { ApiError } from '../utils/errors'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads')
fs.mkdir(uploadsDir, { recursive: true }).catch(() => {
  // Directory creation will be handled on first upload
})

export async function photosRoutes(app: FastifyInstance) {
  // Upload photo for a report
  app.post('/reports/:reportId/photos', async (req: FastifyRequest<{ Params: { reportId: string } }>, reply) => {
    const { reportId } = req.params
    
    // Verify report exists
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true },
    })

    if (!report) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found',
          requestId: req.id,
        },
      })
    }

    try {
      const data = await req.file()
      if (!data) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No file uploaded',
            requestId: req.id,
          },
        })
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!data.mimetype || !allowedTypes.includes(data.mimetype)) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
            requestId: req.id,
          },
        })
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      const buffer = await data.toBuffer()
      if (buffer.length > maxSize) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'File too large. Maximum size is 5MB.',
            requestId: req.id,
          },
        })
      }

      // Ensure uploads directory exists
      await fs.mkdir(uploadsDir, { recursive: true })

      // Generate unique filename
      const ext = path.extname(data.filename || '.jpg')
      const filename = `${reportId}-${Date.now()}${ext}`
      const filepath = path.join(uploadsDir, filename)

      // Save file
      await fs.writeFile(filepath, buffer)

      // Create database record
      const photo = await prisma.reportPhoto.create({
        data: {
          reportId,
          url: `/uploads/${filename}`,
          caption: data.fields?.caption?.value as string | undefined,
        },
      })

      return reply.code(201).send({
        id: photo.id,
        url: photo.url,
        caption: photo.caption,
        createdAt: photo.createdAt.toISOString(),
      })
    } catch (error) {
      app.log.error(error, 'Failed to upload photo')
      throw new ApiError(500, 'Failed to upload photo', 'UPLOAD_FAILED')
    }
  })

  // Delete photo
  app.delete('/photos/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = req.params

    try {
      const photo = await prisma.reportPhoto.findUnique({
        where: { id },
        select: { id: true, url: true },
      })

      if (!photo) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Photo not found',
            requestId: req.id,
          },
        })
      }

      // Delete file from filesystem
      const filename = path.basename(photo.url)
      const filepath = path.join(uploadsDir, filename)
      try {
        await fs.unlink(filepath)
      } catch (err) {
        app.log.warn(err, 'Failed to delete file from filesystem')
      }

      // Delete database record
      await prisma.reportPhoto.delete({
        where: { id },
      })

      return reply.code(204).send()
    } catch (error) {
      app.log.error(error, 'Failed to delete photo')
      throw new ApiError(500, 'Failed to delete photo', 'DELETE_FAILED')
    }
  })
}

