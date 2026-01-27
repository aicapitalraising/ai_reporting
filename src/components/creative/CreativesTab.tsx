import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { useAllCreatives } from '@/hooks/useAllCreatives';
import { useClients, Client } from '@/hooks/useClients';
import { Creative, useUpdateCreativeStatus, useDeleteCreative } from '@/hooks/useCreatives';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlatformAdPreview } from './PlatformAdPreview';
import { CashBagLoader } from '@/components/ui/CashBagLoader';
import {
  Search,
  Image,
  Video,
  FileText,
  Upload,
  Clock,
  Check,
  X,
  Rocket,
  RefreshCw,
  MessageSquare,
  Trash2,
  Eye,
} from 'lucide-react';

interface CreativeWithClient extends Creative {
  clientName?: string;
}

export function CreativesTab() {
  const { data: creatives = [], isLoading: creativesLoading } = useAllCreatives();
  const { data: clients = [] } = useClients();
  const updateStatus = useUpdateCreativeStatus();
  const deleteCreative = useDeleteCreative();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCreative, setSelectedCreative] = useState<CreativeWithClient | null>(null);

  // Map client names to creatives
  const clientMap = clients.reduce((acc, client) => {
    acc[client.id] = client.name;
    return acc;
  }, {} as Record<string, string>);

  const creativesWithClients: CreativeWithClient[] = creatives.map(c => ({
    ...c,
    clientName: clientMap[c.client_id] || 'Unknown Client',
  }));

  // Filter creatives
  const filteredCreatives = creativesWithClients.filter((creative) => {
    const matchesSearch = 
      creative.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creative.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient = clientFilter === 'all' || creative.client_id === clientFilter;
    const matchesStatus = statusFilter === 'all' || creative.status === statusFilter;
    return matchesSearch && matchesClient && matchesStatus;
  });

  // Group by status for activity feed
  const recentActivity = creativesWithClients
    .slice(0, 20)
    .map(c => ({
      ...c,
      activityType: c.status === 'pending' ? 'uploaded' : c.status,
    }));

  const statusCounts = {
    all: creativesWithClients.length,
    pending: creativesWithClients.filter(c => c.status === 'pending').length,
    approved: creativesWithClients.filter(c => c.status === 'approved').length,
    launched: creativesWithClients.filter(c => c.status === 'launched').length,
    revisions: creativesWithClients.filter(c => c.status === 'revisions').length,
    rejected: creativesWithClients.filter(c => c.status === 'rejected').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'launched': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'revisions': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <Check className="h-4 w-4" />;
      case 'launched': return <Rocket className="h-4 w-4" />;
      case 'revisions': return <RefreshCw className="h-4 w-4" />;
      case 'rejected': return <X className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'copy': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleStatusChange = (creative: CreativeWithClient, status: 'approved' | 'revisions' | 'rejected' | 'launched') => {
    updateStatus.mutate({ 
      id: creative.id, 
      status, 
      clientId: creative.client_id,
      creativeTitle: creative.title 
    });
  };

  const handleDelete = (creative: CreativeWithClient) => {
    if (confirm('Are you sure you want to delete this creative?')) {
      deleteCreative.mutate({ id: creative.id, clientId: creative.client_id });
    }
  };

  if (creativesLoading) {
    return <CashBagLoader message="Loading creatives..." />;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search creatives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="launched">Launched</SelectItem>
            <SelectItem value="revisions">Revisions</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{statusCounts.all}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{statusCounts.pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{statusCounts.approved}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{statusCounts.launched}</p>
          <p className="text-xs text-muted-foreground">Launched</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-orange-600">{statusCounts.revisions}</p>
          <p className="text-xs text-muted-foreground">Revisions</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{statusCounts.rejected}</p>
          <p className="text-xs text-muted-foreground">Rejected</p>
        </div>
      </div>

      <Tabs defaultValue="creatives" className="space-y-4">
        <TabsList>
          <TabsTrigger value="creatives" className="gap-2">
            <Upload className="h-4 w-4" />
            All Creatives ({filteredCreatives.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Clock className="h-4 w-4" />
            Recent Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="creatives" className="space-y-4">
          {filteredCreatives.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No creatives found</p>
                <p className="text-sm text-muted-foreground">
                  Upload creatives from individual client dashboards
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCreatives.map((creative) => (
                <Card key={creative.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {creative.type === 'image' && creative.file_url ? (
                      <img
                        src={creative.file_url}
                        alt={creative.title}
                        className="w-full h-full object-cover"
                      />
                    ) : creative.type === 'video' && creative.file_url ? (
                      <video
                        src={creative.file_url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {getTypeIcon(creative.type)}
                        <span className="ml-2 text-sm text-muted-foreground capitalize">{creative.type}</span>
                      </div>
                    )}
                    <Badge className={`absolute top-2 right-2 ${getStatusColor(creative.status)}`}>
                      {getStatusIcon(creative.status)}
                      <span className="ml-1 capitalize">{creative.status}</span>
                    </Badge>
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-medium truncate">{creative.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{creative.clientName}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {creative.platform}
                        </Badge>
                        {creative.comments.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {creative.comments.length}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCreative(creative)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(creative)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(creative.created_at), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Creative Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {recentActivity.map((creative) => (
                    <div
                      key={creative.id}
                      className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedCreative(creative)}
                    >
                      <div className="w-16 h-16 rounded-md bg-muted overflow-hidden flex-shrink-0">
                        {creative.type === 'image' && creative.file_url ? (
                          <img
                            src={creative.file_url}
                            alt={creative.title}
                            className="w-full h-full object-cover"
                          />
                        ) : creative.type === 'video' && creative.file_url ? (
                          <video
                            src={creative.file_url}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {getTypeIcon(creative.type)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getStatusColor(creative.status)}>
                            {getStatusIcon(creative.status)}
                            <span className="ml-1 capitalize">{creative.status}</span>
                          </Badge>
                          <Badge variant="outline">{creative.platform}</Badge>
                        </div>
                        <h4 className="font-medium truncate">{creative.title}</h4>
                        <p className="text-sm text-muted-foreground">{creative.clientName}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(creative.updated_at), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(creative.updated_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Creative Detail Modal */}
      <Dialog open={!!selectedCreative} onOpenChange={(open) => !open && setSelectedCreative(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCreative && getTypeIcon(selectedCreative.type)}
              {selectedCreative?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedCreative && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getStatusColor(selectedCreative.status)}>
                  {selectedCreative.status}
                </Badge>
                <Badge variant="outline">{selectedCreative.platform}</Badge>
                <span className="text-sm text-muted-foreground">
                  Client: {selectedCreative.clientName}
                </span>
              </div>

              {/* Platform Preview */}
              <PlatformAdPreview 
                creative={selectedCreative} 
                platform={selectedCreative.platform}
                clientName={selectedCreative.clientName || 'Unknown Client'}
              />

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                {selectedCreative.status === 'pending' && (
                  <>
                    <Button
                      variant="default"
                      onClick={() => handleStatusChange(selectedCreative, 'approved')}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange(selectedCreative, 'revisions')}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Request Revisions
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleStatusChange(selectedCreative, 'rejected')}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
                {selectedCreative.status === 'approved' && (
                  <Button
                    variant="default"
                    onClick={() => handleStatusChange(selectedCreative, 'launched')}
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Mark as Launched
                  </Button>
                )}
              </div>

              {/* Comments */}
              {selectedCreative.comments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Comments ({selectedCreative.comments.length})</h4>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {selectedCreative.comments.map((comment) => (
                        <div key={comment.id} className="bg-muted/50 p-3 rounded-lg">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-medium">{comment.author}</span>
                            <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                          </div>
                          <p className="text-sm">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
