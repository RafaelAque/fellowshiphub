type SummaryType = 'brief' | 'detailed' | 'scripture' | 'action';

type SummaryRequest = {
  transcript?: string;
  type?: SummaryType;
  scriptures?: string[];
  sessionTitle?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function getStyleInstruction(type: SummaryType) {
  return [
    'Create one clear, member-friendly, encouraging explanation of the discussion.',
    'The transcript may come from speech-to-text, so fix obvious grammar and do not copy confusing phrases word-for-word.',
    'Find the true main point by asking what the speaker wanted the listeners to understand, not by counting repeated words.',
    'Use exactly these headings: Discussion Summary, Main Topic, Explanation, Encouragement, Moral Lesson, How to Apply It.',
    'Under Discussion Summary, write a short paragraph that gently introduces what the session was about.',
    'Under Main Topic, write one complete sentence, not keywords.',
    'Under Explanation, write 5 to 7 warm, simple sentences that explain the message in a way a member can understand and feel guided by.',
    'Under Encouragement, write 2 to 3 caring sentences that help the listener feel supported, hopeful, and invited to grow.',
    'The Moral Lesson must clearly state what the listener should learn from the discussion in one strong but compassionate sentence.',
    'Under How to Apply It, give 4 practical bullet points that feel realistic for everyday life.',
    type === 'scripture'
      ? 'If scripture references are provided, include a short Bible Reference Mentioned section at the end.'
      : 'If scripture references are provided, mention them only when they help explain the main topic.',
  ].join(' ');
}

function extractOutputText(data: Record<string, unknown>) {
  if (typeof data.output_text === 'string') {
    return data.output_text.trim();
  }

  const output = Array.isArray(data.output) ? data.output : [];
  return output
    .flatMap((item) => {
      if (!item || typeof item !== 'object' || !('content' in item)) {
        return [];
      }

      const content = Array.isArray(item.content) ? item.content : [];
      return content.map((part) => {
        if (!part || typeof part !== 'object') {
          return '';
        }

        if ('text' in part && typeof part.text === 'string') {
          return part.text;
        }

        return '';
      });
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

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

function buildSystemPrompt(summaryType: SummaryType) {
  return [
    'You summarize fellowship, Bible study, and church session transcripts.',
    'Use plain, warm, understandable language for regular members, like a caring mentor explaining the message after the session.',
    'Your job is to explain the discussion, the main lesson, and the moral meaning clearly.',
    'Make the explanation embracing and spiritually encouraging without sounding dramatic or fake.',
    'When the transcript is short, still explain the likely message carefully, but be honest about what was actually said.',
    'Do not invent Bible verses. Only list scripture references that are in the transcript or provided by the app.',
    'Do not include random keyword lists.',
    'Do not say "the moral lesson is to understand the message" unless the transcript truly has no clear topic.',
    getStyleInstruction(summaryType),
  ].join(' ');
}

function buildUserPrompt(body: SummaryRequest, transcript: string, summaryType: SummaryType) {
  return [
    `Session: ${body.sessionTitle ?? 'Fellowship session'}`,
    `Summary type: ${summaryType}`,
    `Detected scriptures: ${(body.scriptures ?? []).join(', ') || 'None detected'}`,
    '',
    'Transcript:',
    transcript,
  ].join('\n');
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
  const openAiApiKey = Deno.env.get('OPENAI_API_KEY');

  if (!groqApiKey && !openAiApiKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY or OPENAI_API_KEY is not configured.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json() as SummaryRequest;
  const transcript = body.transcript?.replace(/\s+/g, ' ').trim() ?? '';
  const summaryType = body.type ?? 'brief';

  if (!transcript) {
    return new Response(JSON.stringify({ error: 'Transcript is required.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const systemPrompt = buildSystemPrompt(summaryType);
  const userPrompt = buildUserPrompt(body, transcript, summaryType);

  if (groqApiKey) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('GROQ_SUMMARY_MODEL') ?? 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.35,
        max_completion_tokens: 1200,
      }),
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Groq summary request failed.', details: data }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ summary: extractChatCompletionText(data), provider: 'groq' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_SUMMARY_MODEL') ?? 'gpt-4o-mini',
      instructions: systemPrompt,
      input: userPrompt,
      max_output_tokens: 1200,
    }),
  });

  const data = await response.json() as Record<string, unknown>;

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'OpenAI summary request failed.', details: data }), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ summary: extractOutputText(data), provider: 'openai' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
