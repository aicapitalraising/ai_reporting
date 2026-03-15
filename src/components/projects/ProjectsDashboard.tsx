import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client, ProjectType, Avatar } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects';
import { useAvatars, useDeleteAvatar } from '@/hooks/useAvatars';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Image, 
  Film, 
  GitBranch, 
  Plus, 
  ArrowLeft,
  Loader2,
  Clock,
  UserPlus,
  MoreHorizontal,
  Trash2,
  Pencil,
  LayoutGrid,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { BrandGuideSection } from '@/components/clients/BrandGuideSection';
import { ClientHistorySection } from '@/components/history/ClientHistorySection';
import { CreateAvatarDialog } from '@/components/avatars/CreateAvatarDialog';
import { AvatarCard } from '@/components/avatars/AvatarCard';
import { AvatarDetailDialog } from '@/components/avatars/AvatarDetailDialog';
import { InspirationLibrary } from '@/components/ad-scraping/InspirationLibrary';
import { ReferenceAdsSection } from '@/components/clients/ReferenceAdsSection';
import { BrandKitBar } from '@/components/clients/BrandKitBar';
import { useAdStyles } from '@/hooks/useAdStyles';
import { useAssets } from '@/hooks/useAssets';
import { ClientForm } from '@/components/clients/ClientForm';
import { useUpdateClient } from '@/hooks/useClients';

interface ProjectsDashboardProps {
  client: Client;
}

const projectTypes: { type: ProjectType; icon: typeof Video; title: string; description: string }[] = [
  {
    type: 'batch_video',
    icon: Video,
    title: 'Batch Video',
    description: 'Create multiple video scenes from a single script with AI avatars',
  },
  {
    type: 'static_batch',
    icon: Image,
    title: 'Static Batch',
    description: 'Create multiple static ad images with various styles',
  },
  {
    type: 'broll',
    icon: Film,
    title: 'B-Roll Library',
    description: 'Generate and organize background video clips',
  },
  {
    type: 'flowboard',
    icon: GitBranch,
    title: 'Flowboard',
    description: 'Build video funnels with branching paths and variations',
  },
];

export function ProjectsDashboard({ client }: ProjectsDashboardProps) {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ProjectType | null>(null);
  const [projectName, setProjectName] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);

  const { data: projects, isLoading } = useProjects(client.id);
  const { data: avatars = [] } = useAvatars(client.id);
  const { data: adStyles = [] } = useAdStyles(client.id);
  const { data: assets = [] } = useAssets({ clientId: client.id });
  const deleteAvatar = useDeleteAvatar();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const updateClient = useUpdateClient();
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [brandEditMode, setBrandEditMode] = useState(false);

  const clientAvatars = avatars.filter(a => !a.is_stock && a.client_id === client.id);

  const handleCreateProject = async () => {
    if (!selectedType || !projectName.trim()) return;

    try {
      const project = await createProject.mutateAsync({
        client_id: client.id,
        name: projectName,
        type: selectedType,
        offer_description: offerDescription.trim() || undefined,
      });
      setCreateDialogOpen(false);
      setProjectName('');
      setOfferDescription('');
      setSelectedType(null);
      toast.success('Project created');
      
      // Navigate to the project
      navigate(`/clients/${client.id}/projects/${project.id}`);
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const openCreateDialog = (type: ProjectType) => {
    setSelectedType(type);
    setProjectName('');
    setOfferDescription(client.offer_description || '');
    setCreateDialogOpen(true);
  };

  const getTypeInfo = (type: ProjectType) => {
    return projectTypes.find(t => t.type === type) || projectTypes[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold truncate">{client.name}</h1>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setEditFormOpen(true)} title="Edit Client">
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          {client.description && (
            <p className="text-muted-foreground">{client.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Stats badges */}
          <Badge variant="secondary" className="gap-1">
            <Image className="h-3 w-3" /> {assets.length} assets
          </Badge>
          <Badge variant="outline" className="gap-1">
            {(projects || []).length} projects
          </Badge>
          <Button variant="outline" size="sm" onClick={() => navigate(`/static-ads?client=${client.id}`)}>
            <LayoutGrid className="h-4 w-4 mr-1" />
            Quick Ad
          </Button>
          <Button onClick={() => setAvatarDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create Avatar
          </Button>
        </div>
      </div>

      {/* Brand Kit Bar */}
      <BrandKitBar
        client={client}
        stylesCount={adStyles.length}
        assetsCount={assets.length}
        onEditSection={(section) => {
          setBrandEditMode(true);
          // Scroll to brand guide section
          const el = document.getElementById('brand-guide-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Tabs: Projects vs Inspiration */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="inspiration">Inspiration Library</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-6">
          {/* Brand Guide */}
          <BrandGuideSection client={client} />

          {/* Reference Ads */}
          <ReferenceAdsSection clientId={client.id} />

          {/* Client Avatars */}
          {clientAvatars.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Avatars</h2>
                <span className="text-sm text-muted-foreground">{clientAvatars.length} avatar{clientAvatars.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {clientAvatars.map((avatar) => (
                  <AvatarCard
                    key={avatar.id}
                    avatar={avatar}
                    onClick={(a) => setSelectedAvatar(a)}
                    onDelete={(a) => {
                      if (confirm(`Delete avatar "${a.name}"?`)) {
                        deleteAvatar.mutate(a.id);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Creation Mode Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {projectTypes.map(({ type, icon: Icon, title, description }) => (
              <Card 
                key={type}
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => openCreateDialog(type)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{title}</CardTitle>
                      <CardDescription>{description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Existing Projects */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Recent Projects</h2>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => {
                  const typeInfo = getTypeInfo(project.type);
                  const Icon = typeInfo.icon;
                  
                  return (
                    <Card 
                      key={project.id}
                      className="group cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/clients/${client.id}/projects/${project.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-muted p-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{project.name}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(new Date(project.created_at), 'MMM d, yyyy')}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); setDeletingProjectId(project.id); }}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No projects yet. Select a creation mode above to get started.
              </p>
            )}
          </div>

          {/* Client History Section */}
          <ClientHistorySection clientId={client.id} clientName={client.name} />
        </TabsContent>

        <TabsContent value="inspiration">
          <InspirationLibrary clientId={client.id} />
        </TabsContent>
      </Tabs>

      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              New {selectedType && getTypeInfo(selectedType).title} Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Project name..."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            />
            <Textarea
              placeholder="Offer / product description (optional — helps AI generate better scripts)..."
              value={offerDescription}
              onChange={(e) => setOfferDescription(e.target.value)}
              className="min-h-[80px] text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateProject}
                disabled={!projectName.trim() || createProject.isPending}
              >
                {createProject.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation */}
      <AlertDialog open={!!deletingProjectId} onOpenChange={() => setDeletingProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will permanently delete this project and all its assets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={async () => {
                if (!deletingProjectId) return;
                try {
                  await deleteProject.mutateAsync(deletingProjectId);
                  toast.success('Project deleted');
                } catch {
                  toast.error('Failed to delete project');
                }
                setDeletingProjectId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Avatar Dialog */}
      <CreateAvatarDialog
        open={avatarDialogOpen}
        onOpenChange={setAvatarDialogOpen}
        clientId={client.id}
      />

      {/* Avatar Detail Dialog */}
      {selectedAvatar && (
        <AvatarDetailDialog
          avatar={selectedAvatar}
          open={!!selectedAvatar}
          onOpenChange={(open) => !open && setSelectedAvatar(null)}
          clients={[{ id: client.id, name: client.name }]}
        />
      )}

      {/* Edit Client Form */}
      <ClientForm
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        client={client}
        onSubmit={async (data) => {
          try {
            await updateClient.mutateAsync({ id: client.id, ...data });
            toast.success('Client updated');
            setEditFormOpen(false);
          } catch { toast.error('Failed to update client'); }
        }}
        isLoading={updateClient.isPending}
      />
    </div>
  );
}
