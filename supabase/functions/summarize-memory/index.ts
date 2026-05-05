import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface SummarizeMemoryRequest {
  campaignId: string;
  old_summary: string;
  new_events: unknown[];
}

interface SummarizeMemoryResponse {
  success: true;
  campaignId: string;
  summary: string;
}

interface ErrorResponse {
  success: false;
  error: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `
You are the Anti-Amnesia Engine for a persistent roleplaying campaign.

Follow this exact recursive memory protocol:
1) Extract and preserve key personality traits, motivations, relationships, unresolved goals, and stable world facts from old_summary.
2) Identify genuinely new information from new_events only (new facts, changed relationships, state transitions, new locations, new stakes, resolved/open threads).
3) Merge preserved memory + new information into one updated representation that is internally consistent and avoids contradictions.
4) Output must be clear, concise, and strictly no more than 20 sentences.

Formatting requirements:
- Use exactly these sections and labels:
  CORE CHARACTERS:
  WORLD STATE:
  OPEN LOOPS:
  RECENT SHIFTS:
- Keep details compact and non-redundant.
- Do not invent facts not present in the input.
- If old_summary and new_events conflict, prefer the newest credible event data.
- Final output must remain at or under 20 total sentences across all sections.
`.trim();

function extractSummaryFromChatCompletion(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const typedPayload = payload as { choices?: Array<{ message?: { content?: string } }> };
  return typedPayload.choices?.[0]?.message?.content?.trim() || null;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: SummarizeMemoryRequest = await req.json();
    const { campaignId, old_summary, new_events } = body;

    if (!campaignId || !old_summary || !Array.isArray(new_events)) {
      const err: ErrorResponse = {
        success: false,
        error: 'campaignId, old_summary, and new_events[] are required',
      };
      return new Response(JSON.stringify(err), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4.1-mini';
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify(
              {
                old_summary,
                new_events,
              },
              null,
              2,
            ),
          },
        ],
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      throw new Error(`OpenAI API error (${openAiResponse.status}): ${errorText}`);
    }

    const openAiPayload = await openAiResponse.json();
    const updatedSummary = extractSummaryFromChatCompletion(openAiPayload);
    if (!updatedSummary) {
      throw new Error('OpenAI did not return a summary');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ summary: updatedSummary })
      .eq('id', campaignId);

    if (updateError) throw updateError;

    const response: SummarizeMemoryResponse = {
      success: true,
      campaignId,
      summary: updatedSummary,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const error: ErrorResponse = {
      success: false,
      error: (err as Error).message,
    };
    return new Response(JSON.stringify(error), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
