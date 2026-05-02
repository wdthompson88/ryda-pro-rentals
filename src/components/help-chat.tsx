"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { searchHelp, extractAnswer, type SearchResult } from "@/lib/help-content";

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "bot";
      text: string;
      answer?: { source: SearchResult; otherResults: SearchResult[] };
      escalation?: "prompt" | "submitted";
      submittedEmail?: string;
    };

const SUGGESTIONS = [
  "How do I claim a co-ownership share?",
  "Can I take it on a road trip?",
  "What's covered by insurance?",
  "What if I total the car?",
  "Can I gift my share to my kids?",
];

const GREETING: ChatMessage = {
  id: "greeting",
  role: "bot",
  text: "Hi, I'm RYDA's help assistant. Ask me anything about membership, shares, bookings, insurance, maintenance, or how the platform works. I'll do my best to answer directly and point you to the full article. Need a real human? Just say so.",
};

const INTROS = ["Here's the gist:", "Quick answer:", "Short version:", "From the help docs:"];
function pickIntro(seed: number) {
  return INTROS[seed % INTROS.length];
}

// Detect "talk to a human" intents. Cast a wide net; false positives just
// prompt the user with the escalation form which they can ignore.
const HUMAN_HELP_PATTERNS = [
  /\b(?:speak|talk|chat)\s+(?:to|with)\s+(?:a\s+)?(?:human|person|agent|someone|representative|rep|specialist)\b/i,
  /\b(?:human|real\s+person|live\s+person|real\s+human)\s+(?:help|support|please)?\b/i,
  /\b(?:get|connect|reach)\s+(?:me\s+)?(?:to\s+)?(?:a\s+)?(?:human|person|agent|someone|specialist)\b/i,
  /\b(?:customer\s+service|customer\s+support)\b/i,
  /\bsupport\s+(?:agent|rep|representative|team)\b/i,
  /\b(?:can|could|will|would)\s+(?:i|someone|you)\s+(?:call|email)\s+(?:me|us)\b/i,
  /\b(?:i\s+)?(?:want|need|would\s+like)\s+to\s+(?:speak|talk|chat)\b/i,
  /\bcall\s+me\b/i,
  /\bemail\s+me\b/i,
  /\bnot\s+(?:helpful|helping)\b/i,
  /\bthis\s+isn(?:'|')?t\s+working\b/i,
];

function isAskingForHuman(text: string): boolean {
  return HUMAN_HELP_PATTERNS.some((p) => p.test(text));
}

export function HelpChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const turnCount = useRef(0);
  const lastTriggerMessage = useRef<string>("");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Open: focus the input. Close: return focus to the launcher button.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      // Use a microtask so the launcher is mounted again before we focus it.
      Promise.resolve().then(() => launcherRef.current?.focus());
    }
  }, [open]);

  // Escape closes the panel when it is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleAsk(question: string) {
    const q = question.trim();
    if (!q) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: q,
    };

    let botMsg: ChatMessage;

    if (isAskingForHuman(q)) {
      lastTriggerMessage.current = q;
      botMsg = {
        id: `b-${Date.now()}`,
        role: "bot",
        text: "Of course. Drop your email and a short note about what you're looking for, and someone from RYDA will reach out within one business day.",
        escalation: "prompt",
      };
    } else {
      const results = searchHelp(q, 4);
      if (results.length === 0) {
        botMsg = {
          id: `b-${Date.now()}`,
          role: "bot",
          text: "I couldn't find a good answer for that. Want me to put you in touch with a real human at RYDA? Just type 'talk to a human' and I'll grab your email so we can follow up.",
        };
      } else {
        const top = results[0];
        const others = results.slice(1, 3);
        const intro = pickIntro(turnCount.current);
        const answerText = extractAnswer(top.article);
        botMsg = {
          id: `b-${Date.now()}`,
          role: "bot",
          text: `${intro}\n\n${answerText}`,
          answer: { source: top, otherResults: others },
        };
      }
    }

    turnCount.current += 1;
    setMessages((m) => [...m, userMsg, botMsg]);
    setInput("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleAsk(input);
  }

  async function handleEscalate(payload: { email: string; note: string }) {
    const conversation = messages
      .map((m) =>
        m.role === "user"
          ? { role: "user" as const, text: m.text }
          : { role: "bot" as const, text: m.text },
      );

    try {
      const res = await fetch("/api/help-escalation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          note: payload.note,
          trigger_message: lastTriggerMessage.current,
          conversation,
        }),
      });
      if (!res.ok) {
        // Surface 429 specifically; other errors fall through to the
        // generic catch.
        if (res.status === 429) {
          throw new Error("Too many requests. Try again in a minute.");
        }
        throw new Error();
      }
      // Replace the prompt bubble with a confirmation
      setMessages((all) =>
        all.map((m) =>
          m.role === "bot" && m.escalation === "prompt"
            ? {
                ...m,
                escalation: "submitted",
                submittedEmail: payload.email,
                text: `Got it, we'll email ${payload.email} within one business day. Anything else I can help with in the meantime?`,
              }
            : m,
        ),
      );
    } catch (err) {
      // Surface 429 message specifically so the user knows to slow down
      // rather than thinking the form is broken.
      const text =
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong sending that. Email hello@ryda.com directly and we'll pick it up from there.";
      setMessages((all) => [
        ...all,
        {
          id: `b-err-${Date.now()}`,
          role: "bot",
          text,
        },
      ]);
    }
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help chat" : "Open help chat"}
        aria-expanded={open}
        aria-controls="ryda-help-chat-panel"
        className={`fixed bottom-6 right-6 z-40 flex h-14 items-center gap-2 rounded-full px-5 text-sm font-medium shadow-lg transition-all ${
          open
            ? "bg-cream text-ink hover:bg-cream/90"
            : "bg-red text-cream hover:bg-red-deep"
        }`}
      >
        <span className="text-base leading-none">{open ? "×" : "✦"}</span>
        <span>{open ? "Close" : "Ask RYDA"}</span>
      </button>

      {/* Panel, non-modal: doesn't trap focus or block the page */}
      {open && (
        <section
          id="ryda-help-chat-panel"
          aria-labelledby="ryda-help-chat-title"
          className="fixed bottom-24 right-6 z-40 flex w-[min(420px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-rule bg-surface shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-rule bg-ink px-5 py-4 text-cream">
            <div>
              <p id="ryda-help-chat-title" className="font-display text-base">
                Ask RYDA
              </p>
              <p className="text-[11px] uppercase tracking-wider text-cream/50">
                Answers from 61 help articles · Real human on request
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close help chat"
              className="ml-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-cream/70 hover:bg-cream/10 hover:text-cream"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex max-h-[480px] flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((m) =>
              m.role === "user" ? (
                <UserBubble key={m.id} text={m.text} />
              ) : (
                <BotBubble
                  key={m.id}
                  text={m.text}
                  answer={m.answer}
                  escalation={m.escalation}
                  onEscalate={handleEscalate}
                />
              ),
            )}

            {/* Suggested prompts (only shown initially) */}
            {messages.length === 1 && (
              <div className="mt-2 flex flex-col gap-2">
                <p className="px-1 text-[11px] uppercase tracking-wider text-mute">
                  Try asking
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAsk(s)}
                    className="rounded-full border border-rule bg-cream-2/40 px-4 py-2 text-left text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 border-t border-rule bg-cream-2/40 px-3 py-3"
          >
            <label htmlFor="ryda-help-chat-input" className="sr-only">
              Ask RYDA a question
            </label>
            <input
              id="ryda-help-chat-input"
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="h-10 flex-1 rounded-full border border-rule bg-surface px-4 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="h-10 rounded-full bg-red px-4 text-xs font-medium text-cream transition-colors hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ask
            </button>
          </form>

          {/* Footnote */}
          <p className="border-t border-rule bg-surface px-4 py-2 text-center text-[10px] text-mute">
            Answers compiled from help articles. Need a real human?{" "}
            <Link href="/contact" className="text-red hover:text-red-deep">
              Contact us
            </Link>
          </p>
        </section>
      )}
    </>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-cream">
        {text}
      </div>
    </div>
  );
}

function BotBubble({
  text,
  answer,
  escalation,
  onEscalate,
}: {
  text: string;
  answer?: { source: SearchResult; otherResults: SearchResult[] };
  escalation?: "prompt" | "submitted";
  onEscalate: (payload: { email: string; note: string }) => Promise<void>;
}) {
  const paragraphs = text.split("\n\n").filter((p) => p.trim().length > 0);

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] space-y-2">
        {/* Main answer bubble */}
        <div className="rounded-2xl rounded-bl-md border border-rule bg-cream-2/40 px-4 py-3 text-sm leading-relaxed text-ink">
          {paragraphs.map((p, i) => (
            <p key={i} className={i > 0 ? "mt-2" : ""}>
              {p}
            </p>
          ))}
          {answer && (
            <Link
              href={`/help/${answer.source.category.slug}/${answer.source.article.slug}`}
              className="mt-3 inline-flex items-center gap-1 rounded-full border border-rule bg-surface px-3 py-1.5 text-[11px] font-medium text-red transition-colors hover:border-red"
            >
              <span className="text-mute">Source:</span>
              <span>{answer.source.article.q}</span>
              <span>→</span>
            </Link>
          )}
        </div>

        {/* Escalation form */}
        {escalation === "prompt" && <EscalationForm onSubmit={onEscalate} />}

        {/* Related articles below the answer */}
        {answer && answer.otherResults.length > 0 && (
          <div>
            <p className="px-1 text-[10px] uppercase tracking-wider text-mute">
              Related
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {answer.otherResults.map((r) => (
                <li key={`${r.category.slug}/${r.article.slug}`}>
                  <Link
                    href={`/help/${r.category.slug}/${r.article.slug}`}
                    className="block rounded-xl border border-rule bg-surface px-3 py-2 text-xs text-ink-soft transition-colors hover:border-red hover:text-ink"
                  >
                    <span className="text-red">→</span> {r.article.q}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function EscalationForm({
  onSubmit,
}: {
  onSubmit: (payload: { email: string; note: string }) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ email: email.trim(), note: note.trim() });
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      // Always reset the spinner, handleEscalate (the parent onSubmit)
      // catches its own errors and pushes a bot message instead of
      // re-throwing, so without `finally` a 429/500 leaves the submit
      // button stuck on "Sending…" indefinitely. The form unmounts on
      // success path, so this is a no-op there.
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-2xl border border-rule bg-surface p-3"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        autoComplete="email"
        className="h-9 w-full rounded-lg border border-rule bg-cream-2/40 px-3 text-xs text-ink placeholder:text-mute focus:border-red focus:outline-none"
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What's on your mind? (optional)"
        rows={3}
        className="w-full rounded-lg border border-rule bg-cream-2/40 px-3 py-2 text-xs text-ink placeholder:text-mute focus:border-red focus:outline-none"
      />
      <button
        type="submit"
        disabled={submitting}
        className="h-9 w-full rounded-full bg-red text-xs font-medium text-cream hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send to RYDA team"}
      </button>
      {error && <p className="text-[11px] text-red">{error}</p>}
    </form>
  );
}
