import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Download, Package, FileText, FolderArchive, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Asset } from '@/types';

type ExportFormat = 'ad-platform' | 'client-delivery' | 'raw';

export default function ExportHubPage() {
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<ExportFormat>('raw');
  const [isExporting, setIsExporting] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['export-clients'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, name');
      return data || [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['export-projects', selectedClient],
    queryFn: async () => {
      if (!selectedClient) return [];
      const { data } = await supabase.from('projects').select('id, name').eq('client_id', selectedClient);
      return data || [];
    },
    enabled: !!selectedClient,
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['export-assets', selectedClient, selectedProject],
    queryFn: async () => {
      let query = supabase.from('assets').select('*').order('created_at', { ascending: false });
      if (selectedProject) query = query.eq('project_id', selectedProject);
      else if (selectedClient) query = query.eq('client_id', selectedClient);
      else return [];
      const { data } = await query;
      return (data || []) as Asset[];
    },
    enabled: !!selectedClient,
  });

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === assets.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(assets.map(a => a.id)));
  };

  const selectedAssets = assets.filter(a => selectedIds.has(a.id));

  const platformPreset = (platform: string) => {
    // Auto-select assets matching platform conventions
    const imageAssets = assets.filter(a => a.type === 'image');
    setSelectedIds(new Set(imageAssets.map(a => a.id)));
    setExportFormat('ad-platform');
    toast.info(`Selected ${imageAssets.length} image assets for ${platform} package`);
  };

  const handleExport = async () => {
    if (selectedAssets.length === 0) {
      toast.error('Select at least one asset');
      return;
    }

    setIsExporting(true);
    try {
      const zip = new JSZip();
      const clientName = clients.find(c => c.id === selectedClient)?.name || 'export';
      const sanitized = clientName.replace(/[^a-zA-Z0-9]/g, '_');

      for (let i = 0; i < selectedAssets.length; i++) {
        const asset = selectedAssets[i];
        if (!asset.public_url) continue;

        try {
          const response = await fetch(asset.public_url);
          const blob = await response.blob();
          const ext = asset.type === 'video' ? 'mp4' : 'png';
          
          let folderPath = '';
          if (exportFormat === 'ad-platform') {
            folderPath = `${sanitized}/${asset.type}s/`;
          } else if (exportFormat === 'client-delivery') {
            folderPath = `${sanitized}_delivery/${asset.type}/`;
          }

          const fileName = `${folderPath}${asset.name || `asset_${i + 1}`}.${ext}`;
          zip.file(fileName, blob);
        } catch {
          console.warn('Failed to fetch asset:', asset.public_url);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${sanitized}_${exportFormat}_${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success(`Exported ${selectedAssets.length} assets`);
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const isVideo = (a: Asset) => a.type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(a.public_url || '');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Export Hub</h1>
          <p className="text-muted-foreground">Package and download assets for ad platforms or client delivery</p>
        </div>

        {/* Selection */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Client</label>
            <Select value={selectedClient} onValueChange={v => { setSelectedClient(v); setSelectedProject(''); setSelectedIds(new Set()); }}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Project (optional)</label>
            <Select value={selectedProject || '__all__'} onValueChange={v => { setSelectedProject(v === '__all__' ? '' : v); setSelectedIds(new Set()); }}>
              <SelectTrigger><SelectValue placeholder="All projects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Projects</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <Select value={exportFormat} onValueChange={v => setExportFormat(v as ExportFormat)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="raw">
                  <span className="flex items-center gap-2"><FolderArchive className="h-4 w-4" /> Raw Download</span>
                </SelectItem>
                <SelectItem value="ad-platform">
                  <span className="flex items-center gap-2"><Package className="h-4 w-4" /> Ad Platform Package</span>
                </SelectItem>
                <SelectItem value="client-delivery">
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Client Delivery</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Platform Presets */}
        {selectedClient && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center">Quick presets:</span>
            <Button variant="outline" size="sm" onClick={() => platformPreset('Meta Ads')}>Meta Ads Package</Button>
            <Button variant="outline" size="sm" onClick={() => platformPreset('Google Ads')}>Google Ads Package</Button>
            <Button variant="outline" size="sm" onClick={() => platformPreset('TikTok Ads')}>TikTok Ads Package</Button>
          </div>
        )}

        {/* Assets Grid */}
        {selectedClient && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedIds.size === assets.length && assets.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size > 0 ? `${selectedIds.size} of ${assets.length} selected` : `${assets.length} assets`}
                </span>
              </div>
              <Button onClick={handleExport} disabled={isExporting || selectedIds.size === 0}>
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Export ({selectedIds.size})
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : assets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {assets.map(asset => {
                  const isSelected = selectedIds.has(asset.id);
                  return (
                    <Card
                      key={asset.id}
                      className={`relative overflow-hidden cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => toggleSelection(asset.id)}
                    >
                      <div className="absolute top-2 right-2 z-10">
                        <Checkbox checked={isSelected} />
                      </div>
                      <Badge className="absolute top-2 left-2 z-10 text-[10px]" variant="secondary">{asset.type}</Badge>
                      <div className="aspect-square bg-muted">
                        {asset.public_url ? (
                          isVideo(asset) ? (
                            <video src={asset.public_url} muted preload="metadata" className="w-full h-full object-cover" />
                          ) : (
                            <img src={asset.public_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No preview</div>
                        )}
                      </div>
                      <CardContent className="p-2">
                        <p className="text-xs truncate">{asset.name || 'Asset'}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No assets found for this selection.</div>
            )}
          </>
        )}

        {!selectedClient && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Select a client to view and export assets.
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
