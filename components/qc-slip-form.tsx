"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiCreateQcSlip, apiUploadPhoto, type CreateQcSlipPayload } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface QcSlipFormProps {
  reportId: string
  onSuccess: () => void
  onCancel: () => void
}

export function QcSlipForm({ reportId, onSuccess, onCancel }: QcSlipFormProps) {
  const [workSummary, setWorkSummary] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const remainingSlots = 10 - photos.length
    const filesToAdd = files.slice(0, remainingSlots)

    setPhotos((prev) => [...prev, ...filesToAdd])

    // Create previews
    filesToAdd.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!workSummary.trim() || workSummary.length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Work summary must be at least 10 characters',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      // Upload photos first
      const photoUrls: string[] = []
      if (photos.length > 0) {
        setUploading(true)
        for (const photo of photos) {
          try {
            const result = await apiUploadPhoto(reportId, photo, 'QC completion photo')
            photoUrls.push(result.url)
          } catch (error: any) {
            console.error('Failed to upload photo:', error)
            toast({
              title: 'Photo Upload Warning',
              description: `Failed to upload one or more photos: ${error.message}`,
              variant: 'destructive',
            })
          }
        }
        setUploading(false)
      }

      // Create QC slip
      const payload: CreateQcSlipPayload = {
        reportId,
        workSummary: workSummary.trim(),
        photos: photoUrls,
      }

      await apiCreateQcSlip(payload)

      toast({
        title: 'Success',
        description: 'QC slip created successfully',
      })

      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create QC slip',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="workSummary">Work Summary *</Label>
        <Textarea
          id="workSummary"
          value={workSummary}
          onChange={(e) => setWorkSummary(e.target.value)}
          placeholder="Describe the work completed, materials used, and any relevant details..."
          rows={6}
          required
          minLength={10}
          className="min-h-[120px] resize-y"
        />
        <p className="text-xs text-muted-foreground">
          {workSummary.length}/5000 characters (minimum 10)
        </p>
      </div>

      <div className="space-y-2">
        <Label>Completion Photos (Optional)</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photoPreviews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Photo ${index + 1}`}
                className="w-full h-24 object-cover rounded border"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {photos.length < 10 && (
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded cursor-pointer hover:border-muted-foreground/50 transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Add Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
                multiple
              />
            </label>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {photos.length}/10 photos (max 5MB each)
        </p>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading || uploading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || uploading || !workSummary.trim() || workSummary.length < 10}>
          {uploading ? 'Uploading photos...' : loading ? 'Creating...' : 'Create QC Slip'}
        </Button>
      </div>
    </form>
  )
}


