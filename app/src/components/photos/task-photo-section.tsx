'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Camera, Upload, Trash2, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import type { Tables } from '@/types/database'
import { uploadTaskPhotoAction, deleteTaskPhotoAction } from '@/app/(dashboard)/tasks/[id]/photo-actions'
import { toast } from 'sonner'
import { useUserRole } from '@/hooks/useUserRole'
import { validatePhotoFile } from '@/lib/validations/photo'

interface TaskPhotoSectionProps {
  taskId: string
  unitId: string
  photos: Tables<'photos'>[]
  photoUrls: Record<string, string>
}

export function TaskPhotoSection({ taskId, unitId, photos, photoUrls }: TaskPhotoSectionProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Tables<'photos'> | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const { canEdit, canDelete } = useUserRole()

  const currentIndex = selectedPhoto ? photos.findIndex(p => p.id === selectedPhoto.id) : -1

  function navigatePhoto(direction: 'prev' | 'next') {
    if (!selectedPhoto || photos.length === 0) return

    const newIndex = direction === 'prev'
      ? (currentIndex - 1 + photos.length) % photos.length
      : (currentIndex + 1) % photos.length

    setSelectedPhoto(photos[newIndex])
  }

  async function handleDelete(photoId: string) {
    if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return
    }

    setIsDeleting(photoId)
    try {
      const result = await deleteTaskPhotoAction(photoId, taskId, unitId)
      if (result.success) {
        toast.success('Photo deleted')
        setSelectedPhoto(null)
      } else {
        toast.error(result.error || 'Failed to delete photo')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Task Photos ({photos.length})
        </CardTitle>
        {canEdit && (
          <Button onClick={() => setUploadOpen(true)} size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Upload Photos
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Camera className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No photos yet</p>
            {canEdit && (
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload First Photo
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                onClick={() => setSelectedPhoto(photo)}
              >
                {photoUrls[photo.id] ? (
                  <Image
                    src={photoUrls[photo.id]}
                    alt={photo.caption || photo.file_name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Photo Viewer Dialog */}
        <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            {selectedPhoto && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {selectedPhoto.caption || selectedPhoto.file_name}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedPhoto.taken_at
                      ? `Taken: ${new Date(selectedPhoto.taken_at).toLocaleDateString()}`
                      : `Uploaded: ${new Date(selectedPhoto.created_at).toLocaleDateString()}`}
                  </DialogDescription>
                </DialogHeader>

                <div className="relative aspect-video">
                  {photoUrls[selectedPhoto.id] ? (
                    <Image
                      src={photoUrls[selectedPhoto.id]}
                      alt={selectedPhoto.caption || selectedPhoto.file_name}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 896px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="h-16 w-16 text-gray-400" />
                    </div>
                  )}

                  {/* Navigation buttons */}
                  {photos.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigatePhoto('prev')
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigatePhoto('next')
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {currentIndex + 1} of {photos.length}
                  </span>
                  {canDelete && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(selectedPhoto.id)}
                      disabled={isDeleting === selectedPhoto.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {isDeleting === selectedPhoto.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Upload Dialog */}
        {canEdit && (
          <TaskPhotoUploadDialog
            open={uploadOpen}
            onOpenChange={setUploadOpen}
            taskId={taskId}
            unitId={unitId}
          />
        )}
      </CardContent>
    </Card>
  )
}

interface TaskPhotoUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  unitId: string
}

function TaskPhotoUploadDialog({ open, onOpenChange, taskId, unitId }: TaskPhotoUploadDialogProps) {
  const [files, setFiles] = useState<File[]>([])
  const [caption, setCaption] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [previews, setPreviews] = useState<string[]>([])

  useEffect(() => {
    // Create preview URLs
    const urls = files.map(file => URL.createObjectURL(file))
    setPreviews(urls)

    // Cleanup
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [files])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || [])
    const validFiles: File[] = []

    for (const file of selectedFiles) {
      const validation = validatePhotoFile(file)
      if (validation.valid) {
        validFiles.push(file)
      } else {
        toast.error(validation.error)
      }
    }

    setFiles(prev => [...prev, ...validFiles])
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleUpload() {
    if (files.length === 0) return

    setIsUploading(true)
    let successCount = 0

    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('task_id', taskId)
        formData.append('unit_id', unitId)
        if (caption) formData.append('caption', caption)

        const result = await uploadTaskPhotoAction(formData)
        if (result.success) {
          successCount++
        } else {
          toast.error(`Failed to upload ${file.name}: ${result.error}`)
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} photo${successCount === 1 ? '' : 's'} uploaded`)
        setFiles([])
        setCaption('')
        onOpenChange(false)
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Task Photos</DialogTitle>
          <DialogDescription>
            Add photos to document work on this task. Photos will be tagged as maintenance and linked to the associated unit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Caption (optional)</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a description for these photos..."
            />
          </div>

          <div>
            <Label>Select Photos</Label>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              onChange={handleFileChange}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              JPEG, PNG, or WebP. Max 10MB per file.
            </p>
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {previews.map((preview, index) => (
                <div key={index} className="relative aspect-square">
                  <Image
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    fill
                    className="object-cover rounded-md"
                    sizes="80px"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
              {isUploading ? 'Uploading...' : `Upload ${files.length} Photo${files.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
