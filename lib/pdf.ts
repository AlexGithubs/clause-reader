import * as pdfjs from 'pdfjs-dist';

// Set PDF.js worker path
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

/**
 * Extract text content from a PDF file
 * @param pdfData ArrayBuffer containing the PDF data
 * @returns Promise resolving to the extracted text content
 */
export async function extractTextFromPDF(pdfData: ArrayBuffer): Promise<string> {
  try {
    // Load the PDF document
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfData) }).promise;
    
    // Initialize empty text string
    let text = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      // Concatenate text items with spaces
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');
      
      text += pageText + '\n\n';
    }
    
    return text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text and layout information for clause highlighting
 * @param pdfData ArrayBuffer containing the PDF data
 * @returns Promise resolving to an array of text content with position data
 */
export async function extractTextWithPositions(pdfData: ArrayBuffer): Promise<any[]> {
  try {
    // Load the PDF document
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfData) }).promise;
    
    // Array to store text items with positions
    const textItems = [];
    
    // Process each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const content = await page.getTextContent();
      
      // Add page, viewport, and position data to each text item
      for (const item of content.items) {
        if ('transform' in item && 'str' in item) { // Type guard
          const tx = pdfjs.Util.transform(
            viewport.transform,
            item.transform
          );
      
          textItems.push({
            text: item.str,
            page: i,
            position: {
              left: tx[4],
              top: tx[5],
              width: item.width,
              height: item.height,
            },
          });
        }
      }
    }
    
    return textItems;
  } catch (error) {
    console.error('Error extracting text with positions from PDF:', error);
    throw new Error('Failed to extract text with positions from PDF');
  }
}

/**
 * Generate positions for clause highlighting
 * @param textItems Array of text items with positions
 * @param clauses Array of extracted clauses
 * @returns Array of clauses with position data for highlighting
 */
export function generateClausePositions(textItems: any[], clauses: any[]): any[] {
  // Create a copy of the clauses array to avoid modifying the original
  const clausesWithPositions = [...clauses];
  
  // Process each clause
  for (const clause of clausesWithPositions) {
    // Find positions for the clause by matching text
    const clausePositions = findClausePositionsInText(textItems, clause.text);
    
    if (clausePositions.length > 0) {
      // Use the first match (best match)
      const bestMatch = clausePositions[0];
      
      // Add position data to the clause
      clause.page = bestMatch.page;
      clause.position = {
        top: bestMatch.top,
        left: bestMatch.left,
        width: bestMatch.width,
        height: bestMatch.height,
      };
    } else {
      // If no match found, set default position
      clause.page = 1;
      clause.position = {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      };
    }
  }
  
  return clausesWithPositions;
}

/**
 * Find positions of a clause in extracted text items
 * @param textItems Array of text items with positions
 * @param clauseText The text of the clause to find
 * @returns Array of position objects for the clause
 */
function findClausePositionsInText(textItems: any[], clauseText: string): any[] {
  // Normalize clause text for better matching
  const normalizedClauseText = clauseText.toLowerCase().trim();
  
  // Find potential starting points for the clause
  const matches = [];
  
  // Check each text item as a potential start of the clause
  for (let i = 0; i < textItems.length; i++) {
    const startItem = textItems[i];
    const normalizedStartText = startItem.text.toLowerCase().trim();
    
    // If the start of the clause text is found
    if (normalizedClauseText.startsWith(normalizedStartText) || 
        normalizedStartText.includes(normalizedClauseText.substring(0, 20))) {
      
      // Try to find the full clause by combining text items
      let combinedText = startItem.text;
      let endIndex = i;
      
      // Combine subsequent text items until the full clause is found
      for (let j = i + 1; j < textItems.length && j < i + 50; j++) {
        combinedText += ' ' + textItems[j].text;
        
        // Check if we've found the full clause
        if (combinedText.toLowerCase().includes(normalizedClauseText) ||
            normalizedClauseText.includes(combinedText.toLowerCase())) {
          endIndex = j;
          break;
        }
      }
      
      // If the match is good enough
      if (endIndex > i) {
        // Calculate bounding box for the clause
        const startPos = startItem.position;
        const endPos = textItems[endIndex].position;
        
        matches.push({
          page: startItem.page,
          top: startPos.top,
          left: startPos.left,
          width: endPos.left + endPos.width - startPos.left,
          height: Math.max(endPos.top + endPos.height - startPos.top, startPos.height),
          quality: combinedText.length / normalizedClauseText.length, // Match quality score
        });
      }
    }
  }
  
  // Sort matches by quality (closer to 1 is better)
  matches.sort((a, b) => {
    const qualityA = Math.abs(1 - a.quality);
    const qualityB = Math.abs(1 - b.quality);
    return qualityA - qualityB;
  });
  
  return matches;
}

export default {
  extractTextFromPDF,
  extractTextWithPositions,
  generateClausePositions,
};