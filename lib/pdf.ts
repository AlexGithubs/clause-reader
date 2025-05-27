import * as pdfjs from 'pdfjs-dist';

// NOTE: Worker path is set explicitly in functions below for Node.js context
// and separately in PDFViewer.tsx for browser context.

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
    // --- Explicitly set Node.js worker path --- 
    // This ensures the correct path is used even if global state is affected by frontend code.
    if (typeof window === 'undefined') { // Double check we are in Node.js
      try {
         pdfjs.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.min.js');
      } catch (error) {
        console.error("CRITICAL: Failed to resolve pdfjs-dist worker script path in Node.js:", error);
        throw new Error("Could not find pdf.worker.min.js for backend processing.");
      }
    }

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
    const clausePositions = findClausePositionsInText(textItems, clause.text, clause.page);
    
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
 * @param targetPageNumber The page number of the clause
 * @returns Array of position objects for the clause
 */
function findClausePositionsInText(textItems: any[], clauseText: string, targetPageNumber: number): any[] {
  // Normalize clause text for better matching
  const normalizedClauseText = clauseText.toLowerCase().trim();
  
  // Find potential starting points for the clause
  const matches = [];
  
  // Check each text item *on the target page* as a potential start
  for (let i = 0; i < textItems.length; i++) {
    // --- Filter by Page Number --- 
    if (textItems[i].page !== targetPageNumber) {
      continue; // Skip items not on the target page
    }

    const startItem = textItems[i];
    const normalizedStartText = startItem.text.toLowerCase().trim();
    
    // Only consider item if the normalized clause starts with the item's text
    if (normalizedClauseText.startsWith(normalizedStartText)) {
      
      // Try to find the full clause by combining text items
      let combinedText = startItem.text; // Use original spacing initially
      let normalizedCombinedText = normalizedStartText; // Track normalized version
      let endIndex = i;
      
      // Combine subsequent text items until the full clause is found
      for (let j = i + 1; j < textItems.length && j < i + 50; j++) {
        const nextItemText = textItems[j].text;
        combinedText += ' ' + nextItemText; // Keep original spacing for quality check?
        normalizedCombinedText += ' ' + nextItemText.toLowerCase().trim(); // Add normalized version
        
        // --- Stricter Full Match Condition --- 
        // Check if the combined text (normalized) now matches the start of the target clause
        // Or, if the target clause (normalized) starts with the combined text
        const currentNormalizedCombined = normalizedCombinedText.replace(/\s+/g, ' '); // Normalize spaces
        const targetNormalized = normalizedClauseText.replace(/\s+/g, ' '); // Normalize spaces in target

        if (targetNormalized.startsWith(currentNormalizedCombined)) {
          // If the combined text fully matches the target, we're done
          if (currentNormalizedCombined.length >= targetNormalized.length) {
            endIndex = j;
            break;
          }
          // Otherwise, continue adding items
        } else {
          // If the target no longer starts with the combined text, this path is wrong
          endIndex = j;
          break;
        }
      }
      
      // If a potential match was found (endIndex advanced)
      if (endIndex > i) {
        // Re-normalize the final combined text and target for quality calculation
        const finalCombinedText = textItems.slice(i, endIndex + 1).map(item => item.text).join(' ');
        const finalNormalizedCombined = finalCombinedText.toLowerCase().replace(/\s+/g, ' ');
        const targetNormalized = normalizedClauseText.replace(/\s+/g, ' ');

        // Calculate accurate bounding box encompassing all items in the match
        let minLeft = Infinity, maxRight = -Infinity, minTop = Infinity, maxBottom = -Infinity;
        const matchedItems = textItems.slice(i, endIndex + 1);

        matchedItems.forEach(item => {
          const pos = item.position;
          minLeft = Math.min(minLeft, pos.left);
          minTop = Math.min(minTop, pos.top);
          maxRight = Math.max(maxRight, pos.left + pos.width);
          maxBottom = Math.max(maxBottom, pos.top + pos.height);
        });

        // Ensure valid coordinates if only one item was matched slightly off
        if (minLeft === Infinity) minLeft = startItem.position.left;
        if (minTop === Infinity) minTop = startItem.position.top;
        if (maxRight === -Infinity) maxRight = startItem.position.left + startItem.position.width;
        if (maxBottom === -Infinity) maxBottom = startItem.position.top + startItem.position.height;

        matches.push({
          page: startItem.page, // Page number comes from the starting item
          top: minTop,
          left: minLeft,
          width: maxRight - minLeft,
          height: maxBottom - minTop,
          quality: Math.min(1.0, finalNormalizedCombined.length / targetNormalized.length), // Keep quality score
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

// Export the function so it can be used directly
export { findClausePositionsInText };

export default {
  extractTextFromPDF,
  extractTextWithPositions,
  generateClausePositions,
};