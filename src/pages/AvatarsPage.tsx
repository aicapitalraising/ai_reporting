import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Search, Loader2, User, Users, Sparkles } from 'lucide-react';
import { useAllAvatars, useDeleteAvatar } from '@/hooks/useAvatars';
import { useClients } from '@/hooks/useClients';
import { CreateAvatarDialog } from '@/components/avatars/CreateAvatarDialog';
import { AvatarDetailDialog } from '@/components/avatars/AvatarDetailDialog';
import { BatchGenerateDialog } from '@/components/avatars/BatchGenerateDialog';
import { AvatarGrid } from '@/components/avatars/AvatarGrid';
import { AvatarSpeakingPreview } from '@/components/avatars/AvatarSpeakingPreview';
import { GenerateLookDialog } from '@/components/avatars/GenerateLookDialog';
import { toast } from 'sonner';
import type { Avatar } from '@/types';

export default function AvatarsPage() {
  const { data: avatars = [], isLoading } = useAllAvatars();
  const { data: clients = [] } = useClients();
  const deleteAvatar = useDeleteAvatar();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<Avatar | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [speakingAvatar, setSpeakingAvatar] = useState<Avatar | null>(null);
  const [lookGenAvatar, setLookGenAvatar] = useState<Avatar | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const filteredAvatars = avatars.filter((avatar) => {
    const matchesSearch =
      avatar.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      avatar.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClient =
      filterClient === 'all' ||
      (filterClient === 'stock' && avatar.is_stock) ||
      (filterClient === 'unassigned' && !avatar.client_id && !avatar.is_stock) ||
      avatar.client_id === filterClient;

    const matchesType =
      filterType === 'all' ||
      (filterType === 'stock' && avatar.is_stock) ||
      (filterType === 'custom' && !avatar.is_stock);

    return matchesSearch && matchesClient && matchesType;
  });

  const stockAvatars = filteredAvatars.filter((a) => a.is_stock);
  const clientAvatars = filteredAvatars.filter((a) => !a.is_stock);

  const handleCreateClick = (clientId?: string) => {
    setSelectedClientId(clientId);
    setCreateDialogOpen(true);
  };

  const handleDelete = async (avatar: Avatar) => {
    try {
      await deleteAvatar.mutateAsync(avatar.id);
      setDeleteConfirm(null);
      toast.success('Avatar deleted');
    } catch {
      toast.error('Failed to delete avatar');
    }
  };

  const handleFavorite = (avatar: Avatar) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(avatar.id)) {
        next.delete(avatar.id);
      } else {
        next.add(avatar.id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Avatars</h1>
            <p className="text-muted-foreground">
              Hyper-realistic spokespeople for your video ads
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBatchDialogOpen(true)} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Batch Generate
            </Button>
            <Select
              value={selectedClientId || ''}
              onValueChange={(v) => handleCreateClick(v || undefined)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Create for client..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">Stock Avatar (All Clients)</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => handleCreateClick()}>
              <Plus className="h-4 w-4 mr-2" />
              New Avatar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search avatars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="stock">Stock Only</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {/* Stats */}
          <div className="flex gap-4 ml-auto text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{avatars.length} total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span>{stockAvatars.length} stock</span>
            </div>
          </div>
        </div>

        {/* Stock Avatars Section */}
        {(filterType === 'all' || filterType === 'stock') && stockAvatars.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Stock Avatars
              <Badge variant="secondary">{stockAvatars.length}</Badge>
            </h2>
            <AvatarGrid
              avatars={stockAvatars}
              clients={clients}
              onDelete={(avatar) => setDeleteConfirm(avatar)}
              onFavorite={handleFavorite}
              onClick={(avatar) => setSelectedAvatar(avatar)}
              onPreviewSpeaking={(avatar) => setSpeakingAvatar(avatar)}
              onGenerateLook={(avatar) => setLookGenAvatar(avatar)}
              favorites={favorites}
            />
          </div>
        )}

        {/* Client Avatars Section */}
        {(filterType === 'all' || filterType === 'custom') && clientAvatars.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Client Avatars
              <Badge variant="outline">{clientAvatars.length}</Badge>
            </h2>
            <AvatarGrid
              avatars={clientAvatars}
              clients={clients}
              onDelete={(avatar) => setDeleteConfirm(avatar)}
              onFavorite={handleFavorite}
              onClick={(avatar) => setSelectedAvatar(avatar)}
              onPreviewSpeaking={(avatar) => setSpeakingAvatar(avatar)}
              onGenerateLook={(avatar) => setLookGenAvatar(avatar)}
              favorites={favorites}
            />
          </div>
        )}

        {/* Empty State */}
        {filteredAvatars.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No avatars found</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {searchQuery || filterClient !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create hyper-realistic avatars for your video ads'}
            </p>
            <Button onClick={() => handleCreateClick()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Avatar
            </Button>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <CreateAvatarDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clientId={selectedClientId}
        isStock={selectedClientId === 'stock'}
      />

      {/* Batch Generate Dialog */}
      <BatchGenerateDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        isStock={true}
      />

      {/* Speaking Preview */}
      <AvatarSpeakingPreview
        avatar={speakingAvatar}
        open={!!speakingAvatar}
        onOpenChange={(open) => !open && setSpeakingAvatar(null)}
      />

      {/* Detail Dialog */}
      <AvatarDetailDialog
        avatar={selectedAvatar}
        open={!!selectedAvatar}
        onOpenChange={(open) => !open && setSelectedAvatar(null)}
        clients={clients}
      />

      {/* Generate Look Dialog */}
      <GenerateLookDialog
        avatar={lookGenAvatar}
        open={!!lookGenAvatar}
        onOpenChange={(open) => !open && setLookGenAvatar(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Avatar</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
