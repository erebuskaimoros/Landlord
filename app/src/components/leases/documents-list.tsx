'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Download, Trash2, Loader2, FileImage, File } from 'lucide-react'
import type { LeaseDocumentWithUrl } from '@/services/lease-documents'

interface DocumentsListProps {
  documents: LeaseDocumentWithUrl[]
  onDelete: (documentId: string) => Promise<void>
  canDelete?: boolean
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File

  if (mimeType.startsWith('image/')) {
    return FileImage
  }

  if (mimeType === 'application/pdf') {
    return FileText
  }

  return File
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function DocumentsList({ documents, onDelete, canDelete = true }: DocumentsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(documentId: string) {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    setDeletingId(documentId)
    try {
      await onDelete(documentId)
    } finally {
      setDeletingId(null)
    }
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <p>No documents uploaded yet</p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {documents.map((doc) => {
        const Icon = getFileIcon(doc.mime_type)
        const isDeleting = deletingId === doc.id

        return (
          <div
            key={doc.id}
            className="py-3 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="h-8 w-8 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{doc.name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {doc.url && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                  disabled={isDeleting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
