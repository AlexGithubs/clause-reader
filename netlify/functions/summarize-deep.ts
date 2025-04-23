import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import OpenAI from 'openai';

// Initialize OpenAI client v4+
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Placeholder function to simulate calculating risk based on clause labels
function calculateRisk(clauses: any[]) {
    const breakdown = { good: 0, bad: 0, harsh: 0, free: 0, unlabeled: 0 };
    let riskScore = 0;
    const riskAreas = new Set<string>();

    clauses.forEach(clause => {
        switch (clause.label) {
            case 'good':
                breakdown.good++;
                riskScore += 5;
                break;
            case 'bad':
                breakdown.bad++;
                riskScore -= 10;
                clause.tags.forEach(tag => riskAreas.add(tag));
                break;
            case 'harsh':
                breakdown.harsh++;
                riskScore -= 15;
                clause.tags.forEach(tag => riskAreas.add(tag));
                break;
            case 'free':
                breakdown.free++;
                riskScore += 10; // Assume neutral/slightly positive
                break;
            default:
                breakdown.unlabeled++;
                // Neutral score for unlabeled
                break;
        }
    });

    // Normalize score (simple example, adjust logic as needed)
    riskScore = Math.max(0, Math.min(100, 50 + riskScore)); 

    let riskLevel = 'Low';
    if (riskScore >= 75) riskLevel = 'High';
    else if (riskScore >= 50) riskLevel = 'Moderate';

    return {
        riskScore,
        riskLevel,
        riskAreas: Array.from(riskAreas),
        clauseBreakdown: breakdown,
    };
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { fileId, clauses } = JSON.parse(event.body || '{}');

        if (!fileId || !Array.isArray(clauses)) {
            return { statusCode: 400, body: JSON.stringify({ error: 'File ID and clauses array are required' }) };
        }

        // In a real app, retrieve full text associated with fileId if needed
        const clauseTextForPrompt = clauses.map((c: any) => `Clause ID ${c.id}: ${c.text}`).join("\n\n");

        // Call OpenAI API for deep analysis and recommendations
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Use a more capable model for deep analysis
            messages: [
                { role: "system", content: "You are an expert legal analyst. Analyze the provided contract clauses. Provide a comprehensive analysis covering potential issues, standard practices, and risks. Also, suggest specific recommendations for negotiation or changes. Structure the response clearly." },
                { role: "user", content: `Analyze these clauses:\n\n${clauseTextForPrompt.substring(0, 8000)}\n\nProvide:
1. Comprehensive Analysis (paragraph)
2. Recommendations (bullet points or numbered list)` }
            ],
            max_tokens: 1000,
            temperature: 0.3,
        });

        const analysisResult = completion.choices[0]?.message?.content?.trim() || "Could not generate analysis.";
        // Simple split - might need more robust parsing in production
        const analysisParts = analysisResult.split("Recommendations:");
        const analysisText = analysisParts[0]?.replace("Comprehensive Analysis:", "").trim();
        const recommendationsText = analysisParts[1]?.trim();

        // Calculate risk assessment based on clause labels (provided in the request)
        const riskAssessment = calculateRisk(clauses);

        return {
            statusCode: 200,
            body: JSON.stringify({
                fileId,
                analysis: analysisText || "Analysis not generated.",
                recommendations: recommendationsText || "Recommendations not generated.",
                riskAssessment,
                detailedClauses: clauses // Return the input clauses which include labels/tags
            }),
        };

    } catch (error) {
        console.error("Function Error: summarize-deep:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to generate deep summary", details: message }),
        };
    }
};

export { handler };