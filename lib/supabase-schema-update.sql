-- Add missing columns to documents table if they don't exist
DO $$ 
BEGIN
    -- Add summary column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'summary') THEN
        ALTER TABLE documents ADD COLUMN summary TEXT;
    END IF;
    
    -- Add full_text column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'full_text') THEN
        ALTER TABLE documents ADD COLUMN full_text TEXT;
    END IF;
    
    -- Add user_party column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'user_party') THEN
        ALTER TABLE documents ADD COLUMN user_party TEXT CHECK (user_party IN ('party_a', 'party_b', 'buyer', 'seller', 'client', 'contractor', 'employer', 'employee', 'landlord', 'tenant', 'other'));
    END IF;
END $$;

-- Create key_points table if it doesn't exist
CREATE TABLE IF NOT EXISTS key_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  point_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for key_points if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_key_points_document_id ON key_points(document_id);

-- Create policies for key_points only if they don't exist
DO $$
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'key_points' 
        AND policyname = 'Users can view key points for their documents'
    ) THEN
        CREATE POLICY "Users can view key points for their documents"
          ON key_points
          FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM documents
              WHERE documents.id = key_points.document_id
              AND documents.user_id = auth.uid()
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'key_points' 
        AND policyname = 'Users can insert key points for their documents'
    ) THEN
        CREATE POLICY "Users can insert key points for their documents"
          ON key_points
          FOR INSERT
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM documents
              WHERE documents.id = key_points.document_id
              AND documents.user_id = auth.uid()
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'key_points' 
        AND policyname = 'Users can update key points for their documents'
    ) THEN
        CREATE POLICY "Users can update key points for their documents"
          ON key_points
          FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM documents
              WHERE documents.id = key_points.document_id
              AND documents.user_id = auth.uid()
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'key_points' 
        AND policyname = 'Users can delete key points for their documents'
    ) THEN
        CREATE POLICY "Users can delete key points for their documents"
          ON key_points
          FOR DELETE
          USING (
            EXISTS (
              SELECT 1 FROM documents
              WHERE documents.id = key_points.document_id
              AND documents.user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- Enable RLS on key_points if not already enabled
ALTER TABLE key_points ENABLE ROW LEVEL SECURITY; 