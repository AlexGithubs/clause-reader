-- Add contract_type and role_validation fields to documents table
-- Run this in your Supabase SQL editor

-- Add contract_type column
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS contract_type TEXT;

-- Add role_validation column as JSONB
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS role_validation JSONB;

-- Add comments for documentation
COMMENT ON COLUMN documents.contract_type IS 'Type of contract detected by AI (employment, real_estate, software, etc.)';
COMMENT ON COLUMN documents.role_validation IS 'Role validation data including isRelevant, confidence, suggestions, and selectedRole';

-- Create index on contract_type for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_contract_type ON documents(contract_type);

-- Example of role_validation structure:
-- {
--   "isRelevant": true,
--   "confidence": 0.8,
--   "suggestions": ["employee", "contractor"],
--   "selectedRole": "employee"
-- } 