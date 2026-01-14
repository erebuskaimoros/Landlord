-- Create storage bucket for lease documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lease-documents',
  'lease-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg']::text[]
);

-- RLS policies for lease-documents bucket
-- Users can only access documents from leases in their organization

-- Allow authenticated users to upload documents for leases in their organization
CREATE POLICY "Users can upload lease documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lease-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.organization_members om ON l.organization_id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND l.id::text = (storage.foldername(name))[1]
  )
);

-- Allow users to view documents from leases in their organization
CREATE POLICY "Users can view lease documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lease-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.organization_members om ON l.organization_id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND l.id::text = (storage.foldername(name))[1]
  )
);

-- Allow users to delete documents from leases in their organization (owner/manager only)
CREATE POLICY "Users can delete lease documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lease-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.organization_members om ON l.organization_id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager')
    AND l.id::text = (storage.foldername(name))[1]
  )
);
