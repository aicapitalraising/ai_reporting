import { useState } from 'react';
import { useOutreachCampaigns, useOutreachMessages, useOutreachStats, useCreateCampaign, useUpdateCampaignStatus, useSendMessage, useMakeAICall } from '@/hooks/useOutreach';
import { useClients } from '@/hooks/useClients';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Phone, Send, Plus, Play, Pause, CheckCircle, BarChart3, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const channelIcons: Record<string, React.ElementType> = {
  sms: MessageSquare,
  imessage: MessageSquare,
  voice_call: Phone,
};

const statusColors: Record<string, string> = {
  queued: 'bg-muted text-muted-foreground',
  sending: 'bg-accent text-accent-foreground',
  delivered: 'bg-primary/20 text-primary',
  replied: 'bg-chart-2/20 text-chart-2',
  completed: 'bg-chart-2/20 text-chart-2',
  failed: 'bg-destructive/20 text-destructive',
  no_answer: 'bg-muted text-muted-foreground',
  voicemail: 'bg-accent/20 text-accent-foreground',
};

export function OutreachTab() {
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [createOpen, setCreateOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');

  const { data: clients = [] } = useClients();
  const { data: campaigns = [] } = useOutreachCampaigns(selectedClientFilter !== 'all' ? selectedClientFilter : undefined);
  const { data: messages = [] } = useOutreachMessages(selectedClientFilter !== 'all' ? selectedClientFilter : undefined);
  const { data: stats } = useOutreachStats();
  const createCampaign = useCreateCampaign();
  const updateStatus = useUpdateCampaignStatus();
  const sendMessage = useSendMessage();
  const makeCall = useMakeAICall();

  const [newCampaign, setNewCampaign] = useState({
    client_id: '',
    campaign_name: '',
    campaign_type: 'sms' as string,
    trigger_event: 'manual',
    message_template: '',
    voice_agent_prompt: '',
    voice_id: '',
  });

  const [quickSend, setQuickSend] = useState({
    client_id: '',
    phone: '',
    message: '',
    contact_name: '',
    channel: 'sms' as string,
  });

  const handleCreateCampaign = () => {
    if (!newCampaign.client_id || !newCampaign.campaign_name) return;
    createCampaign.mutate(newCampaign as any, {
      onSuccess: () => {
        setCreateOpen(false);
        setNewCampaign({ client_id: '', campaign_name: '', campaign_type: 'sms', trigger_event: 'manual', message_template: '', voice_agent_prompt: '', voice_id: '' });
      },
    });
  };

  const handleQuickSend = () => {
    if (!quickSend.client_id || !quickSend.phone) return;
    if (quickSend.channel === 'voice_call') {
      makeCall.mutate({
        phone: quickSend.phone,
        client_id: quickSend.client_id,
        contact_name: quickSend.contact_name,
        agent_prompt: quickSend.message,
      }, { onSuccess: () => setSendOpen(false) });
    } else {
      sendMessage.mutate({
        phone: quickSend.phone,
        message: quickSend.message,
        client_id: quickSend.client_id,
        contact_name: quickSend.contact_name,
        channel: quickSend.channel,
      }, { onSuccess: () => setSendOpen(false) });
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Messages Today</span>
            </div>
            <p className="text-2xl font-bold">{stats?.messagesToday || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="h-4 w-4 text-chart-2" />
              <span className="text-xs text-muted-foreground">Calls Today</span>
            </div>
            <p className="text-2xl font-bold">{stats?.callsToday || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-accent-foreground" />
              <span className="text-xs text-muted-foreground">Response Rate</span>
            </div>
            <p className="text-2xl font-bold">{(stats?.responseRate || 0).toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-chart-4" />
              <span className="text-xs text-muted-foreground">Active Campaigns</span>
            </div>
            <p className="text-2xl font-bold">{stats?.activeCampaigns || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={sendOpen} onOpenChange={setSendOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Send className="h-4 w-4 mr-2" />Quick Send</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Quick Send Message / Call</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={quickSend.client_id} onValueChange={v => setQuickSend(p => ({ ...p, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={quickSend.channel} onValueChange={v => setQuickSend(p => ({ ...p, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS / iMessage</SelectItem>
                  <SelectItem value="voice_call">AI Voice Call</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Contact Name" value={quickSend.contact_name} onChange={e => setQuickSend(p => ({ ...p, contact_name: e.target.value }))} />
              <Input placeholder="Phone Number" value={quickSend.phone} onChange={e => setQuickSend(p => ({ ...p, phone: e.target.value }))} />
              <Textarea
                placeholder={quickSend.channel === 'voice_call' ? 'Agent prompt / instructions...' : 'Message body...'}
                value={quickSend.message}
                onChange={e => setQuickSend(p => ({ ...p, message: e.target.value }))}
              />
              <Button onClick={handleQuickSend} disabled={!quickSend.phone || !quickSend.client_id} className="w-full">
                {quickSend.channel === 'voice_call' ? 'Start AI Call' : 'Send Message'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" />New Campaign</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Outreach Campaign</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Campaign Name" value={newCampaign.campaign_name} onChange={e => setNewCampaign(p => ({ ...p, campaign_name: e.target.value }))} />
              <Select value={newCampaign.client_id} onValueChange={v => setNewCampaign(p => ({ ...p, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={newCampaign.campaign_type} onValueChange={v => setNewCampaign(p => ({ ...p, campaign_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="imessage">iMessage</SelectItem>
                  <SelectItem value="voice_call">Voice Call</SelectItem>
                  <SelectItem value="sequence">Multi-step Sequence</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newCampaign.trigger_event} onValueChange={v => setNewCampaign(p => ({ ...p, trigger_event: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="new_lead">New Lead</SelectItem>
                  <SelectItem value="no_response_24h">No Response (24h)</SelectItem>
                  <SelectItem value="missed_call">Missed Call</SelectItem>
                </SelectContent>
              </Select>
              {(newCampaign.campaign_type === 'sms' || newCampaign.campaign_type === 'imessage') && (
                <Textarea placeholder="Message template... Use {contact_name}, {client_name}" value={newCampaign.message_template} onChange={e => setNewCampaign(p => ({ ...p, message_template: e.target.value }))} />
              )}
              {newCampaign.campaign_type === 'voice_call' && (
                <>
                  <Textarea placeholder="AI Agent prompt / instructions..." value={newCampaign.voice_agent_prompt} onChange={e => setNewCampaign(p => ({ ...p, voice_agent_prompt: e.target.value }))} />
                  <Input placeholder="ElevenLabs Voice ID (optional)" value={newCampaign.voice_id} onChange={e => setNewCampaign(p => ({ ...p, voice_id: e.target.value }))} />
                </>
              )}
              <Button onClick={handleCreateCampaign} disabled={!newCampaign.campaign_name || !newCampaign.client_id} className="w-full">
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="overview">Campaigns</TabsTrigger>
          <TabsTrigger value="feed">Message Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {campaigns.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No campaigns yet. Create your first outreach campaign to get started.</CardContent></Card>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map(c => {
                    const clientName = clients.find(cl => cl.id === c.client_id)?.name || 'Unknown';
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{c.campaign_name}</p>
                            <p className="text-xs text-muted-foreground">{clientName}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{c.campaign_type.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{c.trigger_event?.replace('_', ' ') || 'Manual'}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="capitalize">{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {c.status === 'draft' && (
                              <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: c.id, status: 'active' })}>
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                            {c.status === 'active' && (
                              <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: c.id, status: 'paused' })}>
                                <Pause className="h-3 w-3" />
                              </Button>
                            )}
                            {c.status === 'paused' && (
                              <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: c.id, status: 'active' })}>
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                            {(c.status === 'active' || c.status === 'paused') && (
                              <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: c.id, status: 'completed' })}>
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="feed">
          {messages.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No messages yet. Send your first outreach message to see activity here.</CardContent></Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {messages.map(msg => {
                  const Icon = channelIcons[msg.channel] || MessageSquare;
                  const clientName = clients.find(c => c.id === msg.client_id)?.name || '';
                  return (
                    <Card key={msg.id} className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${msg.direction === 'inbound' ? 'bg-chart-2/10' : 'bg-primary/10'}`}>
                          <Icon className={`h-4 w-4 ${msg.direction === 'inbound' ? 'text-chart-2' : 'text-primary'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{msg.contact_name || msg.contact_phone || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{clientName}</span>
                            <Badge className={`text-[10px] ${statusColors[msg.status] || ''}`}>
                              {msg.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {msg.sent_at ? formatDistanceToNow(new Date(msg.sent_at), { addSuffix: true }) : ''}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {msg.channel === 'voice_call'
                              ? (msg.call_summary || 'AI voice call')
                              : (msg.message_body || '')}
                          </p>
                          {msg.call_sentiment && (
                            <Badge variant="outline" className="mt-1 text-[10px] capitalize">{msg.call_sentiment.replace('_', ' ')}</Badge>
                          )}
                          {msg.error_message && (
                            <p className="text-xs text-destructive mt-1">{msg.error_message}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
