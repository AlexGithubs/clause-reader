import { getSupabaseAdmin } from './supabase';
import { Document, Clause } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export async function createDocument(userId: string, name: string, filePath: string, fullText?: string, userParty?: string) {
    const documentId = `processed-${uuidv4()}`;
    
    const { data, error } = await getSupabaseAdmin()
      .from('documents')
      .insert({
        id: documentId,
        user_id: userId,
        name,
        file_path: filePath,
        status: 'pending',
        full_text: fullText,
        user_party: userParty,
      });
      
    if (error) {
      console.error('Error creating document:', error);
      throw error;
    }
    
    return documentId;
  }
  
  export async function updateDocumentStatus(documentId: string, status: 'pending' | 'processing' | 'completed' | 'error') {
    const { error } = await getSupabaseAdmin()
      .from('documents')
      .update({ status })
      .eq('id', documentId);
      
    if (error) {
      console.error('Error updating document status:', error);
      throw error;
    }
  }
  
  export async function getDocumentById(documentId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();
      
    if (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
    
    return data as Document;
  }
  
  export async function getDocumentsByUserId(userId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching user documents:', error);
      throw error;
    }
    
    return data as Document[];
  }
  
  // Clause operations
  
  export async function saveClausesToDocument(documentId: string, clauses: Omit<Clause, 'id' | 'document_id'>[]) {
    // Add IDs to clauses
    const clausesWithIds = clauses.map(clause => ({
      ...clause,
      id: uuidv4(),
      document_id: documentId
    }));
    
    const { data, error } = await getSupabaseAdmin()
      .from('clauses')
      .insert(clausesWithIds);
      
    if (error) {
      console.error('Error saving clauses:', error);
      throw error;
    }
    
    return clausesWithIds;
  }
  
  export async function getClausesByDocumentId(documentId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from('clauses')
      .select('*')
      .eq('document_id', documentId);
      
    if (error) {
      console.error('Error fetching clauses:', error);
      throw error;
    }
    
    return data as Clause[];
  }
  
  // Storage operations
  
  export async function uploadPdf(userId: string, fileName: string, fileBase64: string) {
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    const filePath = `${userId}/${uuidv4()}-${fileName}`;
    
    const { data, error } = await getSupabaseAdmin()
      .storage
      .from('pdfs')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });
      
    if (error) {
      console.error('Error uploading PDF:', error);
      throw error;
    }
    
    // Get public URL
    const { data: urlData } = getSupabaseAdmin()
      .storage
      .from('pdfs')
      .getPublicUrl(filePath);
      
    return {
      filePath,
      publicUrl: urlData.publicUrl
    };
  }
  
  export async function getPdfUrl(filePath: string) {
    const { data } = getSupabaseAdmin()
      .storage
      .from('pdfs')
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  } 