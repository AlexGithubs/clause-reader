import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { supabase } from './supabase';
import { Document as SupabaseDocument, Clause } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// Define the path to the SQLite database
const isProduction = process.env.NODE_ENV === 'production';

// Use project root relative path for dev, /tmp for production
const DB_PATH = isProduction
  ? path.join('/tmp', 'clause-reader.db') 
  : path.join(process.cwd(), '.db', 'clause-reader.db'); 

console.log(`Database path configured for: ${DB_PATH} (Production: ${isProduction})`); // Add log for debugging

// Define Document type (useful for function signatures)
interface Document {
  id: string;
  userId: string;
  filename: string;
  fileSize: number;
  fileType: string;
  fileContent: Buffer; // Included here!
  summary?: string | null;
  createdAt?: string;
  uploadDate?: string; // Added from upload.ts
}

// --- No Singleton: Create connection per function --- 

function createDbConnection(): Database.Database {
  // Ensure the directory exists (might run multiple times, but that's okay)
  const dbDir = path.dirname(DB_PATH);
  if (!isProduction && !fs.existsSync(dbDir)) { // Only check/create in dev
     console.log(`Ensuring DB directory exists: ${dbDir}`);
     fs.mkdirSync(dbDir, { recursive: true });
  }
  
  try {
      const db = new Database(DB_PATH); 
      db.pragma('foreign_keys = ON');
      // Initialize schema on first connect (best effort, might run multiple times)
      // A more robust solution would track schema version
      initDbSchemaIfNeeded(db); 
      return db;
  } catch (error) {
     console.error('Failed to create DB connection:', error);
     throw new Error('Database connection failed'); // Rethrow to signal failure
  }
}

let schemaInitialized = false; // Simple flag to avoid redundant schema logs/checks

// Initialize the database schema if not already done
function initDbSchemaIfNeeded(db: Database.Database) {
  if (schemaInitialized && !isProduction) return; // Skip if already done (in dev)

  console.log('Initializing/Verifying DB Schema...');
  const createCanonicalClausesTable = `
    CREATE TABLE IF NOT EXISTS canonical_clauses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT NOT NULL,
      avg_severity REAL NOT NULL,
      occurrence_count INTEGER NOT NULL DEFAULT 1,
      sample_clause TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  const createTagIndexes = `
    CREATE INDEX IF NOT EXISTS idx_canonical_clauses_tag ON canonical_clauses(tag)
  `;
  
  // Add tables for storing user documents and analysis results
  const createDocumentsTable = `
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      summary TEXT,
      upload_date TEXT, -- Added column
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      -- file_content BLOB will be added via ALTER TABLE
    )
  `;
  
  const createClausesTable = `
    CREATE TABLE IF NOT EXISTS document_clauses (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      text TEXT NOT NULL,
      page INTEGER NOT NULL,
      position JSON NOT NULL,
      tags TEXT NOT NULL,
      label TEXT,
      explanation TEXT,
      benchmark JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `;
  
  const createKeyPointsTable = `
    CREATE TABLE IF NOT EXISTS document_key_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id TEXT NOT NULL,
      point_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `;
  
  const createDocumentIndexes = `
    CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_document_clauses_document_id ON document_clauses(document_id);
    CREATE INDEX IF NOT EXISTS idx_document_key_points_document_id ON document_key_points(document_id);
  `;
  
  // Execute table creations first
  db.exec(createCanonicalClausesTable);
  db.exec(createTagIndexes);
  db.exec(createDocumentsTable);
  db.exec(createClausesTable);
  db.exec(createKeyPointsTable);
  db.exec(createDocumentIndexes);
  
  // Add file_content column if it doesn't exist
  if (!columnExists(db, 'documents', 'file_content')) {
    console.log("Adding 'file_content' column to 'documents' table.");
    db.exec('ALTER TABLE documents ADD COLUMN file_content BLOB');
  }
   console.log('DB Schema initialization/verification complete.');
  schemaInitialized = true;
}

// Check if a column exists in a table
function columnExists(db: Database.Database, tableName: string, columnName: string): boolean {
  const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
  const columns = stmt.all() as { name: string }[];
  return columns.some(col => col.name === columnName);
}

// Re-export getDb for seed function compatibility
export function getDb(): Database.Database {
    console.warn("Using legacy getDb() for seeder - consider refactoring seeder.");
    return createDbConnection();
}

// Re-export closeDb for seed function compatibility
export function closeDb(db: Database.Database | null): void {
    if (db) {
        console.warn("Using legacy closeDb() for seeder - closing connection.");
        db.close();
    }
}

// --- Database Operation Functions (Create/Close connection each time) --- 

// Save a document
export function saveDocument(document: Omit<Document, 'createdAt'>): void { // Use Omit for clarity
  let db: Database.Database | null = null;
  try {
    db = createDbConnection();
    const stmt = db.prepare(`
      INSERT INTO documents (id, user_id, filename, file_size, file_type, summary, upload_date, file_content)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      document.id,
      document.userId,
      document.filename,
      document.fileSize,
      document.fileType,
      document.summary || null,
      document.uploadDate,
      document.fileContent
    );
  } catch (error) {
     console.error("Error in saveDocument:", error);
     throw error; // Re-throw error
  } finally {
    if (db) db.close();
  }
}

// Get a single document by ID
export function getDocumentById(documentId: string): Document | null {
  let db: Database.Database | null = null;
   try {
    db = createDbConnection();
    const stmt = db.prepare('SELECT id, user_id, filename, file_size, file_type, summary, created_at, upload_date, file_content FROM documents WHERE id = ?');
    const result = stmt.get(documentId);
    return result ? (result as Document) : null; 
   } catch (error) {
     console.error("Error in getDocumentById:", error);
     throw error; // Re-throw error
  } finally {
    if (db) db.close();
  }
}

// Get the average severity for a tag
export function getAvgSeverityForTag(tag: string): number | null {
  const db = createDbConnection(); // Get the singleton instance
  const stmt = db.prepare('SELECT avg_severity FROM canonical_clauses WHERE tag = ?');
  const result = stmt.get(tag) as { avg_severity: number } | undefined;
  
  return result ? result.avg_severity : null;
}

// Get the percentile for a severity value within a tag
export function getSeverityPercentile(tag: string, severity: number): number {
  const db = createDbConnection(); // Get the singleton instance
  const stmt = db.prepare('SELECT avg_severity FROM canonical_clauses WHERE tag = ?');
  // ... (rest of logic) ...
   const result = stmt.get(tag) as { avg_severity: number } | undefined;
    if (!result) { return 50; }
    const avgSeverity = result.avg_severity;
    if (severity === avgSeverity) { return 50; } 
    else if (severity > avgSeverity) { return 50 + Math.min(((severity - avgSeverity) / avgSeverity) * 50, 50); } 
    else { return 50 - Math.min(((avgSeverity - severity) / avgSeverity) * 50, 50); }
}

// Update the average severity for a tag
export function updateAvgSeverity(tag: string, severity: number, sampleClause?: string): void {
  const db = createDbConnection(); // Get the singleton instance
  const stmt = db.prepare(`
    INSERT INTO canonical_clauses (tag, avg_severity, sample_clause)
    VALUES (?, ?, ?)
    ON CONFLICT (tag) DO UPDATE SET
      avg_severity = (avg_severity * occurrence_count + ?) / (occurrence_count + 1),
      occurrence_count = occurrence_count + 1,
      updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(tag, severity, sampleClause || null, severity);
}

// Get all tags with their average severities
export function getAllTags(): Array<{ tag: string, avg_severity: number, occurrence_count: number }> {
  const db = createDbConnection(); // Get the singleton instance
  const stmt = db.prepare('SELECT tag, avg_severity, occurrence_count FROM canonical_clauses');
  return stmt.all() as Array<{ tag: string, avg_severity: number, occurrence_count: number }>;
}

// Save key points for a document
export function saveKeyPoints(documentId: string, keyPoints: string[]): void {
  let db: Database.Database | null = null;
  try {
    db = createDbConnection();
    const stmt = db.prepare(`INSERT INTO document_key_points (document_id, point_text) VALUES (?, ?)`);
    const insertMany = db.transaction((docId, points) => {
      for (const point of points) { stmt.run(docId, point); }
    });
    insertMany(documentId, keyPoints);
  } catch (error) {
     console.error("Error in saveKeyPoints:", error);
     throw error; // Re-throw error
  } finally {
    if (db) db.close();
  }
}

// Save clauses for a document
export function saveClauses(documentId: string, clauses: Array<{
  id: string;
  text: string;
  page: number;
  position: { top: number; left: number; width: number; height: number };
  tags: string[];
  label?: string;
  explanation?: string;
  benchmark?: any;
}>): void {
  const db = createDbConnection(); // Get the singleton instance
  const stmt = db.prepare(`
    INSERT INTO document_clauses (id, document_id, text, page, position, tags, label, explanation, benchmark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((docId, cls) => { // Use different var names
    for (const clause of cls) {
      stmt.run(
        clause.id,
        docId,
        clause.text,
        clause.page,
        JSON.stringify(clause.position),
        JSON.stringify(clause.tags),
        clause.label || null,
        clause.explanation || null,
        clause.benchmark ? JSON.stringify(clause.benchmark) : null
      );
    }
  });
  insertMany(documentId, clauses);
}

// Get all documents for a user
export function getUserDocuments(userId: string): Array<{
  id: string;
  filename: string;
  fileSize: number;
  fileType: string;
  summary: string | null;
  createdAt: string;
  uploadDate: string | null;
}> {
  const db = createDbConnection(); // Get the singleton instance
  const stmt = db.prepare('SELECT id, filename, file_size, file_type, summary, created_at, upload_date FROM documents WHERE user_id = ? ORDER BY created_at DESC');
  return stmt.all(userId) as Array<any>; // Simplified type for now
}

// Get key points for a document
export function getDocumentKeyPoints(documentId: string): string[] {
  const db = createDbConnection(); // Get the singleton instance
  const stmt = db.prepare('SELECT point_text FROM document_key_points WHERE document_id = ? ORDER BY id ASC');
  const results = stmt.all(documentId) as { point_text: string }[];
  return results.map(row => row.point_text);
}

// Get clauses for a document
export function getDocumentClauses(documentId: string): Array<any> { // Simplified type for now
  const db = createDbConnection(); // Get the singleton instance
  const stmt = db.prepare('SELECT id, text, page, position, tags, label, explanation, benchmark FROM document_clauses WHERE document_id = ? ORDER BY id ASC');
  const results = stmt.all(documentId) as any[];
  return results.map(row => ({
    ...row,
    position: JSON.parse(row.position || '{}'),
    tags: JSON.parse(row.tags || '[]'),
    benchmark: row.benchmark ? JSON.parse(row.benchmark) : null,
  }));
}

// Default export might not be needed if only using named exports
// export default { ... } 

// Document operations
