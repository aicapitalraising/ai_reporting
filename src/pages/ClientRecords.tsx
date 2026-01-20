import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, Filter, Download, Mic, Play, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { CashBagLoader } from '@/components/ui/CashBagLoader';
import { useClient } from '@/hooks/useClients';
import { useCalls } from '@/hooks/useLeadsAndCalls';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { exportToCSV } from '@/lib/exportUtils';

const PAGE_SIZE = 150;

export default function ClientRecords() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { startDate, endDate } = useDateFilter();
  const { data: client, isLoading: clientLoading } = useClient(clientId);
  const { data: calls = [], isLoading: callsLoading } = useCalls(clientId, false, startDate, endDate);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCall, setSelectedCall] = useState<any>(null);

  const filteredCalls = useMemo(() => {
    if (!searchQuery) return calls;
    const query = searchQuery.toLowerCase();
    return calls.filter((call) =>
      (call.outcome?.toLowerCase().includes(query)) ||
      (call.summary?.toLowerCase().includes(query))
    );
  }, [calls, searchQuery]);

  const totalPages = Math.ceil(filteredCalls.length / PAGE_SIZE);
  const paginatedCalls = filteredCalls.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleExport = () => {
    exportToCSV(filteredCalls, `${client?.name || 'client'}-calls`);
  };

  const isLoading = clientLoading || callsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CashBagLoader message="Loading records..." />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Client not found</p>
      </div>
    );
  }

  const getQualityColor = (score: number | null) => {
    if (!score) return 'bg-muted';
    if (score >= 8) return 'bg-green-500';
    if (score >= 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/client/${clientId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {client.name}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <ThemeToggle />
          </div>
        </div>
        <div className="mt-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="h-6 w-6" />
            {client.name} - Call Records
          </h1>
          <p className="text-sm text-muted-foreground">View call details, summaries, and quality scores</p>
        </div>
      </header>

      <main className="p-6 space-y-6">
        <DateRangeFilter showAddClient={false} />

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-2">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Calls</p>
              <p className="text-3xl font-bold tabular-nums">{calls.length}</p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Showed</p>
              <p className="text-3xl font-bold tabular-nums text-chart-2">
                {calls.filter(c => c.showed).length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">With Summary</p>
              <p className="text-3xl font-bold tabular-nums">
                {calls.filter(c => c.summary).length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Avg Quality</p>
              <p className="text-3xl font-bold tabular-nums">
                {calls.filter(c => c.quality_score).length > 0
                  ? (calls.filter(c => c.quality_score).reduce((sum, c) => sum + (c.quality_score || 0), 0) / 
                     calls.filter(c => c.quality_score).length).toFixed(1)
                  : '-'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Calls Table */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Call Records
              </CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search calls..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2">
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Recording</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCalls.map((call) => (
                    <TableRow 
                      key={call.id} 
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedCall(call)}
                    >
                      <TableCell className="font-mono text-sm tabular-nums">
                        {call.scheduled_at 
                          ? new Date(call.scheduled_at).toLocaleString()
                          : new Date(call.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {call.showed ? (
                          <Badge className="bg-green-600">Showed</Badge>
                        ) : (
                          <Badge variant="secondary">No Show</Badge>
                        )}
                      </TableCell>
                      <TableCell>{call.outcome || '-'}</TableCell>
                      <TableCell className="max-w-xs">
                        {call.summary ? (
                          <span className="truncate block">{call.summary.substring(0, 80)}...</span>
                        ) : (
                          <span className="text-muted-foreground">No summary</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {call.quality_score ? (
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getQualityColor(call.quality_score)}`} />
                            <span className="font-mono tabular-nums">{call.quality_score}/10</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {call.recording_url ? (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(call.recording_url!, '_blank');
                            }}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Play
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {call.is_reconnect ? 'Reconnect' : 'Initial'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({filteredCalls.length} records)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Call Detail Modal */}
      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-2xl">
          {selectedCall && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Call Details
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled</p>
                    <p className="font-mono tabular-nums">
                      {selectedCall.scheduled_at 
                        ? new Date(selectedCall.scheduled_at).toLocaleString()
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {selectedCall.showed ? (
                      <Badge className="bg-green-600">Showed</Badge>
                    ) : (
                      <Badge variant="secondary">No Show</Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Outcome</p>
                    <p>{selectedCall.outcome || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quality Score</p>
                    {selectedCall.quality_score ? (
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold">{selectedCall.quality_score}/10</span>
                      </div>
                    ) : (
                      <p>-</p>
                    )}
                  </div>
                </div>

                {selectedCall.summary && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Call Summary</p>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-sm whitespace-pre-wrap">{selectedCall.summary}</p>
                    </div>
                  </div>
                )}

                {selectedCall.transcript && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Transcript</p>
                    <ScrollArea className="h-48 bg-muted rounded-lg p-4">
                      <p className="text-sm whitespace-pre-wrap">{selectedCall.transcript}</p>
                    </ScrollArea>
                  </div>
                )}

                {selectedCall.recording_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Recording</p>
                    <audio controls className="w-full">
                      <source src={selectedCall.recording_url} />
                    </audio>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
