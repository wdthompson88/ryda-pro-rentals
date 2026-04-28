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
    };

const SUGGESTIONS = [
  "How do I buy a share?",
  "Can I take it on a road trip?",
  "What's covered by insurance?",
  "What if I total the car?",
  "Can I gift my share to my kids?",
];

const GREETING: ChatMessage = {
  id: "greeting",
  role: "bot",
  text: "Hi — I'm RYDA's help assistant. Ask me anything about membership, shares, bookings, insurance, maintenance, or how the platform works. I'll do my best to answer directly and point you to the full article.",
};

// Pick a low-effort intro that fits any question. We rotate so consecutive
// answers don't feel templated.
const INTROS = ["Here's the gist:", "Quick answer:", "Short version:", "From the help docs:"];
function pickIntro(seed: number) {
  return INTROS[seed % INTROS.length];
}

export function HelpChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const turnCount = useRef(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  function handleAsk(question: string) {
    const q = question.trim();
    if (!q) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: q,
    };

    const results = searchHelp(q, 4);

    let botMsg: ChatMessage;
    if (results.length === 0) {
      botMsg = {
        id: `b-${Date.now()}`,
        role: "bot",
        text: "I couldn't find a good answer for that one. Try rephrasing — or write our team directly and a real human will get back within one business day.",
      };
    } else {
      const top = results[0];
      const others = results.slice(1, 3); // up to 2 alternates
      const intro = pickIntro(turnCount.current);
      const answerText = extractAnswer(top.article);
      botMsg = {
        id: `b-${Date.now()}`,
        role: "bot",
        text: `${intro}\n\n${answerText}`,
        answer: { source: top, otherResults: others },
      };
    }

    turnCount.current += 1;
    setMessages((m) => [...m, userMsg, botMsg]);
    setInput("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleAsk(input);
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help chat" : "Open help chat"}
        className={`fixed bottom-6 right-6 z-40 flex h-14 items-center gap-2 rounded-full px-5 text-sm font-medium shadow-lg transition-all ${
          open
            ? "bg-cream text-ink hover:bg-cream/90"
            : "bg-red text-cream hover:bg-red-deep"
        }`}
      >
        <span className="text-base leading-none">{open ? "×" : "✦"}</span>
        <span>{open ? "Close" : "Ask RYDA"}</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex w-[min(420px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-rule bg-surface shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-rule bg-ink px-5 py-4 text-cream">
            <div>
              <p className="font-display text-base">Ask RYDA</p>
              <p className="text-[11px] uppercase tracking-wider text-cream/50">
                Answers from 61 help articles
              </p>
            </div>
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
                <BotBubble key={m.id} text={m.text} answer={m.answer} />
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
            <input
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
        </div>
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
}: {
  text: string;
  answer?: { source: SearchResult; otherResults: SearchResult[] };
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
