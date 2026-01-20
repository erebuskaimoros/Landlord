-- Add task_id to photos table to support attaching photos to tasks
-- This enables before/after documentation for maintenance work

ALTER TABLE photos ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Index for querying photos by task
CREATE INDEX IF NOT EXISTS idx_photos_task_id ON photos(task_id) WHERE task_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN photos.task_id IS 'Optional link to a task for before/after maintenance documentation';
