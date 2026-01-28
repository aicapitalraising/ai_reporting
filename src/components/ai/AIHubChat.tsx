import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Send, Loader2, Plus, Trash2, Bot, X, 
  MessageSquare, Paperclip, Mic, MicOff,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { 
  useAIHubConversations, 
  useAIHubMessages, 
  useCreateAIHubConversation, 
  useDeleteAIHubConversation,
  useAddAIHubMessage,
} from '@/hooks/useAIHubConversations';
import { useGPTKnowledgeLinks } from '@/hooks/useCustomGPTs';
import { useKnowledgeDocuments } from '@/hooks/useKnowledgeBase';
import { CustomGPT } from '@/hooks/useCustomGPTs';
import { Client } from '@/hooks/useClients';
import { AggregatedMetrics } from '@/hooks/useMetrics';
import { cn } from '@/lib/utils';

interface AIHubChatProps {
  selectedGPT: CustomGPT | null;
  onClearGPT: () => void;
  clients: Client[];
  clientMetrics: Record<string, AggregatedMetrics>;
  agencyMetrics: AggregatedMetrics;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type AIModel = 'gemini' | 'openai';

export function AIHubChat({ selectedGPT, onClearGPT, clients, clientMetrics, agencyMetrics }: AIHubChatProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<AIModel>('gemini');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: conversations = [] } = useAIHubConversations(selectedGPT?.id);
  const { data: dbMessages = [] } = useAIHubMessages(selectedConversationId || undefined);
  const createConversation = useCreateAIHubConversation();
  const deleteConversation = useDeleteAIHubConversation();
  const addMessage = useAddAIHubMessage();

  const { data: gptLinks = [] } = useGPTKnowledgeLinks(selectedGPT?.id);
  const { data: documents = [] } = useKnowledgeDocuments();

  // Get linked documents for context
  const linkedDocs = selectedGPT 
    ? documents.filter(d => gptLinks.some(l => l.document_id === d.id))
    : [];

  // Sync local messages with DB messages
  useEffect(() => {
    if (dbMessages.length > 0) {
      setLocalMessages(dbMessages.map(m => ({ 
        role: m.role as 'user' | 'assistant', 
        content: m.content 
      })));
    } else {
      setLocalMessages([]);
    }
  }, [dbMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages]);

  const handleNewConversation = async () => {
    const conv = await createConversation.mutateAsync({
      gptId: selectedGPT?.id,
      title: selectedGPT ? `Chat with ${selectedGPT.name}` : 'New Chat',
    });
    setSelectedConversationId(conv.id);
    setLocalMessages([]);
  };

  const buildSystemPrompt = () => {
    let prompt = selectedGPT?.system_prompt || 
      'You are an expert advertising agency AI assistant. Help analyze performance data, provide insights, and assist with strategy.';

    // Add knowledge base context
    if (linkedDocs.length > 0) {
      prompt += '\n\nYou have access to the following knowledge base documents:\n';
      linkedDocs.forEach(doc => {
        if (doc.extracted_text || doc.content) {
          prompt += `\n--- ${doc.name} ---\n${doc.extracted_text || doc.content}\n`;
        } else if (doc.website_url) {
          prompt += `\n- ${doc.name}: ${doc.website_url}\n`;
        }
      });
    }

    // Add agency metrics context
    prompt += `\n\nCurrent Agency Metrics:
- Total Ad Spend: $${agencyMetrics.totalAdSpend?.toLocaleString() || 0}
- Total Leads: ${agencyMetrics.totalLeads || 0}
- Total Calls: ${agencyMetrics.totalCalls || 0}
- Shows: ${agencyMetrics.showedCalls || 0}
- Cost per Lead: $${agencyMetrics.costPerLead?.toFixed(2) || 0}
- Funded Investors: ${agencyMetrics.fundedInvestors || 0}
- Funded Dollars: $${agencyMetrics.fundedDollars?.toLocaleString() || 0}

Active Clients: ${clients.filter(c => c.status === 'active').map(c => c.name).join(', ')}`;

    return prompt;
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    if (isLoading) return;

    // Create conversation if needed
    let conversationId = selectedConversationId;
    if (!conversationId) {
      const conv = await createConversation.mutateAsync({
        gptId: selectedGPT?.id,
        title: input.slice(0, 50) || 'New Chat',
      });
      conversationId = conv.id;
      setSelectedConversationId(conv.id);
    }

    const userMessage = input.trim() || `[Attached ${attachments.length} file(s)]`;
    const newMessages: Message[] = [...localMessages, { role: 'user', content: userMessage }];
    setLocalMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Save user message to DB
    await addMessage.mutateAsync({
      conversationId,
      role: 'user',
      content: userMessage,
    });

    let assistantContent = '';

    try {
      // Convert files to base64
      const fileContents: { name: string; type: string; content: string }[] = [];
      for (const file of attachments) {
        const content = await fileToBase64(file);
        fileContents.push({ name: file.name, type: file.type, content });
      }
      setAttachments([]);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analysis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: buildSystemPrompt() },
              ...newMessages,
            ],
            context: { isAgencyLevel: true },
            model,
            files: fileContents,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const updateAssistant = (newChunk: string) => {
        assistantContent += newChunk;
        setLocalMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => 
              i === prev.length - 1 ? { ...m, content: assistantContent } : m
            );
          }
          return [...prev, { role: 'assistant', content: assistantContent }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save assistant message to DB
      if (assistantContent) {
        await addMessage.mutateAsync({
          conversationId,
          role: 'assistant',
          content: assistantContent,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setLocalMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files].slice(0, 10));
    e.target.value = '';
  };

  return (
    <div className="flex h-[700px] border rounded-lg overflow-hidden bg-card">
      {/* Sidebar */}
      <div className={cn(
        "border-r bg-muted/30 transition-all duration-300 flex flex-col",
        sidebarOpen ? "w-64" : "w-0 overflow-hidden"
      )}>
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="font-semibold text-sm">Conversations</h4>
          <Button variant="ghost" size="icon" onClick={handleNewConversation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted group",
                  selectedConversationId === conv.id && "bg-muted"
                )}
                onClick={() => setSelectedConversationId(conv.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(conv.updated_at), 'MMM d, h:mm a')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation.mutate(conv.id);
                    if (selectedConversationId === conv.id) {
                      setSelectedConversationId(null);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No conversations yet
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between bg-background">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            {selectedGPT ? (
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${selectedGPT.color}20` }}
                >
                  🤖
                </div>
                <div>
                  <p className="font-semibold text-sm">{selectedGPT.name}</p>
                  <p className="text-xs text-muted-foreground">{linkedDocs.length} docs linked</p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClearGPT}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="font-semibold">Agency AI Assistant</span>
              </div>
            )}
          </div>
          <Select value={model} onValueChange={(v) => setModel(v as AIModel)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini">Gemini</SelectItem>
              <SelectItem value="openai">GPT-5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4 max-w-3xl mx-auto">
            {localMessages.length === 0 && (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  {selectedGPT ? `Chat with ${selectedGPT.name}` : 'Agency AI Assistant'}
                </h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {selectedGPT?.description || 
                    'Ask me anything about your clients, campaigns, or performance metrics. I have access to your agency data and can help with analysis.'}
                </p>
              </div>
            )}
            {localMessages.map((message, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && localMessages[localMessages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-2">
                  <p className="text-sm text-muted-foreground">Thinking...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-background">
          {attachments.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {attachments.map((file, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {file.name.slice(0, 20)}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                  />
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2 max-w-3xl mx-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.txt,.csv,.json"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask about clients, metrics, or get insights..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={isLoading || (!input.trim() && attachments.length === 0)}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}
