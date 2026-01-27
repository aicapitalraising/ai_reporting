import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit2, ExternalLink, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { IPhoneMockup } from './IPhoneMockup';
import { TabletMockup } from './TabletMockup';
import { DesktopMockup } from './DesktopMockup';
import type { DeviceType } from './DeviceSwitcher';
import type { FunnelStep } from '@/hooks/useFunnelSteps';

interface SortableFunnelStepProps {
  step: FunnelStep;
  index: number;
  deviceType: DeviceType;
  isPublicView: boolean;
  isEditing: boolean;
  editName: string;
  editUrl: string;
  onEditNameChange: (value: string) => void;
  onEditUrlChange: (value: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

export function SortableFunnelStep({
  step,
  index,
  deviceType,
  isPublicView,
  isEditing,
  editName,
  editUrl,
  onEditNameChange,
  onEditUrlChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: SortableFunnelStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderMockup = () => {
    switch (deviceType) {
      case 'tablet':
        return <TabletMockup url={step.url} />;
      case 'desktop':
        return <DesktopMockup url={step.url} />;
      default:
        return <IPhoneMockup url={step.url} />;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col">
      {/* Step Header */}
      <div className="flex items-center justify-between mb-3">
        {isEditing ? (
          <div className="flex-1 space-y-2">
            <Input
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              placeholder="Step name"
              className="h-8"
            />
            <Input
              value={editUrl}
              onChange={(e) => onEditUrlChange(e.target.value)}
              placeholder="URL"
              className="h-8"
            />
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={onSaveEdit}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {!isPublicView && (
                <button
                  {...attributes}
                  {...listeners}
                  className="cursor-grab hover:bg-accent rounded p-1 touch-none"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {index + 1}
              </span>
              <span className="font-medium">{step.name}</span>
            </div>
            {!isPublicView && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onStartEdit}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <a
                  href={step.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-accent rounded"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Funnel Step?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove "{step.name}" from the funnel. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Device Mockup */}
      {renderMockup()}
    </div>
  );
}
