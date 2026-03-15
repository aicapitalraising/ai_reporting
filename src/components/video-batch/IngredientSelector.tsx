import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Film, Blend, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Avatar } from '@/types';
import type { IngredientType } from '@/types/video';

interface IngredientSelectorProps {
  avatars: Avatar[];
  selectedType: IngredientType;
  selectedAvatarId?: string;
  onTypeChange: (type: IngredientType) => void;
  onAvatarChange: (avatarId: string | undefined) => void;
}

const INGREDIENT_TYPES: { type: IngredientType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    type: 'avatar', 
    label: 'Avatar Only', 
    icon: <User className="h-5 w-5" />,
    description: 'AI spokesperson talking to camera'
  },
  { 
    type: 'broll', 
    label: 'B-Roll Only', 
    icon: <Film className="h-5 w-5" />,
    description: 'Background footage without speaker'
  },
  { 
    type: 'mixed', 
    label: 'Mixed', 
    icon: <Blend className="h-5 w-5" />,
    description: 'Combine avatar with B-roll scenes'
  },
];

export function IngredientSelector({
  avatars,
  selectedType,
  selectedAvatarId,
  onTypeChange,
  onAvatarChange,
}: IngredientSelectorProps) {
  const showAvatarPicker = selectedType === 'avatar' || selectedType === 'mixed';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Ingredients</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type Selection */}
        <div className="space-y-2">
          <Label>Video Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {INGREDIENT_TYPES.map(({ type, label, icon, description }) => (
              <button
                key={type}
                onClick={() => {
                  onTypeChange(type);
                  if (type === 'broll') onAvatarChange(undefined);
                }}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  selectedType === type
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-foreground/30'
                )}
              >
                <div className={cn(
                  'mb-2',
                  selectedType === type ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {icon}
                </div>
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Avatar Picker */}
        {showAvatarPicker && (
          <div className="space-y-2">
            <Label>Select Avatar</Label>
            {avatars.length === 0 ? (
              <div className="p-4 text-center border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">No avatars available</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create avatars in the Avatars section
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[180px]">
                <div className="grid grid-cols-3 gap-2 p-1">
                  {avatars.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => onAvatarChange(avatar.id)}
                      className={cn(
                        'relative rounded-lg overflow-hidden aspect-[3/4] border-2 transition-all',
                        selectedAvatarId === avatar.id
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-transparent hover:border-foreground/30'
                      )}
                    >
                      <img
                        src={avatar.image_url}
                        alt={avatar.name}
                        className="w-full h-full object-cover"
                      />
                      {selectedAvatarId === avatar.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary rounded-full p-1">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="text-xs text-white font-medium truncate">
                          {avatar.name}
                        </p>
                      </div>
                      {avatar.is_stock && (
                        <Badge 
                          variant="secondary" 
                          className="absolute top-1 right-1 text-[10px] px-1"
                        >
                          Stock
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
