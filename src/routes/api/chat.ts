import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";

import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `Você é a Luna, uma assistente pessoal inteligente que fala português do Brasil.
Você é direta, calorosa e resolutiva. Responda em frases curtas e naturais, porque suas respostas
podem ser lidas em voz alta.

Você pode: pesquisar e explicar assuntos, calcular, planejar, escrever textos, resumir e organizar tarefas.
Você NÃO consegue controlar o computador do usuário (abrir programas, mexer no mouse ou teclado).
Se pedirem isso, explique em uma frase e ofereça resolver a tarefa você mesma
(por exemplo: fazer a conta, buscar a informação, escrever o texto) ou entregar um link pronto para abrir.
Nunca invente dados, horários ou fatos.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return Response.json({ error: "A Luna ainda não está conectada à IA." }, { status: 500 });
        }

        const { messages } = (await request.json()) as { messages: UIMessage[] };

        const initialRunId = getLovableAiGatewayRunId(request);
        const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
        const lovable = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: {
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "vercel-ai-sdk",
          },
          fetch: runIdFetch.fetch,
        });

        try {
          const result = streamText({
            model: lovable.responses("openai/gpt-6-astra"),
            system: SYSTEM_PROMPT,
            messages: await convertToModelMessages(messages),
            stopWhen: stepCountIs(50),
            abortSignal: request.signal,
            tools: {
              calcular: tool({
                description:
                  "Resolve uma expressão matemática com precisão. Use sempre que houver contas.",
                inputSchema: z.object({
                  expressao: z
                    .string()
                    .describe("Expressão matemática, ex: (1200*0.15)+30 ou sqrt(144)"),
                }),
                execute: async ({ expressao }) => {
                  const safe = expressao.replace(/[^-+*/().,\d\s^a-z]/gi, "");
                  try {
                    const fn = new Function(
                      "Math",
                      `"use strict"; const {sqrt,pow,abs,round,floor,ceil,log,sin,cos,tan,PI,E}=Math; return (${safe.replace(/\^/g, "**")});`,
                    );
                    const valor = fn(Math);
                    if (typeof valor !== "number" || !isFinite(valor)) {
                      return { erro: "Não consegui calcular essa expressão." };
                    }
                    return { expressao, resultado: valor };
                  } catch {
                    return { erro: "Expressão inválida." };
                  }
                },
              }),
              abrir_link: tool({
                description:
                  "Prepara um link para o usuário abrir no navegador dele (site, busca, mapa, vídeo). Use quando pedirem para 'abrir' algo.",
                inputSchema: z.object({
                  titulo: z.string().describe("Nome curto do que será aberto"),
                  url: z.string().describe("URL completa, começando com https://"),
                }),
                execute: async ({ titulo, url }) => ({ titulo, url }),
              }),
            },
            providerOptions: {
              openai: {
                store: false,
                include: ["reasoning.encrypted_content"],
                forceReasoning: true,
                reasoningEffort: "low",
                reasoningSummary: "auto",
              },
            },
          });

          const response = result.toUIMessageStreamResponse({
            originalMessages: messages,
            headers: getLovableAiGatewayResponseHeaders(undefined, {
              ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
            }),
          });

          return withLovableAiGatewayRunIdHeader(response, runIdFetch);
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return new Response(null, { status: 499 });
          }
          const message = error instanceof Error ? error.message : "Falha ao falar com a IA.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
