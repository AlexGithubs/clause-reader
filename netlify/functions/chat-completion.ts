import { Handler } from '@netlify/functions';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to strip markdown code blocks from JSON
function stripMarkdown(text: string): string {
  // Check if response is wrapped in markdown code blocks
  if (text.startsWith('```')) {
    // Extract content between markdown code blocks
    const match = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return text;
}

interface ChatCompletionRequest {
  fileId: string;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  clauses: {
    id: string;
    text: string;
    tags: string[];
    label?: string;
    explanation?: string;
  }[];
  fullText?: string;
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
    const { fileId, messages, clauses, fullText } = JSON.parse(event.body || '{}') as ChatCompletionRequest;

    if (!fileId || !messages) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // Prepare context from clauses and full text
    const contractContext = clauses.map(clause => {
      return `Clause (${clause.tags.join(', ')}${clause.label ? `, labeled ${clause.label}` : ''}): ${clause.text}`;
    }).join('\n\n');

    // Create system message with contract context
    const systemMessage = {
      role: 'system', 
      content: `You are an AI assistant that answers questions about a specific contract.
You have access to the full text and extracted clauses of the contract.

FULL CONTRACT TEXT:
${fullText || ""}

EXTRACTED CLAUSES:
${contractContext}

Your task is to:
1. Answer questions about this specific contract based on the information provided
2. Directly quote relevant parts of the contract when answering
3. If you don't know the answer or can't find relevant information in the contract, say so
4. Be precise and helpful, focusing only on what's actually in the contract
5. If asked about a specific section (like Equal Employment Opportunity), find and analyze that section

This contract appears to be a consulting agreement with various sections including Equal Employment Opportunity provisions.`
    } as OpenAI.Chat.Completions.ChatCompletionSystemMessageParam;

    // Combine system message with user messages
    const combinedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      systemMessage,
      ...messages
    ];

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: combinedMessages,
      stream: false,
      temperature: 0.2, // Lower temperature for more factual responses
      max_tokens: 800
    });

    // Get the response content and strip any markdown formatting if present
    const content = response.choices[0].message.content || '';
    const cleanedContent = stripMarkdown(content);

    // Return the assistant's message
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: cleanedContent
      }),
    };
  } catch (error) {
    console.error('Chat completion error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate chat response' }),
    };
  }
};