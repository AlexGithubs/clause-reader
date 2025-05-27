-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  full_text TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create clauses table
CREATE TABLE IF NOT EXISTS clauses (
  id UUID PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  page INTEGER NOT NULL,
  position JSONB NOT NULL, -- Stores the position data as JSON: {top, left, width, height}
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100), -- 0-100 scale (0=harsh, 50=standard, 100=favorable)
  tags TEXT[] NOT NULL DEFAULT '{}',
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_clauses_document_id ON clauses(document_id);

-- Enable Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clauses ENABLE ROW LEVEL SECURITY;

-- Create policies for documents
CREATE POLICY "Users can view only their own documents"
  ON documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update only their own documents"
  ON documents
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete only their own documents"
  ON documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for clauses
CREATE POLICY "Users can view clauses for their documents"
  ON clauses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = clauses.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert clauses for their documents"
  ON clauses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = clauses.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update clauses for their documents"
  ON clauses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = clauses.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete clauses for their documents"
  ON clauses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = clauses.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- Create a function to calculate clause stats
CREATE OR REPLACE FUNCTION get_document_stats(doc_id TEXT)
RETURNS TABLE (
  total_clauses INTEGER,
  favorable_count INTEGER,
  standard_count INTEGER,
  unfavorable_count INTEGER,
  harsh_count INTEGER,
  average_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_clauses,
    COUNT(*) FILTER (WHERE score >= 75)::INTEGER AS favorable_count,
    COUNT(*) FILTER (WHERE score >= 40 AND score < 75)::INTEGER AS standard_count,
    COUNT(*) FILTER (WHERE score >= 25 AND score < 40)::INTEGER AS unfavorable_count,
    COUNT(*) FILTER (WHERE score < 25)::INTEGER AS harsh_count,
    COALESCE(AVG(score), 50)::NUMERIC AS average_score
  FROM
    clauses
  WHERE
    document_id = doc_id;
END;
$$ LANGUAGE plpgsql; 