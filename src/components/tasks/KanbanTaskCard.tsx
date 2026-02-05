import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar as CalendarIcon,
  Paperclip,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Task, AgencyMember, useUpdateTask, useTaskFiles } from '@/hooks/useTasks';
import { format, isToday, isPast, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface KanbanTaskCardProps {
  task: Task;
  clientName?: string;
  assignee?: AgencyMember;
  onClick?: () => void;
  isDragging?: boolean;
  isPublicView?: boolean;
   isSelected?: boolean;
   onSelectChange?: (selected: boolean) => void;
}

export function KanbanTaskCard({ 
  task, 
  clientName, 
  assignee,
  onClick,
  isDragging,
  isPublicView = false,
   isSelected = false,
   onSelectChange,
}: KanbanTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const updateTask = useUpdateTask();
  const { data: files = [] } = useTaskFiles(task.id);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'completed';
  const isDueToday = task.due_date && isToday(new Date(task.due_date));
  const isCompleted = task.stage === 'done' || task.status === 'completed';
  const isSelectionMode = !!onSelectChange;

  const handleCheckboxChange = async (checked: boolean) => {
    await updateTask.mutateAsync({
      id: task.id,
      stage: checked ? 'done' : 'todo',
      status: checked ? 'completed' : 'todo',
      completed_at: checked ? new Date().toISOString() : null,
    });
  };

   const handleSelectionChange = (checked: boolean) => {
     if (onSelectChange) {
       onSelectChange(checked);
     }
   };
 
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200',
        // Base styling
        'bg-card border shadow-sm',
        // Default hover - subtle lift
        !isSelected && !isCompleted && 'hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30',
        // Dragging state
        (isDragging || isSortableDragging) && 'opacity-60 shadow-xl rotate-1 scale-105',
        // Overdue styling
        isOverdue && !isCompleted && 'border-destructive/40 bg-destructive/5',
        // Completed styling - subtle, elegant strike-through effect
        isCompleted && 'bg-muted/40 border-border/50',
        // Selection styling - clean primary ring
        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary shadow-md'
      )}
    >
      {/* Selection/Completion Checkbox */}
      <div 
        className={cn(
          'absolute -left-1.5 top-3 z-10 transition-all duration-200',
          // Show checkbox on hover, when selected, when completed, or in selection mode
          isSelectionMode || isSelected || isCompleted 
            ? 'opacity-100 scale-100' 
            : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className={cn(
            'flex items-center justify-center w-5 h-5 rounded-full shadow-sm transition-all duration-200 cursor-pointer',
            // Completed state
            isCompleted && !isSelectionMode && 'bg-success text-success-foreground',
            // Selected state in selection mode
            isSelected && isSelectionMode && 'bg-primary text-primary-foreground',
            // Default unchecked state
            !isCompleted && !isSelected && 'bg-background border-2 border-border hover:border-primary/50'
          )}
          onClick={() => {
            if (isSelectionMode) {
              handleSelectionChange(!isSelected);
            } else {
              handleCheckboxChange(!isCompleted);
            }
          }}
        >
          {(isCompleted || isSelected) && (
            <Check className="h-3 w-3" strokeWidth={3} />
          )}
        </div>
      </div>

      <div onClick={onClick} className={cn(isCompleted && 'opacity-60')}>
        {/* Priority Badge & Client Tag */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <Badge 
            variant={getPriorityColor(task.priority)} 
            className={cn(
              'text-xs uppercase font-medium',
              isCompleted && 'opacity-50'
            )}
          >
            {task.priority}
          </Badge>
          <div className="flex items-center gap-1.5">
            {files.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-0.5 text-muted-foreground/70">
                      <Paperclip className="h-3 w-3" />
                      <span className="text-xs">{files.length}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{files.length} file{files.length > 1 ? 's' : ''} attached</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {clientName && (
              <span className="text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded truncate max-w-20">
                {clientName}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h4 className={cn(
          'font-medium text-sm mb-2 line-clamp-2 transition-colors',
          isCompleted && 'line-through text-muted-foreground'
        )}>
          {task.title}
        </h4>

        {/* Description Preview */}
        {task.description && (
          <p className={cn(
            'text-xs text-muted-foreground line-clamp-2 mb-3',
            isCompleted && 'opacity-70'
          )}>
            {task.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          {/* Due Date */}
          {task.due_date && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium',
              isOverdue && !isCompleted && 'text-destructive',
              isDueToday && !isCompleted && 'text-amber-600 dark:text-amber-400',
              isCompleted && 'text-muted-foreground line-through'
            )}>
              {isOverdue && !isCompleted && <AlertTriangle className="h-3 w-3" />}
              <CalendarIcon className="h-3 w-3" />
              <span>{format(new Date(task.due_date), 'MMM d')}</span>
            </div>
          )}
          
          {/* Assignee */}
          {assignee && (
            <div className="flex items-center gap-1">
              {isPublicView ? (
                <Badge 
                  variant="outline" 
                  className="text-xs font-normal border-border/60"
                  style={assignee.pod?.color ? { 
                    backgroundColor: `${assignee.pod.color}15`,
                    borderColor: `${assignee.pod.color}40`,
                    color: assignee.pod.color
                  } : undefined}
                >
                  {assignee.pod?.name ? `${assignee.pod.name}` : 'Team'}
                </Badge>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-6 w-6 border border-border/50">
                        <AvatarFallback className="text-[10px] font-medium bg-muted/80 text-muted-foreground">
                          {(assignee.name || 'N/A').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{assignee.name || 'Unassigned'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
          
          {!task.due_date && !assignee && <div className="flex-1" />}
        </div>
      </div>

      {/* Completed overlay indicator */}
      {isCompleted && (
        <div className="absolute top-2 right-2">
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-success/20 text-success">
            <Check className="h-3 w-3" strokeWidth={3} />
          </div>
        </div>
      )}
    </div>
  );
}
