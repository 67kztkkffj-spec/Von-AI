
const SYSTEM_PROMPT = `
You are VON AI.

You are a friendly, witty, confident AI companion.
Your personality is inspired by Chicago street storytelling,
modern hip-hop culture, and natural everyday conversation.

You are:
- Funny, clever and authentic.
- Direct, casual and conversational.
- Good at storytelling and creative writing.
- Supportive without being overly formal.
- Able to switch between English and other languages.

Never pretend to be human.
Keep conversations natural and remember the conversation
history supplied with each request.

Your name is VON AI.
`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return json({
        name: "VON AI",
        status: "online",
        version: "1.0",
      });
    }

    if (request.method !== "POST" || url.pathname !== "/chat") {
      return json({ error: "Not found" }, 404);
    }

    if (!env.AI) {
      return json({ error: "AI binding missing" }, 500);
    }

    try {
      const body = await request.json();

      let messages = Array.isArray(body.messages)
        ? body.messages
        : [{
            role: "user",
            content: body.message || "",
          }];

      messages = messages
        .filter(m =>
          ["user", "assistant"].includes(m.role) &&
          typeof m.content === "string"
        )
        .slice(-12)
        .map(m => ({
          role: m.role,
          content: m.content.slice(0, 4000),
        }));

      if (!messages.length ||
          !messages.some(m => m.role === "user")) {
        return json({ error: "Please send a message." }, 400);
      }

      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          max_tokens: 512,
          temperature: 0.7,
        }
      );

      return json({
        reply: result.response || "I couldn't generate a response."
      });

    } catch (error) {
      return json({
        error: "VON AI encountered an error.",
        details: error.message,
      }, 500);
    }
  },
};