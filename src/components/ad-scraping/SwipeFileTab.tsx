import { useState, useMemo } from 'react';
import { useSwipeFile, useUpdateSwipeItem, useRemoveFromSwipeFile, type SwipeFileItem } from '@/hooks/useSwipeFile';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Star, Trash2, Search, Tag, Edit2, ExternalLink, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const SUGGESTED_TAGS = ['great hook', 'strong CTA', 'good design', 'social proof', 'urgency', 'storytelling', 'humor', 'emotional'];

export function SwipeFileTab() {
  const { data: items = [], isLoading } = useSwipeFile();
  const { data: clients = [] } = useClients();
  const updateItem = useUpdateSwipeItem();
  const removeItem = useRemoveFromSwipeFile();

  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [editItem, setEditItem] = useState<SwipeFileItem | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [newTag, setNewTag] = useState('');

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach(i => (i.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(item => {
      const ad = item.scraped_ads;
      const video = item.viral_videos;
      const title = ad?.headline || ad?.company || video?.title || '';
      const platform = ad?.platform || video?.platform || '';

      if (search) {
        const q = search.toLowerCase();
        if (!title.toLowerCase().includes(q) && !(item.notes || '').toLowerCase().includes(q) && !(item.tags || []).some(t => t.toLowerCase().includes(q))) return false;
      }
      if (tagFilter !== 'all' && !(item.tags || []).includes(tagFilter)) return false;
      if (platformFilter !== 'all' && platform !== platformFilter) return false;
      if (clientFilter !== 'all' && item.client_id !== clientFilter) return false;
      return true;
    });
  }, [items, search, tagFilter, platformFilter, clientFilter]);

  const openEdit = (item: SwipeFileItem) => {
    setEditItem(item);
    setEditTags(item.tags || []);
    setEditNotes(item.notes || '');
    setNewTag('');
  };

  const saveEdit = () => {
    if (!editItem) return;
    updateItem.mutate({ id: editItem.id, tags: editTags, notes: editNotes }, {
      onSuccess: () => { toast.success('Updated'); setEditItem(null); },
    });
  };

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !editTags.includes(t)) setEditTags([...editTags, t]);
    setNewTag('');
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search swipe file…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-[150px] h-9"><Tag className="h-3 w-3 mr-1" /><SelectValue placeholder="All Tags" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="All Platforms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'YouTube'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="All Clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs">{filtered.length} saved</Badge>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Star className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No saved items yet</p>
          <p className="text-sm mt-1">Star ads or viral videos to save them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(item => {
            const ad = item.scraped_ads;
            const video = item.viral_videos;
            const title = ad?.headline || ad?.company || video?.title || 'Untitled';
            const imageUrl = ad?.image_url || video?.thumbnail_url;
            const platform = ad?.platform || video?.platform || '';
            const sourceUrl = ad?.source_url || video?.source_url;

            return (
              <div key={item.id} className="group rounded-lg border border-border bg-card overflow-hidden">
                {/* Image */}
                {imageUrl && (
                  <div className="relative w-full bg-muted/30">
                    <img src={imageUrl} alt={title} className="w-full object-cover aspect-video max-h-[200px]" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="absolute top-2 right-2">
                      <Badge variant="outline" className="bg-background/80 text-[10px]">{platform}</Badge>
                    </div>
                  </div>
                )}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold line-clamp-2">{title}</p>
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
                  </div>
                  {item.notes && <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>}
                  {(item.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {sourceUrl && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                          <a href={sourceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem.mutate(item.id, { onSuccess: () => toast.success('Removed from swipe file') })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={open => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Swipe File Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {editTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button onClick={() => setEditTags(editTags.filter(t => t !== tag))} className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add custom tag…" className="flex-1" onKeyDown={e => e.key === 'Enter' && addTag(newTag)} />
                <Button size="sm" variant="outline" onClick={() => addTag(newTag)}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {SUGGESTED_TAGS.filter(t => !editTags.includes(t)).map(tag => (
                  <Badge key={tag} variant="outline" className="cursor-pointer text-[10px] hover:bg-primary hover:text-primary-foreground" onClick={() => addTag(tag)}>
                    + {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Add notes about this ad…" rows={3} />
            </div>
            <Button onClick={saveEdit} disabled={updateItem.isPending} className="w-full">
              {updateItem.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
