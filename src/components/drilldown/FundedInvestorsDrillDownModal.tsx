import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2, Plus, ChevronLeft, ChevronRight, Eye, Filter, Sparkles, Loader2 } from 'lucide-react';
import { useFundedInvestors, FundedInvestor } from '@/hooks/useMetrics';
import { useLeads } from '@/hooks/useLeadsAndCalls';
import { useClient } from '@/hooks/useClients';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CashBagLoader } from '@/components/ui/CashBagLoader';
import { UniversalRecordPanel } from '@/components/records/UniversalRecordPanel';
import { fetchAllRows } from '@/lib/fetchAllRows';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FundedInvestorsDrillDownModalProps {
  clientId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAGE_SIZE = 150;

function getInvestorStatus(investor: FundedInvestor): 'funded' | 'committed' | 'pending' {
  if (Number(investor.funded_amount) > 0) return 'funded';
  if (Number(investor.commitment_amount || 0) > 0) return 'committed';
  return 'pending';
}

function StatusBadge({ status }: { status: 'funded' | 'committed' | 'pending' }) {
  if (status === 'funded') return <Badge className="bg-chart-2/20 text-chart-2 border-chart-2/30 text-xs">Funded</Badge>;
  if (status === 'committed') return <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Committed</Badge>;
  return <Badge variant="outline" className="text-xs">Pending</Badge>;
}

interface EnrichedFundedInvestor extends FundedInvestor {
  enrichment?: {
    city?: string | null;
    state?: string | null;
    net_worth?: string | null;
    household_income?: string | null;
    home_value?: number | null;
    credit_range?: string | null;
    is_investor?: boolean | null;
    occupation?: string | null;
    company_name?: string | null;
    company_title?: string | null;
    education?: string | null;
    age?: number | null;
    gender?: string | null;
    linkedin_url?: string | null;
    enriched_phones?: any[];
    enriched_emails?: any[];
    spouse_data?: any[] | null;
    home_ownership?: string | null;
  } | null;
}

export function FundedInvestorsDrillDownModal({ clientId, open, onOpenChange }: FundedInvestorsDrillDownModalProps) {
  const { startDate, endDate } = useDateFilter();
  const { data: client } = useClient(clientId);
  const { data: investors = [], isLoading } = useFundedInvestors(clientId, startDate, endDate);
  const { data: leads = [] } = useLeads(clientId, startDate, endDate);
  const [isAdding, setIsAdding] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvestor, setSelectedInvestor] = useState<FundedInvestor | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [isEnrichingAll, setIsEnrichingAll] = useState(false);
  const [newInvestor, setNewInvestor] = useState({
    name: '',
    funded_amount: 0,
    funded_at: new Date().toISOString().split('T')[0],
    first_contact_at: '',
    calls_to_fund: 0,
  });
  const queryClient = useQueryClient();

  // Fetch enrichment data for all investors
  const { data: enrichmentMap = {} } = useQuery({
    queryKey: ['funded-enrichment', clientId],
    queryFn: async () => {
      if (!clientId) return {};
      const data = await fetchAllRows<any>((sb) =>
        sb.from('lead_enrichment')
          .select('external_id, lead_id, city, state, net_worth, household_income, home_value, credit_range, is_investor, occupation, company_name, company_title, education, age, gender, linkedin_url, enriched_phones, enriched_emails, spouse_data, home_ownership')
          .eq('client_id', clientId)
      );
      const map: Record<string, any> = {};
      for (const e of data) {
        if (e.external_id) map[e.external_id] = e;
        if (e.lead_id) map[`lead:${e.lead_id}`] = e;
      }
      return map;
    },
    enabled: !!clientId && open,
  });

  // Merge enrichment into investors
  const enrichedInvestors: EnrichedFundedInvestor[] = useMemo(() => {
    return investors.map((inv: FundedInvestor) => {
      const enrichment = enrichmentMap[inv.external_id] || (inv.lead_id ? enrichmentMap[`lead:${inv.lead_id}`] : null) || null;
      return { ...inv, enrichment };
    });
  }, [investors, enrichmentMap]);

  const enrichedCount = enrichedInvestors.filter(i => i.enrichment).length;

  // Filter investors by search
  const filteredInvestors = useMemo(() => {
    if (!searchQuery) return enrichedInvestors;
    const query = searchQuery.toLowerCase();
    return enrichedInvestors.filter((investor) => 
      (investor.name?.toLowerCase().includes(query)) ||
      (investor.enrichment?.city?.toLowerCase().includes(query)) ||
      (investor.enrichment?.state?.toLowerCase().includes(query)) ||
      (investor.enrichment?.company_name?.toLowerCase().includes(query))
    );
  }, [enrichedInvestors, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredInvestors.length / PAGE_SIZE);
  const paginatedInvestors = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredInvestors.slice(start, start + PAGE_SIZE);
  }, [filteredInvestors, currentPage]);

  const handleExportAll = () => {
    const exportData = enrichedInvestors.map(inv => ({
      name: inv.name,
      status: getInvestorStatus(inv),
      commitment_amount: inv.commitment_amount,
      funded_amount: inv.funded_amount,
      first_contact_at: inv.first_contact_at,
      funded_at: inv.funded_at,
      time_to_fund_days: inv.time_to_fund_days,
      calls_to_fund: inv.calls_to_fund,
      city: inv.enrichment?.city || '',
      state: inv.enrichment?.state || '',
      net_worth: inv.enrichment?.net_worth || '',
      household_income: inv.enrichment?.household_income || '',
      home_value: inv.enrichment?.home_value || '',
      credit_range: inv.enrichment?.credit_range || '',
      is_investor: inv.enrichment?.is_investor ? 'Yes' : '',
      occupation: inv.enrichment?.occupation || '',
      company: inv.enrichment?.company_name || '',
      title: inv.enrichment?.company_title || '',
      education: inv.enrichment?.education || '',
      age: inv.enrichment?.age || '',
      gender: inv.enrichment?.gender || '',
      linkedin: inv.enrichment?.linkedin_url || '',
      phone: inv.enrichment?.enriched_phones?.[0]?.phone || inv.enrichment?.enriched_phones?.[0] || '',
      email: inv.enrichment?.enriched_emails?.[0]?.email || inv.enrichment?.enriched_emails?.[0] || '',
      spouse: inv.enrichment?.spouse_data?.map((s: any) => `${s.firstName || ''} ${s.lastName || ''}`).join('; ') || '',
    }));
    exportToCSV(exportData, 'funded-investors-enriched-all');
  };

  const handleExportFiltered = () => {
    const exportData = filteredInvestors.map(inv => ({
      name: inv.name,
      status: getInvestorStatus(inv),
      commitment_amount: inv.commitment_amount,
      funded_amount: inv.funded_amount,
      funded_at: inv.funded_at,
      city: inv.enrichment?.city || '',
      state: inv.enrichment?.state || '',
      net_worth: inv.enrichment?.net_worth || '',
      household_income: inv.enrichment?.household_income || '',
      occupation: inv.enrichment?.occupation || '',
      company: inv.enrichment?.company_name || '',
      phone: inv.enrichment?.enriched_phones?.[0]?.phone || inv.enrichment?.enriched_phones?.[0] || '',
      email: inv.enrichment?.enriched_emails?.[0]?.email || inv.enrichment?.enriched_emails?.[0] || '',
    }));
    exportToCSV(exportData, 'funded-investors-filtered');
  };

  const enrichAllFunded = async () => {
    if (!clientId) return;
    setIsEnrichingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-all-funded', {
        body: { client_id: clientId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed');
      toast.success(`Enriching ${data.total} funded investors in background (${data.already_enriched} already done)`);
    } catch (err: any) {
      toast.error(`Enrichment failed: ${err.message}`);
    } finally {
      setIsEnrichingAll(false);
    }
  };

  const deleteInvestor = async (investorId: string) => {
    if (!confirm('Are you sure you want to delete this funded investor record?')) return;
    
    try {
      const { error } = await supabase
        .from('funded_investors')
        .delete()
        .eq('id', investorId);

      if (error) throw error;

      toast.success('Investor deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['funded-investors', clientId] });
      queryClient.invalidateQueries({ queryKey: ['daily-metrics', clientId] });
    } catch (error: any) {
      toast.error('Failed to delete investor: ' + error.message);
    }
  };

  const addInvestor = async () => {
    if (!clientId) return;
    
    let timeToFund: number | null = null;
    if (newInvestor.first_contact_at && newInvestor.funded_at) {
      const firstContact = new Date(newInvestor.first_contact_at);
      const fundedDate = new Date(newInvestor.funded_at);
      timeToFund = Math.ceil((fundedDate.getTime() - firstContact.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    try {
      const { error } = await supabase
        .from('funded_investors')
        .insert({
          client_id: clientId,
          external_id: `manual-${Date.now()}`,
          name: newInvestor.name || null,
          funded_amount: newInvestor.funded_amount,
          funded_at: new Date(newInvestor.funded_at).toISOString(),
          first_contact_at: newInvestor.first_contact_at ? new Date(newInvestor.first_contact_at).toISOString() : null,
          time_to_fund_days: timeToFund,
          calls_to_fund: newInvestor.calls_to_fund || 0,
        });

      if (error) throw error;

      toast.success('Funded investor added successfully');
      setIsAdding(false);
      setNewInvestor({
        name: '',
        funded_amount: 0,
        funded_at: new Date().toISOString().split('T')[0],
        first_contact_at: '',
        calls_to_fund: 0,
      });
      queryClient.invalidateQueries({ queryKey: ['funded-investors', clientId] });
    } catch (error: any) {
      toast.error('Failed to add investor: ' + error.message);
    }
  };

  const viewInvestorActivity = (investor: FundedInvestor) => {
    setSelectedInvestor(investor);
    setShowActivityModal(true);
  };

  const getLeadForInvestor = (leadId: string | null) => {
    if (!leadId) return null;
    return leads.find((lead: any) => lead.id === leadId);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                Funded Investors ({filteredInvestors.length} of {investors.length})
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {startDate} to {endDate}
                </span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {enrichedCount}/{investors.length} enriched
                </Badge>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={enrichAllFunded}
                  disabled={isEnrichingAll}
                >
                  {isEnrichingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Enrich All
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Investor
                </Button>
                <Select onValueChange={(v) => v === 'all' ? handleExportAll() : handleExportFiltered()}>
                  <SelectTrigger className="w-36">
                    <Download className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Export" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filtered">Export Filtered</SelectItem>
                    <SelectItem value="all">Export All (w/ Enrichment)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogHeader>

          {/* Search */}
          <div className="flex items-center gap-2 py-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, city, state, company..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-sm"
            />
            <span className="text-sm text-muted-foreground">
              Showing {paginatedInvestors.length} of {filteredInvestors.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-auto">
            {isAdding && (
              <div className="border border-border bg-muted/50 p-4 mb-4 rounded-lg">
                <h4 className="font-semibold mb-3">Add New Funded Investor</h4>
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Name</label>
                    <Input
                      value={newInvestor.name}
                      onChange={(e) => setNewInvestor({ ...newInvestor, name: e.target.value })}
                      placeholder="Investor name"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Amount Funded ($)</label>
                    <Input
                      type="number"
                      value={newInvestor.funded_amount}
                      onChange={(e) => setNewInvestor({ ...newInvestor, funded_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">First Contact Date</label>
                    <Input
                      type="date"
                      value={newInvestor.first_contact_at}
                      onChange={(e) => setNewInvestor({ ...newInvestor, first_contact_at: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Funded Date</label>
                    <Input
                      type="date"
                      value={newInvestor.funded_at}
                      onChange={(e) => setNewInvestor({ ...newInvestor, funded_at: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Calls to Fund</label>
                    <Input
                      type="number"
                      value={newInvestor.calls_to_fund}
                      onChange={(e) => setNewInvestor({ ...newInvestor, calls_to_fund: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                  <Button size="sm" onClick={addInvestor}>Add Investor</Button>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-12">
                <CashBagLoader message="Loading investors..." />
              </div>
            ) : paginatedInvestors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No funded investors found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2">
                    <TableHead className="font-bold">Name</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold text-right">Funded $</TableHead>
                    <TableHead className="font-bold">Location</TableHead>
                    <TableHead className="font-bold">Net Worth</TableHead>
                    <TableHead className="font-bold">HH Income</TableHead>
                    <TableHead className="font-bold">Occupation</TableHead>
                    <TableHead className="font-bold">Company</TableHead>
                    <TableHead className="font-bold">Phone</TableHead>
                    <TableHead className="font-bold">Email</TableHead>
                    <TableHead className="font-bold">Funded Date</TableHead>
                    <TableHead className="font-bold text-right">Days to Fund</TableHead>
                    <TableHead className="font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvestors.map((investor: EnrichedFundedInvestor) => {
                    const status = getInvestorStatus(investor);
                    const e = investor.enrichment;
                    const phone = e?.enriched_phones?.[0]?.phone || e?.enriched_phones?.[0] || '';
                    const email = e?.enriched_emails?.[0]?.email || e?.enriched_emails?.[0] || '';
                    return (
                      <TableRow key={investor.id} className="border-b hover:bg-muted/50 cursor-pointer text-xs" onClick={() => viewInvestorActivity(investor)}>
                        <TableCell className="font-medium text-sm">{investor.name || 'Unknown'}</TableCell>
                        <TableCell><StatusBadge status={status} /></TableCell>
                        <TableCell className="text-right font-mono text-chart-2">
                          {Number(investor.funded_amount) > 0
                            ? `$${Number(investor.funded_amount).toLocaleString()}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {e?.city || e?.state ? [e.city, e.state].filter(Boolean).join(', ') : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-primary">{e?.net_worth || '-'}</TableCell>
                        <TableCell className="font-mono">{e?.household_income || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{e?.occupation || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{e?.company_name || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{phone || '-'}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[140px] truncate">{email || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {new Date(investor.funded_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {investor.time_to_fund_days !== null ? `${investor.time_to_fund_days}d` : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7" 
                              onClick={(e) => { e.stopPropagation(); viewInvestorActivity(investor); }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7" 
                              onClick={(e) => { e.stopPropagation(); deleteInvestor(investor.id); }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Detail Panel */}
      {selectedInvestor && clientId && (
        <UniversalRecordPanel
          open={showActivityModal}
          onOpenChange={setShowActivityModal}
          recordType="funded"
          record={selectedInvestor}
          clientId={clientId}
          linkedLead={selectedInvestor.lead_id ? getLeadForInvestor(selectedInvestor.lead_id) : undefined}
        />
      )}
    </>
  );
}
