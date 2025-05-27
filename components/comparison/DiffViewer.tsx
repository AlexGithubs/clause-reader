import React from 'react';
import styles from '@/styles/Comparison.module.css';

// Diff item types
type DiffType = 'addition' | 'removal' | 'modification' | 'unchanged';

interface DiffItem {
  type: DiffType;
  content: string;
}

interface DiffViewerProps {
  baseText: string;
  revisedText: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ baseText, revisedText }) => {
  // Simple diff algorithm that compares lines
  const computeDiff = (base: string, revised: string): DiffItem[] => {
    const baseLines = base.split('\n');
    const revisedLines = revised.split('\n');
    const diffItems: DiffItem[] = [];
    
    // Map to track which base lines have been matched
    const matchedBaseLines = new Set<number>();
    
    // First pass: Find exact matches and modifications
    for (let i = 0; i < revisedLines.length; i++) {
      const revisedLine = revisedLines[i];
      let bestMatch = -1;
      let bestMatchSimilarity = 0;
      
      // Look for the best matching line in the base text
      for (let j = 0; j < baseLines.length; j++) {
        if (matchedBaseLines.has(j)) continue;
        
        const baseLine = baseLines[j];
        
        // Calculate similarity (very simple approach)
        if (revisedLine === baseLine) {
          // Exact match
          bestMatch = j;
          bestMatchSimilarity = 1;
          break;
        } else {
          // Check partial match (words in common)
          const baseWords = new Set(baseLine.split(' '));
          const revisedWords = revisedLine.split(' ');
          const commonWords = revisedWords.filter(word => baseWords.has(word));
          
          const similarity = commonWords.length / Math.max(baseWords.size, revisedWords.length);
          
          if (similarity > 0.5 && similarity > bestMatchSimilarity) {
            bestMatch = j;
            bestMatchSimilarity = similarity;
          }
        }
      }
      
      if (bestMatch >= 0) {
        // Found a match or similar line
        matchedBaseLines.add(bestMatch);
        
        if (bestMatchSimilarity === 1) {
          // Exact match
          diffItems.push({
            type: 'unchanged',
            content: revisedLine
          });
        } else {
          // Modified line
          diffItems.push({
            type: 'modification',
            content: revisedLine
          });
        }
      } else {
        // No match - this is a new line
        diffItems.push({
          type: 'addition',
          content: revisedLine
        });
      }
    }
    
    // Second pass: Find removals (base lines that weren't matched)
    for (let j = 0; j < baseLines.length; j++) {
      if (!matchedBaseLines.has(j)) {
        // This line was removed
        diffItems.push({
          type: 'removal',
          content: baseLines[j]
        });
      }
    }
    
    // Sort the diff items to maintain the document structure
    // In a real implementation, you'd need a more sophisticated algorithm
    // that preserves the order of the text.
    return diffItems.sort((a, b) => {
      // Sort by type to group additions/removals together
      const typeOrder = {
        unchanged: 0,
        modification: 1,
        removal: 2,
        addition: 3
      };
      return typeOrder[a.type] - typeOrder[b.type];
    });
  };
  
  const diffItems = computeDiff(baseText, revisedText);
  
  return (
    <div className={styles.diffContainer}>
      <div className={styles.diffHeader}>
        <div className={styles.diffStats}>
          <span className={styles.additionStat}>
            {diffItems.filter(item => item.type === 'addition').length} additions
          </span>
          <span className={styles.removalStat}>
            {diffItems.filter(item => item.type === 'removal').length} removals
          </span>
          <span className={styles.modificationStat}>
            {diffItems.filter(item => item.type === 'modification').length} modifications
          </span>
        </div>
      </div>
      
      <div className={styles.diffContent}>
        {diffItems.map((item, index) => (
          <div 
            key={index} 
            className={`${styles.diffLine} ${styles[item.type]}`}
          >
            <span className={styles.diffPrefix}>
              {item.type === 'addition' && '+'}
              {item.type === 'removal' && '-'}
              {item.type === 'modification' && '~'}
              {item.type === 'unchanged' && ' '}
            </span>
            <span className={styles.diffText}>{item.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiffViewer;