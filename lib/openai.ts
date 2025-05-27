import OpenAI from 'openai';

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract clauses from contract text
 * @param contractText The full text of the contract
 * @returns Array of extracted clauses with analysis
 */
export async function extractClauses(contractText: string) {
  try {
    // Trim contract text to fit within token limits
    const trimmedText = contractText.substring(0, 15000); // Increased limit for GPT-4o
    
    // Create prompt for OpenAI using Chat Completions
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `Analyze the following contract text and extract individual clauses. Format the response as a valid JSON array of clause objects.
Each object must have these properties:
- id: a unique identifier (e.g., clause-1, clause-2)
    - text: the full text of the clause
- tags: an array of relevant tags (e.g., liability, termination, payment, confidentiality)
- explanation: a brief explanation of the clause and its potential implications
- label: one of: 'favorable', 'unfavorable', 'harsh', 'standard provision' (representing the client's perspective)`
      },
      {
        role: 'user',
        content: `Contract text:
${trimmedText}`
      }
    ];

    // Call OpenAI Chat Completions API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Use a model that supports JSON mode
      messages: messages,
      response_format: { type: "json_object" }, // Request JSON output
      max_tokens: 4000, // Adjust as needed
      temperature: 0.2,
    });

    // Parse the response
    const output = response.choices[0].message?.content?.trim() || '';
    
    try {
      // Try to parse as JSON
      const parsedOutput = JSON.parse(output);
      // Assuming the response contains the array directly or under a key like 'clauses'
      const clauses = Array.isArray(parsedOutput) ? parsedOutput : parsedOutput.clauses;
      if (!Array.isArray(clauses)) {
          throw new Error("Parsed response is not an array of clauses.");
      }
      return clauses;
    } catch (parseError) {
      // If parsing fails, return a simpler structure with the raw output
      console.error('Failed to parse OpenAI response as JSON:', parseError, "Raw output:", output);
      return [{
        id: 'parse-error',
        text: 'Failed to parse clauses properly.',
        tags: ['error'],
        explanation: `The AI response could not be parsed as JSON. Raw output: ${output.substring(0, 200)}...`,
        label: 'unknown', // Use 'unknown' or keep rating property consistent
      }];
    }
  } catch (error) {
    console.error('Error analyzing clauses with OpenAI:', error);
    throw new Error('Failed to analyze clauses with AI');
  }
}

/**
 * Generate a simple summary of contract clauses
 * @param clauses Array of clause objects
 * @returns Summary object with overview and key points
 */
export async function generateSimpleSummary(clauses: any[]) {
  try {
    // Prepare the input for OpenAI
    const clauseContext = clauses.map(clause => {
      return `Clause (ID: ${clause.id}, Tags: ${clause.tags.join(', ')}, Label: ${clause.label || 'unlabeled'}):\n${clause.text}`;
    }).join('\n\n');

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: `Generate a simple summary of the provided contract clauses. Focus on key highlights, potential risks, and main terms. Keep the summary concise (around 100-150 words) and easy for non-legal professionals to understand. Also, extract 3-5 bullet points covering the most critical aspects.`
        },
        {
            role: 'user',
            content: `Contract clauses:\n${clauseContext}\n\nGenerate Summary and Key Points:`
        }
    ];

    // Call OpenAI Chat Completions API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 500,
      temperature: 0.4,
    });

    // Extract and return the summary
    const content = response.choices[0].message?.content?.trim() || 'Unable to generate summary.';
    
    // Attempt to parse structured summary and key points
    let summary = content;
    let keyPoints: string[] = [];

    // Simple parsing logic (adjust based on expected GPT output format)
    const summaryMatch = content.match(/Summary:(.*?)(Key Points:|###|$)/si);
    const keyPointsMatch = content.match(/(Key Points:|\* |- )(.+)/si);

    if (summaryMatch && summaryMatch[1]) {
      summary = summaryMatch[1].trim();
    }
    if (keyPointsMatch && keyPointsMatch[2]) {
      keyPoints = keyPointsMatch[2].split(/\n(?:\* |- )/).map(pt => pt.trim()).filter(pt => pt.length > 0);
    }
    // Fallback if parsing fails
    if (keyPoints.length === 0) {
        keyPoints = extractKeyPoints(summary); // Use the helper as fallback
    }
    
    return {
      summary,
      keyPoints,
    };
  } catch (error) {
    console.error('Error generating simple summary with OpenAI:', error);
    throw new Error('Failed to generate summary with AI');
  }
}

/**
 * Generate a detailed analysis of contract clauses
 * @param clauses Array of clause objects
 * @returns Analysis object with detailed insights and recommendations
 */
export async function generateDeepAnalysis(clauses: any[]) {
  try {
    // Prepare the input for OpenAI
    const clauseContext = clauses.map(clause => {
      return `Clause (ID: ${clause.id}, Tags: ${clause.tags.join(', ')}, Label: ${clause.label || 'unlabeled'}, Explanation: ${clause.explanation || 'N/A'}):\n${clause.text}`;
    }).join('\n\n');

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `Generate a comprehensive analysis AND specific recommendations for the following contract clauses.
Structure the response clearly:
1.  **Comprehensive Analysis:** Overall assessment, detailed analysis of key/risky clauses, potential negotiation points, comparison to standards.
2.  **Recommendations:** Bulleted list of specific actions or suggested modifications, with rationale.`
      },
      {
        role: 'user',
        content: `Contract clauses:\n${clauseContext}\n\nGenerate Analysis and Recommendations:`
      }
    ];

    // Call OpenAI Chat Completions API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 1500,
      temperature: 0.4,
    });

    // Extract the analysis and recommendations
    const content = response.choices[0].message?.content?.trim() || 'Unable to generate analysis and recommendations.';
    
    // Simple parsing based on expected structure (adjust as needed)
    const analysisMatch = content.match(/Comprehensive Analysis:(.*?)(Recommendations:|###|$)/si);
    const recommendationsMatch = content.match(/Recommendations:(.*)/si);
    
    const analysis = analysisMatch ? analysisMatch[1].trim() : "Analysis could not be extracted.";
    const recommendations = recommendationsMatch ? recommendationsMatch[1].trim().split(/\n(?:\* |- )/).map(rec => rec.trim()).filter(rec => rec.length > 0) : ["Recommendations could not be extracted."];
    
    // Calculate risk assessment
    const riskAssessment = calculateRiskAssessment(clauses);
    
    return {
      analysis,
      recommendations, // Return as an array of strings
      riskAssessment,
    };
  } catch (error) {
    console.error('Error generating deep analysis with OpenAI:', error);
    throw new Error('Failed to generate deep analysis with AI');
  }
}

/**
 * Helper function to extract key points from summary text
 * @param summary Summary text
 * @returns Array of key points
 */
function extractKeyPoints(summary: string): string[] {
  // Simple approach: split by sentences and take the first few
  const sentences = summary.split(/[.!?]+/).filter(s => s.trim() !== '').map(s => s.trim());
  
  // Take up to 5 key points
  return sentences.slice(0, 5).map(s => s + '.');
}

/**
 * Calculate risk assessment based on clause labels
 * @param clauses Array of clause objects
 * @returns Risk assessment object
 */
function calculateRiskAssessment(clauses: any[]) {
  let totalSeverity = 0;
  const counts = {
    favorable: clauses.filter(c => c.label === 'favorable').length,
    unfavorable: clauses.filter(c => c.label === 'unfavorable').length,
    harsh: clauses.filter(c => c.label === 'harsh').length,
    standardProvision: clauses.filter(c => c.label === 'standard provision').length,
    unknown: 0
  };
  
  // Calculate total labeled clauses
  const totalLabeled = Object.values(counts).reduce((sum, count) => sum + count, 0);
  
  // Calculate risk score
  let riskScore = 50;
  if (totalLabeled > 0) {
    riskScore = 50 + (counts.harsh * 50) - (counts.unfavorable * 30);
    riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));
  }
  
  // Determine risk level
  let riskLevel;
  if (riskScore < 20) riskLevel = 'Low';
  else if (riskScore < 40) riskLevel = 'Moderate';
  else if (riskScore < 60) riskLevel = 'Significant';
  else if (riskScore < 80) riskLevel = 'High';
  else riskLevel = 'Extreme';
  
  // Identify key risk areas (tags from bad/harsh clauses)
  const riskAreas = new Set<string>();
  clauses
    .filter(c => c.label === 'unfavorable' || c.label === 'harsh')
    .forEach(c => c.tags?.forEach((tag: string) => riskAreas.add(tag))); // Added safe navigation for tags
  
  return {
    riskScore,
    riskLevel,
    riskAreas: Array.from(riskAreas),
    clauseBreakdown: counts,
  };
}

/**
 * Filters clauses considered risky (bad or harsh).
 * @param clauses Array of clause objects
 */
function filterRiskyClauses(clauses: any[]) {
  return clauses.filter(c => c.label === 'unfavorable' || c.label === 'harsh');
}

// Export individual functions directly if used elsewhere, or keep default export
export default {
  extractClauses,
  generateSimpleSummary,
  generateDeepAnalysis,
};