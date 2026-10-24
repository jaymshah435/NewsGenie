import { useState } from "react";
import { ApprovalCard, type PendingAction } from "@/components/ApprovalCard";
import { ErrorMessage } from "@/components/States";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const EXAMPLES = [
  "Summarize activity across my three products over the last seven days.",
  "Which product experienced the greatest increase in activity?",
  "Show me moderation trends for this month.",
  "Change the moderation alert threshold to 75 after I approve.",
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  action?: PendingAction | null;
  error?: boolean;
}

export default function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const orgName = (id: string) => user!.organizations.find((o) => o.id === id)?.name ?? id;

  async function send(text: string) {
    if (!text.trim() || sending) return;
    const userMessage: ChatMessage = { role: "user", content: text.trim() };
    // Send the conversation so far (without failed replies) so follow-up questions work.
    const history = [...messages, userMessage]
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);
    try {
      const result = await apiFetch<{ reply: string; pending_action: PendingAction | null }>("/api/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ messages: history }),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply, action: result.pending_action }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">AI Assistant</h1>
      <p className="mb-6 text-sm text-slate-500">
        Ask about your products in plain English. Answers use live data from the product APIs and only the
        organizations you can access. Setting changes need your approval.
      </p>

      <div className="flex min-h-[480px] flex-col rounded-lg border border-slate-200 bg-white">
        <div className="flex-1 space-y-4 p-5">
          {messages.length === 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Try asking:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    onClick={() => send(example)}
                    className="rounded-md border border-slate-200 p-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[80%] rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">{m.content}</p>
              </div>
            ) : m.error ? (
              <ErrorMessage key={i} message={m.content} />
            ) : (
              <div key={i} className="max-w-[90%]">
                <p className="whitespace-pre-wrap rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900">{m.content}</p>
                {m.action && <ApprovalCard action={m.action} orgName={orgName(m.action.org_id)} />}
              </div>
            ),
          )}

          {sending && (
            <p role="status" className="text-sm text-slate-500">
              Thinking…
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2 border-t border-slate-200 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            aria-label="Message"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
}
