import { Handler } from '@netlify/functions';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun, Comment, CommentRangeEnd, CommentRangeStart } from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

interface ExportRequest {
  fileId: string;
  clauses: {
    id: string;
    text: string;
    page: number;
    position: {
      top: number;
      left: number;
      width: number;
      height: number;
    };
    tags: string[];
    label?: 'favorable' | 'unfavorable' | 'harsh' | 'standard provision';
    explanation?: string;
  }[];
  format: 'pdf' | 'docx';
}

// Helper function to get label color
function getLabelColor(label?: string): { r: number; g: number; b: number } {
  switch (label) {
    case 'favorable':
      return { r: 0, g: 1, b: 0 }; // Green
    case 'unfavorable':
      return { r: 1, g: 0, b: 0 }; // Red
    case 'harsh':
      return { r: 1, g: 0.5, b: 0 }; // Orange
    case 'standard provision':
      return { r: 0.5, g: 0.5, b: 1 }; // Light Purple/Blue
    default:
      return { r: 0.5, g: 0.5, b: 0.5 }; // Grey
  }
}

// Export PDF with annotations
async function exportAnnotatedPDF(pdfBytes: Uint8Array, clauses: ExportRequest['clauses']): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // Process each clause
  for (const clause of clauses) {
    if (!clause.page || clause.page < 1 || clause.page > pdfDoc.getPageCount()) {
      continue;
    }
    
    const page = pdfDoc.getPage(clause.page - 1); // PDF pages are 0-indexed
    const { width, height } = page.getSize();
    
    // Draw highlight
    const color = getLabelColor(clause.label);
    const position = clause.position;
    
    // Create a semi-transparent highlight
    page.drawRectangle({
      x: position.left,
      y: height - (position.top + position.height), // PDF coordinates are from bottom-left
      width: position.width,
      height: position.height,
      color: rgb(color.r, color.g, color.b),
      opacity: 0.25,
    });
    
    // Add label and explanation as annotation
    if (clause.label) {
      const labelText = `${clause.label.toUpperCase()}: ${clause.tags.join(', ')}`;
      const explanationText = clause.explanation || '';
      
      // Add a note in the margin
      page.drawText(labelText, {
        x: position.left,
        y: height - position.top - position.height - 20, // Position below the highlight
        size: 8,
        font: helveticaFont,
        color: rgb(color.r, color.g, color.b),
      });
      
      if (explanationText) {
        const lines = splitTextIntoLines(explanationText, 40);
        lines.forEach((line, index) => {
          page.drawText(line, {
            x: position.left,
            y: height - position.top - position.height - 30 - (index * 10), // Position below the label
            size: 6,
            font: helveticaFont,
            color: rgb(0.3, 0.3, 0.3),
          });
        });
      }
    }
  }
  
  return await pdfDoc.save();
}

// Helper to split text into lines of max length
function splitTextIntoLines(text: string, maxLength: number): string[] {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + word).length > maxLength) {
      lines.push(currentLine);
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// Export DOCX with track changes
async function exportWordDoc(text: string, clauses: ExportRequest['clauses']): Promise<Buffer> {
  // Create a new document structure first
  const docOptions = {
    sections: [{
      properties: {},
      children: [] as Paragraph[] // Use Paragraph type for children array
    }]
  };
  const doc: Document = new Document(docOptions);
  
  // Simple approach: create a document with comments
  const children = docOptions.sections[0].children; // Get reference to children array
  
  // Split text into paragraphs
  const paragraphs = text.split('\n\n');
  
  // Process each paragraph
  paragraphs.forEach((paragraph, index) => {
    // Create a new paragraph
    const para = new Paragraph({});
    
    // Add the paragraph text
    para.addChildElement(new TextRun(paragraph));
    
    // Find clauses that match this paragraph
    const matchingClauses = clauses.filter(clause => 
      paragraph.includes(clause.text) && clause.label
    );
    
    // Add comments for matching clauses
    matchingClauses.forEach((clause, index) => {
      const startPos = paragraph.indexOf(clause.text);
      if (startPos >= 0) {
        const commentId = index;
        const commentText = `${clause.label?.toUpperCase()}: ${clause.explanation || 'No explanation'}`;
        
        // Create comment elements
        const comment = new Comment({
          id: commentId,
          author: "Clause Reader",
          date: new Date(),
          children: [
            new Paragraph({
              children: [
                new TextRun(commentText),
              ],
            }),
          ],
        });
        
        // Add comment to the document
        para.addChildElement(new CommentRangeStart(commentId));
        para.addChildElement(new TextRun(clause.text));
        para.addChildElement(new CommentRangeEnd(commentId));
        para.addChildElement(comment);
      }
    });
    
    // Add paragraph to document
    children.push(para);
  });
  
  // Generate the document
  return await Packer.toBuffer(doc);
}

export const handler: Handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { fileId, clauses, format } = JSON.parse(event.body || '{}') as ExportRequest;

    if (!fileId || !clauses || !format) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // In a real implementation, we would retrieve the actual PDF file
    // For this example, we'll use a placeholder approach
    
    let responseData: string | Buffer;
    let contentType: string;
    let filename: string;
    
    if (format === 'pdf') {
      // Mock PDF - in real implementation, retrieve from storage
      const pdfPath = path.join(__dirname, 'sample-contract.pdf');
      
      // In production, you'd fetch the actual file:
      // const pdfBytes = await storage.getFile(fileId);
      
      // For now, use a placeholder or mock data
      const pdfBytes = new Uint8Array([/* PDF bytes would go here */]);
      
      // Process the PDF
      const annotatedPdf = await exportAnnotatedPDF(pdfBytes, clauses);
      
      responseData = Buffer.from(annotatedPdf).toString('base64');
      contentType = 'application/pdf';
      filename = `contract-annotated-${fileId}.pdf`;
    } else {
      // Generate Word document
      // For a real implementation, we'd extract text from the original PDF
      const contractText = "This is a sample contract text.\n\nThe Customer agrees to indemnify and hold harmless the Provider from any claims.\n\nEither party may terminate this agreement with 30 days written notice.";
      
      const docBuffer = await exportWordDoc(contractText, clauses);
      
      responseData = docBuffer.toString('base64');
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      filename = `contract-comments-${fileId}.docx`;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      body: responseData,
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Export error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to export document' }),
    };
  }
};