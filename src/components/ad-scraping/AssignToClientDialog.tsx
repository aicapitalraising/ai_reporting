import { useState } from 'react';
import { ScrapedAd } from '@/hooks/useAdScraping';
import { useClients } from '@/hooks/useClients';
import { useAssignAdToClients } from '@/hooks/useAdScraping';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AssignToClientDialogProps {
  ad: ScrapedAd | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignToClientDialog({ ad, open, onOpenChange }: AssignToClientDialogProps) {
  const { data: clients, isLoading } = useClients();
  const assignMutation = useAssignAdToClients();
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (!ad || selectedClientIds.length === 0) {
      toast.error('Select at least one client');
      return;
    }
    try {
      await assignMutation.mutateAsync({
        adId: ad.id,
        clientIds: selectedClientIds,
        notes: notes || undefined,
      });
      const clientNames = clients
        ?.filter((c) => selectedClientIds.includes(c.id))
        .map((c) => c.name)
        .join(', ');
      toast.success(`Ad assigned to ${clientNames}`);
      setSelectedClientIds([]);
      setNotes('');
      onOpenChange(false);
    } catch (err: any) {
      if (err?.message?.includes('duplicate')) {
        toast.error('Ad already assigned to one or more of these clients');
      } else {
        toast.error('Failed to assign ad');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to Client</DialogTitle>
          <DialogDescription>
            {ad && (
              <span>
                Assign <strong className="text-foreground">{ad.company}</strong>'s ad to one or more clients as inspiration.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : clients && clients.length > 0 ? (
              clients.map((client) => (
                <label
                  key={client.id}
                  className="flex items-center gap-3 rounded-lg border border-border/50 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedClientIds.includes(client.id)}
                    onCheckedChange={() => toggleClient(client.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{client.name}</p>
                    {client.description && (
                      <p className="text-xs text-muted-foreground truncate">{client.description}</p>
                    )}
                  </div>
                </label>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No clients found. Create a client first.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Add context about why this ad is relevant…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={selectedClientIds.length === 0 || assignMutation.isPending}>
            {assignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Assign ({selectedClientIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
