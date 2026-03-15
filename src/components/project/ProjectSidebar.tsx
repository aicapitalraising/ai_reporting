import { cn } from '@/lib/utils';
import { 
  LayoutGrid, 
  Settings, 
  Palette, 
  Info,
  ChevronRight,
  ChevronDown,
  History,
  Video,
  Image,
  Film,
  GitBranch,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

export type ProjectView = 'creator' | 'style-manager' | 'style-info' | 'history';

interface ProjectSidebarProps {
  projectType: string;
  currentView: ProjectView;
  onViewChange: (view: ProjectView) => void;
}

const builderLinks = [
  { type: 'batch_video', label: 'Batch Video', icon: Video },
  { type: 'static_batch', label: 'Static Batch', icon: Image },
  { type: 'broll', label: 'B-Roll Library', icon: Film },
  { type: 'flowboard', label: 'Flowboard', icon: GitBranch },
];

export function ProjectSidebar({ projectType, currentView, onViewChange }: ProjectSidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();

  const isStaticOrVideo = projectType === 'static_batch' || projectType === 'video_batch';
  const typeLabel = projectType === 'static_batch' ? 'Static' : 'Video';

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card/50 p-4 space-y-4">
      {/* Main View */}
      <div className="space-y-1">
        <Button
          variant={currentView === 'creator' ? 'secondary' : 'ghost'}
          className={cn(
            'w-full justify-start gap-2',
            currentView === 'creator' && 'bg-primary/10 text-primary'
          )}
          onClick={() => onViewChange('creator')}
        >
          <LayoutGrid className="h-4 w-4" />
          {typeLabel} Creator
        </Button>

        {/* History */}
        <Button
          variant={currentView === 'history' ? 'secondary' : 'ghost'}
          className={cn(
            'w-full justify-start gap-2',
            currentView === 'history' && 'bg-primary/10 text-primary'
          )}
          onClick={() => onViewChange('history')}
        >
          <History className="h-4 w-4" />
          Project History
        </Button>
      </div>

      {/* Settings Section */}
      {isStaticOrVideo && (
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between gap-2 text-muted-foreground hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </span>
              {settingsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 pt-1 space-y-1">
            <Button
              variant={currentView === 'style-manager' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'w-full justify-start gap-2 text-sm',
                currentView === 'style-manager' && 'bg-primary/10 text-primary'
              )}
              onClick={() => onViewChange('style-manager')}
            >
              <Palette className="h-4 w-4" />
              Manage Styles
            </Button>
            <Button
              variant={currentView === 'style-info' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'w-full justify-start gap-2 text-sm',
                currentView === 'style-info' && 'bg-primary/10 text-primary'
              )}
              onClick={() => onViewChange('style-info')}
            >
              <Info className="h-4 w-4" />
              Style Guide
            </Button>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Quick Links to other builders */}
      {clientId && (
        <>
          <Separator />
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-1.5">
              Quick Links
            </p>
            {builderLinks.map(({ type, label, icon: Icon }) => (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full justify-start gap-2 text-sm text-muted-foreground hover:text-foreground',
                  projectType === type && 'text-primary font-medium'
                )}
                onClick={() => {
                  if (projectType !== type) {
                    // Navigate back to client page so user can create/select a project of that type
                    navigate(`/clients/${clientId}?create=${type}`);
                  }
                }}
                disabled={projectType === type}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
