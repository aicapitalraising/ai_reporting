import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { StaticBatchCreator } from '@/components/static-batch/StaticBatchCreator';
import { StyleSettingsView } from '@/components/project/StyleSettingsView';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Users, FolderOpen, Palette, ArrowLeft } from 'lucide-react';

export default function StaticCreativesPage() {
  const { data: clients = [] } = useClients();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showStyles, setShowStyles] = useState(false);

  const { data: projects = [] } = useProjects(selectedClientId || undefined);
  const staticProjects = projects.filter(p => p.type === 'static_batch');

  const selectedProject = staticProjects.find(p => p.id === selectedProjectId);

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectId('');
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  if (showStyles) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Static Creatives', href: '/static-ads' }, { label: 'Manage Styles' }]}>
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowStyles(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Manage Styles</h1>
              <p className="text-sm text-muted-foreground">Add reference images, customize prompts, and create new styles</p>
            </div>
          </div>
          <StyleSettingsView clientId={selectedClientId || undefined} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Static Creatives' }]}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Static Creatives</h1>
            <p className="text-sm text-muted-foreground">Generate static ad creatives using your brand styles and references.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowStyles(true)}>
            <Palette className="h-4 w-4" />
            Manage Styles
          </Button>
        </div>

        {/* Client & Project Selector */}
        <Card className="p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Client
              </Label>
              <Select value={selectedClientId} onValueChange={handleClientChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClientId && (
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Project
                </Label>
                <Select value={selectedProjectId} onValueChange={handleProjectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={staticProjects.length ? 'Select a project...' : 'No static projects'} />
                  </SelectTrigger>
                  <SelectContent>
                    {staticProjects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>

        {/* Generator */}
        {selectedClientId && selectedProjectId ? (
          <StaticBatchCreator
            projectId={selectedProjectId}
            clientId={selectedClientId}
            projectOfferDescription={selectedProject?.offer_description}
          />
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">Select a client and project to start generating</p>
            <p className="text-sm mt-1">Choose a client above, then pick a static batch project.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
