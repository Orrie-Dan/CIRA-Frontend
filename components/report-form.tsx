"use client"

import { z } from "zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { MapPin, X, Upload, Image as ImageIcon } from "lucide-react"

const ReportSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  issueType: z.enum(["roads", "bridges", "water", "power", "sanitation", "telecom", "public_building", "pothole", "streetlight", "sidewalk", "drainage", "other"], {
    required_error: "Issue type is required",
  }),
  severity: z.enum(["low", "medium", "high"], { required_error: "Severity is required" }),
  province: z.string().optional(),
  district: z.string().optional(),
  sector: z.string().optional(),
})

export type ReportFormValues = z.infer<typeof ReportSchema>

export function ReportForm({
  onSubmit,
  defaultValues,
  onCancel,
}: {
  onSubmit: (values: ReportFormValues, photos: File[]) => void
  defaultValues?: Partial<ReportFormValues>
  onCancel?: () => void
}) {
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [availableSectors, setAvailableSectors] = useState<string[]>([])
  const [loadingSectors, setLoadingSectors] = useState(false)

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(ReportSchema),
    defaultValues: {
      title: "",
      description: "",
      issueType: "roads",
      severity: "low",
      province: "",
      district: "",
      sector: "",
      ...defaultValues,
    },
  })

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Limit to 10 photos total
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

  // Update form values when defaultValues change (e.g., when geocoding completes)
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      const currentValues = form.getValues()
      const hasLocationData = defaultValues.province || defaultValues.district || defaultValues.sector
      
      if (hasLocationData) {
        console.log('Updating form with geocoding data:', defaultValues)
        form.reset({
          ...currentValues,
          province: defaultValues.province || currentValues.province || '',
          district: defaultValues.district || currentValues.district || '',
          sector: defaultValues.sector || currentValues.sector || '',
        }, { keepValues: true })
      }
    }
  }, [defaultValues?.province, defaultValues?.district, defaultValues?.sector, form])

  // Watch district field for changes
  const district = form.watch('district')

  // Fetch sectors when district changes
  useEffect(() => {
    async function fetchSectors() {
      if (!district || district.trim().length === 0) {
        setAvailableSectors([])
        // Clear sector if district is cleared
        form.setValue('sector', '')
        return
      }

      setLoadingSectors(true)
      try {
        const { getSectorsByDistrict } = await import('@/lib/geocoding')
        const response = await getSectorsByDistrict(district)
        setAvailableSectors(response.sectors || [])
        
        // If current sector is not in the list, keep it (allow custom sectors)
      } catch (err) {
        console.error('Failed to fetch sectors:', err)
        setAvailableSectors([])
      } finally {
        setLoadingSectors(false)
      }
    }

    fetchSectors()
  }, [district, form])

  // Calculate progress like mobile
  const calculateProgress = () => {
    const values = form.getValues()
    let filled = 0
    const total = 5
    if (values.title) filled++
    if (values.description) filled++
    if (values.issueType) filled++
    if (values.severity) filled++
    if (values.province || values.district || values.sector) filled++
    return (filled / total) * 100
  }

  const progress = calculateProgress()

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit(values, photos))}
        className="space-y-4 sm:space-y-4"
      >
        {/* Progress Indicator */}
        <div className="space-y-2 pb-4 border-b">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div 
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {Math.round(progress)}% Complete
          </p>
        </div>

        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Brief description of the issue" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description *</FormLabel>
              <FormControl>
                <Textarea 
                  rows={4} 
                  placeholder="Provide detailed information about the issue" 
                  {...field} 
                  className="min-h-[100px] sm:min-h-[120px] resize-y"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Type Selection */}
        <FormField
          control={form.control}
          name="issueType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type *</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="roads">Roads</SelectItem>
                  <SelectItem value="bridges">Bridges</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="power">Power</SelectItem>
                  <SelectItem value="sanitation">Sanitation</SelectItem>
                  <SelectItem value="telecom">Telecom</SelectItem>
                  <SelectItem value="public_building">Public Building</SelectItem>
                  <SelectItem value="pothole">Pothole</SelectItem>
                  <SelectItem value="streetlight">Streetlight</SelectItem>
                  <SelectItem value="sidewalk">Sidewalk</SelectItem>
                  <SelectItem value="drainage">Drainage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Severity Selection */}
        <FormField
          control={form.control}
          name="severity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Severity *</FormLabel>
              <FormControl>
                <RadioGroup 
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4" 
                  value={field.value} 
                  onValueChange={field.onChange}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="severity-low" />
                    <label htmlFor="severity-low" className="text-sm cursor-pointer flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Low
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="severity-med" />
                    <label htmlFor="severity-med" className="text-sm cursor-pointer flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      Medium
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="severity-high" />
                    <label htmlFor="severity-high" className="text-sm cursor-pointer flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      High
                    </label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location Information - Auto-populated from map selection */}
        <div className="space-y-4 rounded-lg border bg-muted/50 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs sm:text-sm font-medium">Location *</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Province</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Province" 
                      {...field} 
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="district"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="District" 
                      {...field} 
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="sector"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sector</FormLabel>
                <Select 
                  value={field.value || ''} 
                  onValueChange={field.onChange}
                  disabled={!district || loadingSectors}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingSectors ? "Loading sectors..." : district ? "Select sector" : "Select district first"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableSectors.map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                    {availableSectors.length === 0 && district && !loadingSectors && (
                      <SelectItem value="" disabled>No sectors found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
                {district && (
                  <FormDescription>
                    {loadingSectors ? 'Loading sectors...' : `${availableSectors.length} sectors available`}
                  </FormDescription>
                )}
              </FormItem>
            )}
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Location details are automatically detected from the map. You can edit if needed.
          </p>
        </div>

        {/* Photo Upload Section */}
        <div className="space-y-4 rounded-lg border bg-muted/50 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs sm:text-sm font-medium">Photos ({photos.length}/10)</p>
          </div>
          
          <div className="space-y-3">
            {/* Photo Preview Grid */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {photos.length < 10 && (
              <div>
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {photos.length === 0 ? 'Upload photos' : `Add more photos (${photos.length}/10)`}
                    </span>
                  </div>
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>
            )}
            
            {photos.length >= 10 && (
              <p className="text-xs text-muted-foreground text-center">
                Maximum 10 photos allowed
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 sm:pt-2">
          {onCancel ? (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onCancel}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          ) : null}
          <Button 
            type="submit"
            className="w-full sm:w-auto"
          >
            Submit Report
          </Button>
        </div>
      </form>
    </Form>
  )
}


