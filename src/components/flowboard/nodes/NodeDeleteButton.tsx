import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NodeDeleteButtonProps {
  nodeId: string;
  onDelete?: (nodeId: string) => void;
}

export function NodeDeleteButton({ nodeId, onDelete }: NodeDeleteButtonProps) {
  if (!onDelete) return null;

  return (
    <Button
      size="sm"
      variant="ghost"
      className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover/node:opacity-100 transition-opacity text-muted-foreground hover:text-destructive z-10"
      onClick={(e) => {
        e.stopPropagation();
        onDelete(nodeId);
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
