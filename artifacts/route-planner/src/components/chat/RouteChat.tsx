import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X, Loader2, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface RouteParams {
  trainingGoal?: string;
  distanceMiles?: number;
  timeOfDay?: string;
  preferShade?: boolean;
  avoidTraffic?: boolean;
  preferTrails?: boolean;
  temperatureF?: number;
  humidity?: number;
  windSpeedMph?: number;
  uvIndex?: number;
}

interface RouteChatProps {
  onApplyParams: (params: RouteParams) => void;
}

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export function RouteChat({ onApplyParams }: RouteChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingParams, setPendingParams] = useState<RouteParams | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const createConversation = async (): Promise<number> => {
    const res = await fetch(`${API_BASE}/openai/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Route Planning Chat" }),
    });
    if (!res.ok) throw new Error("Failed to create conversation");
    const data = await res.json();
    setConversationId(data.id);
    return data.id;
  };

  const extractRouteParams = (text: string): RouteParams | null => {
    const match = text.match(/<route_params>([\s\S]*?)<\/route_params>/);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  };

  const formatDisplayContent = (text: string): string => {
    return text.replace(/<route_params>[\s\S]*?<\/route_params>/g, "").trim();
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");

    let convId = conversationId;
    if (!convId) {
      convId = await createConversation();
    }

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: userMessage,
    };
    setChatMessages((prev) => [...prev, userMsg]);

    setIsStreaming(true);
    const assistantMsgId = Date.now() + 1;
    setChatMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch(
        `${API_BASE}/openai/conversations/${convId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: userMessage }),
        }
      );

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(errBody || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.done) continue;
            if (parsed.error) {
              fullText += `\n\n_Error: ${parsed.error}_`;
              continue;
            }
            if (parsed.content) {
              fullText += parsed.content;
              setChatMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: fullText } : m
                )
              );
            }
          } catch {
            // partial JSON line, will be completed in next chunk
          }
        }
      }

      const params = extractRouteParams(fullText);
      if (params) {
        setPendingParams(params);
      }
    } catch (err: any) {
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: "Sorry, something went wrong. Please try again." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleApplyParams = () => {
    if (pendingParams) {
      onApplyParams(pendingParams);
      setPendingParams(null);
    }
  };

  const handleClearChat = async () => {
    if (conversationId) {
      try {
        await fetch(`${API_BASE}/openai/conversations/${conversationId}`, {
          method: "DELETE",
        });
      } catch {}
    }
    setChatMessages([]);
    setConversationId(null);
    setPendingParams(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const goalLabels: Record<string, string> = {
    mountain_hiking: "Elevation",
    heat_tolerance: "Heat Adapt",
    recovery: "Recovery",
    speed_workout: "Speed",
    endurance: "Endurance",
    general_fitness: "General",
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 md:inset-auto md:bottom-24 md:right-6 md:w-[400px] md:max-h-[600px] bg-card md:border md:border-border md:rounded-2xl shadow-2xl shadow-black/50 flex flex-col z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Route AI Coach</h3>
                  <p className="text-xs text-muted-foreground">
                    Describe your ideal run
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {chatMessages.length > 0 && (
                  <button
                    onClick={handleClearChat}
                    className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                    title="Clear chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 custom-scrollbar">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <Sparkles className="w-10 h-10 text-primary/40 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Tell me about your ideal run and I'll optimize the route
                    settings for you.
                  </p>
                  <div className="space-y-2">
                    {[
                      "I want a shady trail run for heat training",
                      "Plan me a quick 5K recovery jog",
                      "I need a hilly 10-mile endurance run",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          inputRef.current?.focus();
                        }}
                        className="block w-full text-left px-4 py-2.5 text-xs bg-muted/50 hover:bg-muted border border-border/50 rounded-xl transition-colors text-foreground/70 hover:text-foreground"
                      >
                        "{suggestion}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <>
                        {formatDisplayContent(msg.content) || (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Thinking...
                          </span>
                        )}
                      </>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {pendingParams && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/10 border border-primary/30 rounded-xl p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
                    Suggested Route Settings
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {pendingParams.trainingGoal && (
                      <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-lg font-semibold">
                        {goalLabels[pendingParams.trainingGoal] ||
                          pendingParams.trainingGoal}
                      </span>
                    )}
                    {pendingParams.distanceMiles && (
                      <span className="px-2 py-1 bg-secondary/20 text-secondary text-xs rounded-lg font-semibold">
                        {pendingParams.distanceMiles} mi
                      </span>
                    )}
                    {pendingParams.timeOfDay && (
                      <span className="px-2 py-1 bg-muted text-foreground text-xs rounded-lg font-semibold">
                        {pendingParams.timeOfDay}
                      </span>
                    )}
                    {pendingParams.preferShade && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg font-semibold">
                        Shade
                      </span>
                    )}
                    {pendingParams.avoidTraffic && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-lg font-semibold">
                        Low Traffic
                      </span>
                    )}
                    {pendingParams.preferTrails && (
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-lg font-semibold">
                        Trails
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleApplyParams}
                    className="w-full py-2.5 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Apply to Route Planner
                  </button>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border bg-card">
              <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-4 py-2 focus-within:border-primary transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your ideal run..."
                  disabled={isStreaming}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isStreaming}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <motion.button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 w-14 h-14 rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-40 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <MessageSquare className="w-6 h-6" />
        </motion.button>
      )}
    </>
  );
}
