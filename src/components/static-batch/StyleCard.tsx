import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Images } from 'lucide-react';
import type { AdStyle } from '@/types';
import { cn } from '@/lib/utils';

interface StyleCardProps {
  style: AdStyle;
  isSelected: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  clientId?: string;
}

export function StyleCard({ style, isSelected, onToggle, onDelete }: StyleCardProps) {
  const refCount = style.reference_images?.length || 0;

  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onToggle}
    >
      {/* Preview area - show first reference or placeholder */}
      <div className="relative h-32 bg-muted rounded-t-lg overflow-hidden">
        {style.example_image_url ? (
          <img
            src={style.example_image_url}
            alt={`${style.name} reference`}
            className="w-full h-full object-cover"
          />
        ) : refCount > 0 ? (
          <img
            src={style.reference_images![0]}
            alt={`${style.name} reference`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
            <Images className="h-8 w-8" />
          </div>
        )}
        {refCount > 0 && (
          <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] gap-1">
            <Images className="h-3 w-3" />
            {refCount}
          </Badge>
        )}
      </div>

      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm truncate">{style.name}</h4>
              {style.is_default && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                  Default
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {style.description}
            </p>
          </div>
          {!style.is_default && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
