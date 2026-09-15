import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Send,
  Square,
  Volume2,
  VolumeX,
  ExternalLink,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

import { detectWake, STATE_LABEL, type LunaState } from "@/lib/voice";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Luna — assistente de voz contínua em português" },
      {
        name: "description",
        content:
          'Diga "Luna" e fale: a assistente escuta, detecta o fim da sua frase, responde em voz alta e volta a aguardar sozinha.',
      },
      { property: "og:title", content: "Luna — assistente de voz contínua em português" },
      {
        property: "og:description",
        content: 'Diga "Luna" e converse sem clicar em nada: ela escuta, responde e volta a esperar.',
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

const SILENCIO_MS = 1500;
const SAUDACAO = "Oi! O que posso ajudar?";

function textOf(message: { parts?: Array<{ type: string; text?: string }> }) {
  return (message.parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join(" ")
    .replace(/[*_`#]/g, "")
    .trim();
}

function LunaPage() {
  const [input, setInput] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const [state, setState] = useState<LunaState>("off");
  const [supported, setSupported] = useState(false);
  const [heard, setHeard] = useState("");
  const [permError, setPermError] = useState<string | null>(null);

  const recRef = useRef<any>(null);
  const modeRef = useRef<"off" | "wake" | "command">("off");
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(texto: string) => void>(() => {});
  const startWakeRef = useRef<() => void>(() => {});

  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    setSupported(Boolean(SR) && "speechSynthesis" in window);
  }, []);

  /* ---------- controle do reconhecimento ---------- */

  const clearSilence = () => {
    if (silenceRef.current) {
      clearTimeout(silenceRef.current);
      silenceRef.current = null;
    }
  };

  const stopRecognition = useCallback(() => {
    clearSilence();
    modeRef.current = "off";
    const rec = recRef.current;
    if (rec) {
      try {
        rec.abort();
      } catch {
        /* noop */
      }
    }
  }, []);

  const startRecognition = useCallback((mode: "wake" | "command") => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;

    // sempre recria: evita estados presos entre sessões
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {
        /* noop */
      }
    }

    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    recRef.current = rec;
    modeRef.current = mode;
    setPermError(null);
    setState(mode === "wake" ? "wake" : "listening");
    setHeard("");

    rec.onresult = (event: any) => {
      let texto = "";
      for (let i = 0; i < event.results.length; i++) {
        texto += event.results[i][0].transcript + " ";
      }
      texto = texto.trim();

      if (modeRef.current === "wake") {
        const { hit, rest } = detectWake(texto);
        if (!hit) return;
        modeRef.current = "off";
        try {
          rec.abort();
        } catch {
          /* noop */
        }
        // Se o usuário já falou o pedido junto ("Luna, quanto é..."), aproveita.
        if (rest.split(" ").filter(Boolean).length >= 3) {
          setState("processing");
          sendRef.current(rest);
          return;
        }
        setState("activated");
        speak(SAUDACAO, () => startRecognition("command"));
        return;
      }

      if (modeRef.current === "command") {
        setHeard(texto);
        setState("listening");
        clearSilence();
        silenceRef.current = setTimeout(() => {
          const final = texto.trim();
          modeRef.current = "off";
          try {
            rec.abort();
          } catch {
            /* noop */
          }
          setHeard("");
          if (final.length > 1) {
            setState("processing");
            sendRef.current(final);
          } else {
            startWakeRef.current();
          }
        }, SILENCIO_MS);
      }
    };

    rec.onerror = (event: any) => {
      const err = event?.error;
      if (err === "not-allowed" || err === "service-not-allowed") {
        modeRef.current = "off";
        setVoiceMode(false);
        setState("error");
        setPermError(
          "O navegador bloqueou o microfone. Clique no cadeado da barra de endereço e permita o microfone para conversar por voz.",
        );
        return;
      }
      if (err === "audio-capture") {
        modeRef.current = "off";
        setVoiceMode(false);
        setState("error");
        setPermError("Nenhum microfone encontrado no dispositivo.");
      }
      // "no-speech" / "aborted": o onend cuida do reinício
    };

    rec.onend = () => {
      // reinicia a escuta enquanto o modo ainda estiver ativo (limite de tempo do navegador)
      if (modeRef.current === "wake") {
        setTimeout(() => {
          if (modeRef.current !== "wake") return;
          try {
            rec.start();
          } catch {
            startRecognition("wake");
          }
        }, 300);
      } else if (modeRef.current === "command") {
        setTimeout(() => {
          if (modeRef.current !== "command") return;
          try {
            rec.start();
          } catch {
            /* noop */
          }
        }, 200);
      }
    };

    try {
      rec.start();
    } catch {
      /* já iniciado */
    }
  }, []);

  const startWake = useCallback(() => {
    startRecognition("wake");
  }, [startRecognition]);
  startWakeRef.current = startWake;

  /* ---------- fala (TTS) — nunca escuta enquanto fala ---------- */

  function speak(texto: string, onEnd?: () => void) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onEnd?.();
      return;
    }
    // trava total do microfone durante a fala, evitando loop de áudio
    modeRef.current = "off";
    clearSilence();
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {
        /* noop */
      }
    }
    setState("speaking");

    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    fala.rate = 1.05;
    const finish = () => {
      // pequena folga para o áudio terminar de sair das caixas
      setTimeout(() => onEnd?.(), 400);
    };
    fala.onend = finish;
    fala.onerror = finish;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(fala);
  }

  /* ---------- envio ---------- */

  const enviar = useCallback(
    (texto: string) => {
      const limpo = texto.trim();
      if (!limpo) return;
      window.speechSynthesis?.cancel();
      sendMessage({ text: limpo });
      setInput("");
    },
    [sendMessage],
  );
  sendRef.current = enviar;

  /* ---------- resposta falada + volta ao modo de espera ---------- */

  useEffect(() => {
    if (busy) {
      if (voiceMode) setState("processing");
      return;
    }
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (spokenRef.current.has(last.id)) return;
    const texto = textOf(last as any);
    if (!texto) return;
    spokenRef.current.add(last.id);
    if (!voiceMode) return;
    speak(texto, () => startWakeRef.current());
  }, [messages, busy, voiceMode]);

  /* ---------- liga/desliga o modo de voz ---------- */

  const toggleVoiceMode = useCallback(async () => {
    if (voiceMode) {
      setVoiceMode(false);
      stopRecognition();
      window.speechSynthesis?.cancel();
      setState("off");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setState("error");
      setPermError(
        "Precisamos da sua permissão de microfone. Clique no cadeado da barra de endereço, permita o microfone e tente de novo.",
      );
      return;
    }
    setVoiceMode(true);
    startWake();
  }, [voiceMode, startWake, stopRecognition]);

  useEffect(() => {
    return () => {
      modeRef.current = "off";
      clearSilence();
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  const estadoAtual: LunaState = voiceMode ? state : busy ? "processing" : "off";
  const ativo = state === "listening" || state === "activated" || state === "speaking";

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-accent/20 blur-[140px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-44 pt-10">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-11 w-11 place-items-center rounded-full bg-primary/15 ring-1 ring-primary/40 ${
                ativo || busy ? "animate-pulse" : ""
              }`}
            >
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Luna</h1>
              <p className="text-xs text-muted-foreground">
                {busy && voiceMode ? STATE_LABEL.processing : STATE_LABEL[estadoAtual]}
              </p>
            </div>
          </div>
          {supported && (
            <button
              onClick={toggleVoiceMode}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition-colors ${
                voiceMode
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {voiceMode ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {voiceMode ? "Modo voz ativo" : "Ativar modo voz"}
            </button>
          )}
        </header>

        {/* painel de estado da voz */}
        <div className="mt-5 rounded-3xl border border-border bg-card/50 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <StateDot state={estadoAtual} />
            <span className="font-medium">{STATE_LABEL[estadoAtual]}</span>
            {voiceMode && estadoAtual === "wake" && (
              <span className="text-muted-foreground">— fale “Luna” para começar</span>
            )}
          </div>
          {voiceMode && heard && (
            <p className="mt-3 text-sm italic text-muted-foreground">“{heard}”</p>
          )}
          {!voiceMode && supported && !permError && (
            <p className="mt-2 text-xs text-muted-foreground">
              Ative o modo voz uma vez: depois é só dizer “Luna”, falar e ficar em silêncio — ela
              responde sozinha e volta a aguardar.
            </p>
          )}
          {!supported && (
            <p className="mt-2 text-xs text-muted-foreground">
              Este navegador não permite escuta contínua. Use o Chrome ou o Edge no computador para
              o modo voz; aqui você pode conversar por texto normalmente.
            </p>
          )}
          {permError && (
            <p className="mt-3 flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {permError}
            </p>
          )}
        </div>

        <section className="mt-6 flex-1 space-y-4">
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
              placeholder={
                voiceMode ? "Pode falar ou escrever para a Luna" : "Escreva para a Luna"
              }
              className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            {supported && (
              <button
                onClick={toggleVoiceMode}
                aria-label={voiceMode ? "Desligar modo voz" : "Ligar modo voz"}
                className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${
                  voiceMode
                    ? "animate-pulse bg-primary/20 text-primary ring-1 ring-primary/50"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {voiceMode ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
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

function StateDot({ state }: { state: LunaState }) {
  const cor =
    state === "error"
      ? "bg-destructive"
      : state === "speaking"
        ? "bg-accent"
        : state === "listening" || state === "activated"
          ? "bg-primary"
          : state === "processing"
            ? "bg-accent"
            : state === "wake"
              ? "bg-primary/60"
              : "bg-muted-foreground/50";
  const pulse = state !== "off" && state !== "error" ? "animate-pulse" : "";
  return <span className={`h-2.5 w-2.5 rounded-full ${cor} ${pulse}`} />;
}
