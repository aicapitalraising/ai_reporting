import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useClient } from '@/hooks/useClients';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Video, Image, Film, GitBranch, Pencil, Check, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { StaticBatchCreator } from '@/components/static-batch/StaticBatchCreator';
import { FlowboardCreator } from '@/components/flowboard/FlowboardCreator';
import { BatchVideoWorkflow } from '@/components/batch-video/BatchVideoWorkflow';
import { ProjectSidebar, ProjectView } from '@/components/project/ProjectSidebar';
import { StyleSettingsView } from '@/components/project/StyleSettingsView';
import { StyleGuideView } from '@/components/project/StyleGuideView';
import { ProjectHistorySection } from '@/components/history/ProjectHistorySection';

export default function ProjectPage() {
  const { clientId, projectId } = useParams<{ clientId: string; projectId: string }>();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ProjectView>('creator');
  const [editingOffer, setEditingOffer] = useState(false);
  const [offerDraft, setOfferDraft] = useState('');
  
  const { data: client, isLoading: clientLoading } = useClient(clientId);
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const updateProject = useUpdateProject();

  const handleSaveOffer = () => {
    if (!projectId) return;
    updateProject.mutate({ id: projectId, offer_description: offerDraft.trim() || undefined });
    setEditingOffer(false);
  };

  const isLoading = clientLoading || projectLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!client || !project) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="text-xl font-semibold">Project not found</h2>
          <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
          <button 
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            Go back to clients
          </button>
        </div>
      </AppLayout>
    );
  }

  const getIcon = () => {
    switch (project.type) {
      case 'video_batch': return Video;
      case 'batch_video': return Video;
      case 'static_batch': return Image;
      case 'broll': return Film;
      case 'flowboard': return GitBranch;
      default: return Video;
    }
  };

  const Icon = getIcon();

  const isStaticOrVideo = project.type === 'static_batch' || project.type === 'video_batch' || project.type === 'batch_video';
  const showSidebar = true; // Show sidebar for all project types

  // Render project-specific creator based on type
  const renderProjectContent = () => {
    // Settings views
    if (currentView === 'style-manager' && isStaticOrVideo) {
      return <StyleSettingsView clientId={clientId!} />;
    }
    if (currentView === 'style-info' && isStaticOrVideo) {
      return <StyleGuideView clientId={clientId!} />;
    }
    if (currentView === 'history') {
      return <ProjectHistorySection projectId={projectId!} projectName={project.name} />;
    }

    // Creator views
    switch (project.type) {
      case 'static_batch':
        return <StaticBatchCreator projectId={projectId!} clientId={clientId!} projectOfferDescription={project.offer_description} />;
      case 'video_batch':
      case 'batch_video':
        return <BatchVideoWorkflow projectId={projectId!} clientId={clientId!} />;
      case 'flowboard':
        return <FlowboardCreator projectId={projectId!} clientId={clientId!} />;
      default:
        return (
          <div className="flex items-center justify-center py-24 border-2 border-dashed border-border rounded-lg">
            <div className="text-center">
              <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {project.type === 'broll' && 'B-Roll Library'}
              </h3>
              <p className="text-muted-foreground">
                Coming soon...
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/clients/${clientId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">{client.name}</p>
            </div>
          </div>
        </div>

        {/* Offer Description */}
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Offer / Product Description</label>
            {!editingOffer && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setOfferDraft(project.offer_description || ''); setEditingOffer(true); }}>
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            )}
          </div>
          {editingOffer ? (
            <div className="space-y-2">
              <Textarea
                value={offerDraft}
                onChange={(e) => setOfferDraft(e.target.value)}
                placeholder="Describe the offer, product, or service for AI context..."
                className="min-h-[60px] text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditingOffer(false)}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSaveOffer} disabled={updateProject.isPending}>
                  <Check className="h-3 w-3 mr-1" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground">
              {project.offer_description || <span className="text-muted-foreground italic">No description set — click Edit to add context for AI generation</span>}
            </p>
          )}
        </div>

        {/* Project layout with sidebar */}
        <div className="flex gap-6 -mx-6 -mb-6">
          <ProjectSidebar
            projectType={project.type}
            currentView={currentView}
            onViewChange={setCurrentView}
          />
          <div className="flex-1 pr-6 pb-6">
            {renderProjectContent()}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
