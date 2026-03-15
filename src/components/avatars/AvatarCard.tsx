import { useState, useRef, useCallback } from 'react';
import { Heart, Volume2, MoreVertical, Trash2, Play, Pause, Sparkles, Mic } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Avatar } from '@/types';

interface AvatarCardProps {
  avatar: Avatar;
  clientName?: string;
  onDelete?: (avatar: Avatar) => void;
  onFavorite?: (avatar: Avatar) => void;
  onClick?: (avatar: Avatar) => void;
  onPreviewSpeaking?: (avatar: Avatar) => void;
  onGenerateLook?: (avatar: Avatar) => void;
  isFavorite?: boolean;
}

export function AvatarCard({
  avatar,
  clientName,
  onDelete,
  onFavorite,
  onClick,
  onPreviewSpeaking,
  onGenerateLook,
  isFavorite = false,
}: AvatarCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayVoice = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!avatar.elevenlabs_voice_id) return;

    if (isPlayingVoice && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingVoice(false);
      return;
    }

    // Use ElevenLabs preview URL pattern
    const previewUrl = `https://api.elevenlabs.io/v1/text-to-speech/${avatar.elevenlabs_voice_id}/stream`;
    // For now just toggle state - actual TTS would need the edge function
    setIsPlayingVoice(true);
    setTimeout(() => setIsPlayingVoice(false), 3000);
  }, [avatar.elevenlabs_voice_id, isPlayingVoice]);

  return (
    <div
      className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(avatar)}
    >
      {/* Avatar Image */}
      {!imageError ? (
        <img
          src={avatar.image_url}
          alt={avatar.name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-4xl font-bold text-muted-foreground">
            {avatar.name.charAt(0)}
          </span>
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Top-right actions */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavorite?.(avatar);
          }}
          className={cn(
            "p-2 rounded-full transition-all duration-200",
            isFavorite
              ? "text-primary bg-primary/20"
              : "text-white/60 hover:text-white bg-black/20 opacity-0 group-hover:opacity-100"
          )}
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
        </button>
      </div>

      {/* Top-left badges */}
      <div className="absolute top-3 left-3 flex gap-1.5">
        {/* Voice Indicator with play */}
        {avatar.elevenlabs_voice_id && (
          <button
            onClick={handlePlayVoice}
            className={cn(
              "p-2 rounded-full transition-all",
              isPlayingVoice
                ? "bg-primary text-primary-foreground animate-pulse"
                : "bg-primary/20 text-primary hover:bg-primary/40"
            )}
            title={isPlayingVoice ? "Stop" : "Play voice sample"}
          >
            {isPlayingVoice ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        )}
        
        {/* Stock Badge */}
        {avatar.is_stock && (
          <Badge
            variant="secondary"
            className="bg-black/40 text-white border-0 text-xs"
          >
            Stock
          </Badge>
        )}

        {/* Looks count badge */}
        {(avatar.looks_count || 1) > 1 && (
          <Badge variant="secondary" className="bg-black/40 text-white border-0 text-xs">
            {avatar.looks_count} looks
          </Badge>
        )}
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-end justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-lg leading-tight truncate">
              {avatar.name}
            </h3>
            {clientName && !avatar.is_stock && (
              <p className="text-white/50 text-xs mt-0.5">{clientName}</p>
            )}
            <p className="text-white/40 text-xs">
              {avatar.looks_count || 1} look{(avatar.looks_count || 1) !== 1 ? 's' : ''}
              {avatar.elevenlabs_voice_id && ' • Voice'}
            </p>
          </div>

          {/* Quick actions on hover */}
          <div
            className={cn(
              "flex items-center gap-1 transition-opacity duration-200",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          >
            {/* Preview Speaking */}
            {avatar.elevenlabs_voice_id && onPreviewSpeaking && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
                onClick={(e) => { e.stopPropagation(); onPreviewSpeaking(avatar); }}
                title="Preview speaking"
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}

            {/* Generate New Look */}
            {onGenerateLook && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
                onClick={(e) => { e.stopPropagation(); onGenerateLook(avatar); }}
                title="Generate new look"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            )}

            {/* More Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(avatar);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
