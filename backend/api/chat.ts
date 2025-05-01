import { streamText } from 'ai';
import { createPerplexity } from '@ai-sdk/perplexity';
import type { Message } from 'ai';
import { EMAILS } from '../emails.js';

export const runtime = 'edge';

const perplexity = createPerplexity({
    apiKey: process.env.PERPLEXITY_API_KEY!, 
  });

export async function POST(req: Request) {
    try {
        const { messages }: { messages: Message[] } = await req.json();
        const userMessage = messages[messages.length - 1]?.content;

        if (!userMessage) throw new Error('No message from user');

        console.log('User message:', userMessage);

        const emailSummaries = EMAILS.map((email, i) => {
            return `Email ${i + 1}:
          From: ${email.sender}
          Subject: ${email.subject}
          Body: ${email.body}`;
        }).join('\n\n');

        const prompt = `
          You are an email assistant.
          
          You will receive a list of emails.
          Your job is to answer the user's question based on the content of these emails.
          
          Here are the emails:
          
          ${emailSummaries}
          
          User question: ${userMessage}
          
          Assistant:
          `.trim();

        const response = streamText({
            model: perplexity("sonar"),
            prompt: prompt,
        });

        return response.toDataStreamResponse();
    } catch (err) {
        console.error('Error in /api/chat:', err);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
