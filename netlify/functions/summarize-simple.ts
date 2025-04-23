import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import OpenAI from 'openai';

// Initialize OpenAI client v4+
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { text } = JSON.parse(event.body || '{}');

        if (!text) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Text content is required' }) };
        }

        // Call OpenAI API for simple summarization
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Use a suitable model
            messages: [
                { role: "system", content: "You are a helpful assistant that summarizes legal text concisely." },
                { role: "user", content: `Provide a brief, simple summary (1-2 sentences) of the following contract text: ${text.substring(0, 4000)}` } // Truncate for context window
            ],
            max_tokens: 150,
            temperature: 0.5,
        });

        const summary = completion.choices[0]?.message?.content?.trim() || "Could not generate summary.";

        return {
            statusCode: 200,
            body: JSON.stringify({ summary }),
        };

    } catch (error) {
        console.error("Function Error: summarize-simple:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to generate simple summary", details: message }),
        };
    }
};

export { handler };