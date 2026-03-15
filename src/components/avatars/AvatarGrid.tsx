import { AvatarCard } from './AvatarCard';
import type { Avatar } from '@/types';

interface AvatarGridProps {
  avatars: Avatar[];
  clients: { id: string; name: string }[];
  onDelete?: (avatar: Avatar) => void;
  onFavorite?: (avatar: Avatar) => void;
  onClick?: (avatar: Avatar) => void;
  onPreviewSpeaking?: (avatar: Avatar) => void;
  onGenerateLook?: (avatar: Avatar) => void;
  favorites?: Set<string>;
}

export function AvatarGrid({
  avatars,
  clients,
  onDelete,
  onFavorite,
  onClick,
  onPreviewSpeaking,
  onGenerateLook,
  favorites = new Set(),
}: AvatarGridProps) {
  const getClientName = (clientId?: string | null) => {
    if (!clientId) return undefined;
    return clients.find((c) => c.id === clientId)?.name;
  };

  if (avatars.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {avatars.map((avatar) => (
        <AvatarCard
          key={avatar.id}
          avatar={avatar}
          clientName={getClientName(avatar.client_id)}
          onDelete={onDelete}
          onFavorite={onFavorite}
          onClick={onClick}
          onPreviewSpeaking={onPreviewSpeaking}
          onGenerateLook={onGenerateLook}
          isFavorite={favorites.has(avatar.id)}
        />
      ))}
    </div>
  );
}
