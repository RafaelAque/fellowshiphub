type BibleAssistantRequest = {
  question?: string;
  memberName?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function extractChatCompletionText(data: Record<string, unknown>) {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const firstChoice = choices[0];

  if (!firstChoice || typeof firstChoice !== 'object' || !('message' in firstChoice)) {
    return '';
  }

  const message = firstChoice.message;

  if (!message || typeof message !== 'object' || !('content' in message)) {
    return '';
  }

  return typeof message.content === 'string' ? message.content.trim() : '';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const groqApiKey = Deno.env.get('GROQ_API_KEY');

  if (!groqApiKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY is not configured.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json() as BibleAssistantRequest;
  const question = body.question?.replace(/\s+/g, ' ').trim() ?? '';

  if (!question) {
    return new Response(JSON.stringify({ error: 'Question is required.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('GROQ_BIBLE_ASSISTANT_MODEL') ?? Deno.env.get('GROQ_SUMMARY_MODEL') ?? 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: [
            'You are a warm Bible assistant for FellowshipHub members.',
            'Give caring, practical Christian advice with relevant Bible verses.',
            'Do not claim to be a pastor, therapist, doctor, or authority over the user.',
            'The Bible Verse section must show the verse reference plus the actual verse words, not only "reminds us" or a paraphrase.',
            'Use public-domain KJV wording for verse text. Format it like: Psalm 34:18 (KJV): "The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit."',
            'Include 1 or 2 comforting verses. If a verse is long, include the most comforting excerpt and label it as an excerpt.',
            'Do not invent Bible wording or mix translations. If you are not sure of the exact wording, choose a verse you know confidently or explain that you can only provide the reference.',
            'If the question is serious, harmful, abusive, medical, legal, or emergency-related, gently encourage the user to speak with a trusted leader or professional.',
            'Use exactly these headings: Gentle Answer, Bible Verse, What It Means, Practical Step, Prayer.',
            'Make the tone gentle, comforting, hopeful, and easy to understand. Use soft words that help the member feel seen, not judged.',
            'Keep each section short, but make the Gentle Answer and Prayer warm, personal, and reassuring.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            `Member: ${body.memberName ?? 'FellowshipHub member'}`,
            'Question:',
            question,
          ].join('\n'),
        },
      ],
      temperature: 0.45,
      max_completion_tokens: 900,
    }),
  });

  const data = await response.json() as Record<string, unknown>;

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'Groq Bible assistant request failed.', details: data }), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ answer: extractChatCompletionText(data), provider: 'groq' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
