import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, BookOpen, Bot, Activity } from 'lucide-react';
import { AIHubChat } from './AIHubChat';
import { KnowledgeBasePanel } from './KnowledgeBasePanel';
import { CustomGPTsPanel } from './CustomGPTsPanel';
import { AgentsDashboard } from './AgentsDashboard';
import { CustomGPT } from '@/hooks/useCustomGPTs';
import { Client } from '@/hooks/useClients';
import { AggregatedMetrics } from '@/hooks/useMetrics';

interface AIHubTabProps {
  clients: Client[];
  clientMetrics: Record<string, AggregatedMetrics>;
  agencyMetrics: AggregatedMetrics;
}

export function AIHubTab({ clients, clientMetrics, agencyMetrics }: AIHubTabProps) {
  const [activeSubTab, setActiveSubTab] = useState('chat');
  const [selectedGPT, setSelectedGPT] = useState<CustomGPT | null>(null);

  const handleSelectGPT = (gpt: CustomGPT) => {
    setSelectedGPT(gpt);
    setActiveSubTab('chat');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">AI Hub</h2>
          <p className="text-sm text-muted-foreground">
            Chat with AI assistants, manage knowledge base, custom GPTs, and monitor agents
          </p>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="grid w-full max-w-xl grid-cols-4">
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="gpts" className="gap-2">
            <Bot className="h-4 w-4" />
            Custom GPTs
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-2">
            <Activity className="h-4 w-4" />
            Agents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <AIHubChat
            selectedGPT={selectedGPT}
            onClearGPT={() => setSelectedGPT(null)}
            clients={clients}
            clientMetrics={clientMetrics}
            agencyMetrics={agencyMetrics}
          />
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <KnowledgeBasePanel />
        </TabsContent>

        <TabsContent value="gpts" className="space-y-4">
          <CustomGPTsPanel onSelectGPT={handleSelectGPT} />
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <AgentsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
