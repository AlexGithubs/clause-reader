import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import OpenAI from 'openai';
import { getDocumentById, getDocumentKeyPoints, getDocumentClauses } from '@/lib/db';

// Initialize OpenAI client v4+
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    console.log("Function summarize-simple triggered, method:", event.httpMethod);
    
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        console.log("Parsing request body");
        const requestBody = event.body || '{}';
        console.log("Request body:", requestBody);
        
        const { fileId } = JSON.parse(requestBody);
        console.log("FileId:", fileId);

        if (!fileId) {
            console.log("No fileId provided");
            return { statusCode: 400, body: JSON.stringify({ error: 'File ID is required' }) };
}

        // Retrieve document from database
        console.log("Retrieving document from database");
        let document;
        try {
            document = getDocumentById(fileId);
            console.log("Document retrieved:", document ? "yes" : "no");
        } catch (dbError) {
            console.error("Database error when getting document:", dbError);
    return {
                statusCode: 500, 
                body: JSON.stringify({ 
                    error: "Database error when retrieving document", 
                    details: dbError instanceof Error ? dbError.message : String(dbError) 
                }) 
    };
  }

        if (!document) {
            console.log("Document not found");
            // Return clear error instead of mock data
      return {
                statusCode: 404,
                body: JSON.stringify({ 
                    error: "Document not found", 
                    message: "The requested document could not be found. Please upload a document first."
                })
            };
        }
        
        // Get key points and clauses from database
        console.log("Getting key points and clauses");
        let keyPoints: string[] = [];
        let clauses = [];
        
        try {
            keyPoints = getDocumentKeyPoints(fileId);
            console.log("Key points retrieved:", keyPoints.length);
        } catch (dbError) {
            console.error("Database error when getting key points:", dbError);
            keyPoints = [];
        }
        
        try {
            clauses = getDocumentClauses(fileId);
            console.log("Clauses retrieved:", clauses.length);
        } catch (dbError) {
            console.error("Database error when getting clauses:", dbError);
            clauses = [];
        }
        
        // Return the document data
        console.log("Returning document data");
    return {
      statusCode: 200,
      body: JSON.stringify({
        fileId,
                filename: document.filename,
                summary: document.summary,
                keyPoints,
                highlightedClauses: clauses,
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };

  } catch (error) {
        console.error("General error in summarize-simple:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
    return {
      statusCode: 500,
            body: JSON.stringify({ error: "Failed to generate simple summary", details: message }),
            headers: {
                'Content-Type': 'application/json'
            }
    };
  }
};

export { handler };