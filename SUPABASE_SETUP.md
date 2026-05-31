# Supabase setup for FellowshipHub

1. Create a Supabase project.
2. Open the Supabase SQL Editor and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env`.
4. Fill in:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_AI_SUMMARY_ENDPOINT=https://your-project-ref.functions.supabase.co/summarize-session
```

5. Restart Expo after editing `.env`.

The app will keep working with local demo storage when these values are missing. Once they are set, member profiles, emails, sessions, attendance, feedback, AI chat messages, and saved session summaries sync to Supabase.

## Real AI session summaries

The app does not store an AI API key in the frontend. Instead, it calls a backend endpoint through:

```bash
EXPO_PUBLIC_AI_SUMMARY_ENDPOINT=https://your-project-ref.functions.supabase.co/summarize-session
```

This repo includes a Supabase Edge Function at `supabase/functions/summarize-session/index.ts`.

To deploy it with Groq:

```bash
supabase functions deploy summarize-session
supabase secrets set GROQ_API_KEY=your-groq-api-key
```

Optional:

```bash
supabase secrets set GROQ_SUMMARY_MODEL=llama-3.3-70b-versatile
```

The function also still supports OpenAI as a fallback if you set `OPENAI_API_KEY` and `OPENAI_SUMMARY_MODEL`.

After deploying, restart Expo so the app can read the endpoint. If the endpoint is blank or unavailable, FellowshipHub falls back to the local summary builder.

## Password reset emails

In Supabase, open **Authentication > URL Configuration** and add your app URL to **Redirect URLs**.

For local web testing, add:

```text
http://localhost:8081/reset-password
http://localhost:8082/reset-password
http://localhost:8083/reset-password
```

Use whichever Expo web port you start the app on. In production, add your deployed site URL ending in `/reset-password`.
