import { Configuration, OpenAIApi } from 'openai';

// Set up OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create OpenAI client
const openai = new OpenAIApi(configuration);

/**
 * Extract clauses from contract text
 * @param contractText The full text of the contract
 * @returns Array of extracted clauses with analysis
 */
export async function extractClauses(contractText: string) {
  try {
    // Trim contract text to fit within token limits
    const trimmedText = contractText.substring(0, 3000);
    
    // Create prompt for OpenAI
    const prompt = `
    Analyze the following contract text and extract individual clauses. For each clause:
    1. Extract the text
    2. Assign relevant tags (e.g., liability, termination, payment, confidentiality)
    3. Provide a brief explanation of what the clause means and its potential implications
    4. Rate it as 'good', 'bad', 'harsh', or 'free' for the client

    Format the response as a JSON array of clause objects with the following properties:
    - id: a unique identifier for the clause
    - text: the full text of the clause
    - tags: an array of relevant tags
    - explanation: a brief explanation of the clause and its implications
    - rating: one of: 'good', 'bad', 'harsh', 'free'

    Contract text:
    ${trimmedText}
    `;

    // Call OpenAI API
    const response = await openai.createCompletion({
      model: "text-davinci-003", // or the latest recommended model
      prompt,
      max_tokens: 2000,
      temperature: 0.2,
    });

    // Parse the response
    const output = response.data.choices[0].text?.trim() || '';
    
    try {
      // Try to parse as JSON
      const clauses = JSON.parse(output);
      return clauses;
    } catch (parseError) {
      // If parsing fails, return a simpler structure with the raw output
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      return [{
        id: '1',
        text: 'Failed to parse clauses properly',
        tags: ['error'],
        explanation: 'The AI could not properly parse the contract text. Please try again or upload a clearer document.',
        rating: 'unknown',
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
    const clauseTexts = clauses.map(clause => {
      return `Clause: ${clause.text}
      Tags: ${clause.tags.join(', ')}
      Label: ${clause.label || 'unlabeled'}`;
    }).join('\n\n');

    const prompt = `
    Generate a simple summary of the following contract clauses. 
    Focus on key highlights, potential risks, and main terms.
    Keep the summary concise and easy to understand for non-legal professionals.
    
    Contract clauses:
    ${clauseTexts}
    
    Summary:
    `;

    // Call OpenAI API
    const response = await openai.createCompletion({
      model: "text-davinci-003", // or the latest recommended model
      prompt,
      max_tokens: 500,
      temperature: 0.4,
    });

    // Extract and return the summary
    const summary = response.data.choices[0].text?.trim() || 'Unable to generate summary.';
    
    // Extract key points
    const keyPoints = extractKeyPoints(summary);
    
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
    const clauseTexts = clauses.map(clause => {
      return `Clause: ${clause.text}
      Tags: ${clause.tags.join(', ')}
      Label: ${clause.label || 'unlabeled'}
      Explanation: ${clause.explanation || 'No explanation provided'}`;
    }).join('\n\n');

    const prompt = `
    Generate a comprehensive analysis of the following contract clauses.
    Include:
    1. Overall assessment of the contract
    2. Detailed analysis of key clauses (especially those labeled 'bad' or 'harsh')
    3. Potential negotiation points
    4. Recommendations for changes
    5. Comparison to industry standards where relevant
    
    Contract clauses:
    ${clauseTexts}
    
    Analysis:
    `;

    // Call OpenAI API
    const response = await openai.createCompletion({
      model: "text-davinci-003", // or the latest recommended model
      prompt,
      max_tokens: 1000,
      temperature: 0.4,
    });

    // Extract the analysis
    const analysis = response.data.choices[0].text?.trim() || 'Unable to generate analysis.';
    
    // Generate recommendations in a separate call for more focused output
    const recommendationsPrompt = `
    Based on the following contract clauses, provide specific recommendations for negotiation or modification.
    For each recommendation, explain the rationale and suggest alternative language where appropriate.
    
    Contract clauses:
    ${clauseTexts}
    
    Recommendations:
    `;
    
    const recommendationsResponse = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: recommendationsPrompt,
      max_tokens: 800,
      temperature: 0.4,
    });
    
    const recommendations = recommendationsResponse.data.choices[0].text?.trim() || 'Unable to generate recommendations.';
    
    // Calculate risk assessment
    const riskAssessment = calculateRiskAssessment(clauses);
    
    return {
      analysis,
      recommendations,
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
  // Count clauses by label
  const labelCounts = {
    good: clauses.filter(c => c.label === 'good').length,
    bad: clauses.filter(c => c.label === 'bad').length,
    harsh: clauses.filter(c => c.label === 'harsh').length,
    free: clauses.filter(c => c.label === 'free').length,
    unlabeled: clauses.filter(c => !c.label).length,
  };
  
  // Calculate total labeled clauses
  const totalLabeled = labelCounts.good + labelCounts.bad + labelCounts.harsh + labelCounts.free;
  
  // Calculate risk score
  const riskScore = totalLabeled > 0 
    ? Math.round((labelCounts.bad + labelCounts.harsh * 1.5) / totalLabeled * 100) 
    : 50; // Default score if no labels
  
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
    .filter(c => c.label === 'bad' || c.label === 'harsh')
    .forEach(c => c.tags.forEach((tag: string) => riskAreas.add(tag)));
  
  return {
    riskScore,
    riskLevel,
    riskAreas: Array.from(riskAreas),
    clauseBreakdown: labelCounts,
  };
}

export default {
  extractClauses,
  generateSimpleSummary,
  generateDeepAnalysis,
};