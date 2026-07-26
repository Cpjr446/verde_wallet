"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTransactions, useBudgets, useAnnualSalary } from "@/context/app-context";
import { chatWithAssistant, type ChatMessage, type AssistantChatInput } from "@/ai/flows/assistant-chat";
import { Bot, User, Send, Loader2, Sparkles, RefreshCw, MessageSquare } from "lucide-react";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: "💡 Spending Breakdown", query: "What are my top expense categories?" },
  { label: "💰 Tax & Net Salary", query: "What is my net monthly income and tax estimate?" },
  { label: "📈 Savings & Investment", query: "How much surplus do I have to save and invest?" },
  { label: "🎯 Budget Status", query: "Are any of my category budgets over the limit?" },
];

export default function AssistantChatUI() {
  const transactions = useTransactions();
  const budgets = useBudgets();
  const annualSalary = useAnnualSalary();

  const [messages, setMessages] = useState<LocalMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content: "Hello! I'm **Verde**, your AI personal financial assistant. Ask me any question about your spending, salary, tax estimates, or budgets!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isLoading) return;

    const userMessage: LocalMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputQuery("");
    setIsLoading(true);

    try {
      // Build conversation history for server action
      const historyForAi: ChatMessage[] = messages
        .filter(m => m.id !== "welcome-1")
        .concat(userMessage)
        .map(m => ({
          role: m.role === "user" ? "user" : "model",
          content: m.content
        }));

      const processedTransactions = (transactions || []).map(t => ({
        id: t.id || crypto.randomUUID(),
        type: t.type === 'income' ? 'income' as const : 'expense' as const,
        amount: typeof t.amount === 'number' && !isNaN(t.amount) ? t.amount : 0,
        date: t.date ? (t.date instanceof Date ? t.date.toISOString() : String(t.date)) : new Date().toISOString(),
        description: t.description || 'Transaction',
        category: {
          name: t.category?.name || 'Other',
          type: t.category?.type === 'income' ? 'income' as const : t.category?.type === 'expense' ? 'expense' as const : 'all' as const,
        }
      }));

      const input: AssistantChatInput = {
        messages: historyForAi.length > 0 ? historyForAi : [{ role: 'user', content: text }],
        transactions: processedTransactions,
        budgets: (budgets || []).map(b => ({
          id: b.id || crypto.randomUUID(),
          categoryName: b.categoryName || 'Other',
          amount: typeof b.amount === 'number' && !isNaN(b.amount) ? b.amount : 0,
        })),
        annualSalary: typeof annualSalary === 'number' && !isNaN(annualSalary) ? annualSalary : undefined,
        currentDate: new Date().toISOString()
      };

      const result = await chatWithAssistant(input);
      
      const assistantMessage: LocalMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (e) {
      console.error("Chat error:", e);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "I'm having trouble analyzing your request right now. Please try asking again!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome-1",
        role: "assistant",
        content: "Chat history cleared. What would you like to discuss next?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Helper to format simple markdown bold & lists in chat messages
  const renderFormattedContent = (content: string) => {
    return content.split('\n').map((line, lineIdx) => {
      // Process bold syntax **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, partIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={partIdx} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (line.trim().startsWith('- ') || line.trim().startsWith('1. ') || line.trim().startsWith('2. ')) {
        return <div key={lineIdx} className="pl-3 py-0.5 border-l-2 border-primary/50 my-1">{formattedLine}</div>;
      }

      return <p key={lineIdx} className={lineIdx > 0 ? "mt-1.5" : ""}>{formattedLine}</p>;
    });
  };

  return (
    <Card className="flex flex-col h-[560px] border-border shadow-md overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-card/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              Chat with Verde
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Context
              </span>
            </CardTitle>
            <CardDescription className="text-xs">
              Ask questions about your salary, spending, tax withholding, or budgets
            </CardDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearChat}
          className="text-xs text-muted-foreground hover:text-foreground"
          title="Clear Chat History"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Clear
        </Button>
      </CardHeader>

      {/* Messages Scroll Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0 mt-0.5 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-card text-card-foreground border border-border/80 rounded-bl-none"
              }`}
            >
              <div className="leading-relaxed">
                {renderFormattedContent(msg.content)}
              </div>
              <span
                className={`text-[10px] block mt-1.5 text-right opacity-70 ${
                  msg.role === "user" ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {msg.timestamp}
              </span>
            </div>

            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground flex-shrink-0 mt-0.5 shadow-sm border">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="bg-card border rounded-2xl rounded-bl-none px-4 py-3 text-sm text-muted-foreground flex items-center gap-2 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Verde is analyzing your financial data...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Quick Prompts & Input Area */}
      <div className="p-3 border-t bg-card space-y-3">
        {/* Quick prompt pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_PROMPTS.map((promptItem, idx) => (
            <button
              key={idx}
              disabled={isLoading}
              onClick={() => handleSendMessage(promptItem.query)}
              className="text-xs bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border text-muted-foreground px-2.5 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              <Sparkles className="w-3 h-3 text-emerald-500" />
              {promptItem.label}
            </button>
          ))}
        </div>

        {/* Text Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask Verde anything about your finances..."
            disabled={isLoading}
            className="flex-1 bg-background text-sm focus-visible:ring-primary"
          />
          <Button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-1.5" />
                Send
              </>
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
