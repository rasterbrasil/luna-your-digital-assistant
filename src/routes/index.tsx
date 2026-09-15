import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, Square, Volume2, VolumeX, ExternalLink, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Luna — sua assistente pessoal com voz" },
      {
        name: "description",
        content:
          "Luna é uma assistente de IA em português: fale ou escreva e ela pesquisa, calcula, escreve e organiza tarefas para você.",
      },
      { property: "og:title", content: "Luna — sua assistente pessoal com voz" },
      {
        property: "og:description",
        content: "Fale com a Luna e ela pesquisa, calcula, escreve e organiza tarefas para você.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LunaPage,
});

const SUGESTOES = [
  "Luna, quanto é 15% de 4.780 reais?",
  "Luna, resuma o que é energia solar em 3 frases",
  "Luna, monte um plano de estudos de 7 dias",
  "Luna, abra uma pesquisa sobre notebooks bons e baratos",
];

function textOf(message: { parts?: Array<{ type: string; text?: string }> }) {
  return (message.parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join(" ")
    .trim();
}

function LunaPage() {
  const [input, setInput] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  // Reconhecimento de voz
  useEffect(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setMicSupported(true);
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event: any) => {
      let texto = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        texto += event.results[i][0].transcript;
      }
      setInput(texto);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  // Fala das respostas
  useEffect(() => {
    if (!voiceOn || busy) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const texto = textOf(last as any);
    if (!texto || spokenRef.current.has(last.id)) return;
    spokenRef.current.add(last.id);
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    fala.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(fala);
  }, [messages, busy, voiceOn]);

  const toggleMic = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
      return;
    }
    window.speechSynthesis?.cancel();
    setInput("");
    setListening(true);
    rec.start();
  };

  const enviar = (texto: string) => {
    const limpo = texto.trim();
    if (!limpo || busy) return;
    window.speechSynthesis?.cancel();
    sendMessage({ text: limpo });
    setInput("");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-accent/20 blur-[140px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-40 pt-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-11 w-11 place-items-center rounded-full bg-primary/15 ring-1 ring-primary/40 ${busy || listening ? "animate-pulse" : ""}`}
            >
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Luna</h1>
              <p className="text-xs text-muted-foreground">
                {listening
                  ? "Ouvindo você..."
                  : busy
                    ? "Pensando..."
                    : "Sua assistente pessoal por voz"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setVoiceOn((v) => !v);
              window.speechSynthesis?.cancel();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {voiceOn ? "Voz ligada" : "Voz desligada"}
          </button>
        </header>

        <section className="mt-8 flex-1 space-y-4">
          {messages.length === 0 && (
            <div className="rounded-3xl border border-border bg-card/50 p-6 backdrop-blur">
              <h2 className="text-xl font-semibold">Oi! Sou a Luna 👋</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Fale ou escreva o que você precisa. Eu pesquiso, calculo, escrevo e organizo as
                coisas com você. Ainda não consigo mexer nos programas do seu computador, mas posso
                resolver a tarefa e deixar o link pronto para abrir.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="rounded-2xl border border-border bg-background/40 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] space-y-2 rounded-3xl px-5 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card/70 backdrop-blur"
                }`}
              >
                {m.parts.map((part: any, i: number) => {
                  if (part.type === "text") {
                    return (
                      <p key={i} className="whitespace-pre-wrap">
                        {part.text}
                      </p>
                    );
                  }
                  if (part.type === "tool-abrir_link" && part.output?.url) {
                    return (
                      <a
                        key={i}
                        href={part.output.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir {part.output.titulo}
                      </a>
                    );
                  }
                  if (part.type === "tool-calcular" && part.output?.resultado !== undefined) {
                    return (
                      <p key={i} className="font-mono text-xs text-muted-foreground">
                        {part.output.expressao} = {part.output.resultado}
                      </p>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}

          {error && (
            <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Não consegui responder agora. Tente de novo em instantes.
            </p>
          )}
          <div ref={bottomRef} />
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-background via-background to-transparent pb-6 pt-10">
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 px-4">
          <div className="flex flex-1 items-end gap-2 rounded-3xl border border-border bg-card/80 p-2 backdrop-blur">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar(input);
                }
              }}
              rows={1}
              placeholder={listening ? "Pode falar..." : "Fale ou escreva para a Luna"}
              className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            {micSupported && (
              <button
                onClick={toggleMic}
                aria-label={listening ? "Parar de ouvir" : "Falar com a Luna"}
                className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${
                  listening
                    ? "animate-pulse bg-destructive text-destructive-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={() => (busy ? stop() : enviar(input))}
              aria-label={busy ? "Parar" : "Enviar"}
              className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
            >
              {busy ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
