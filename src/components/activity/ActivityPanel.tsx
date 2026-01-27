import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle2,
  PlusCircle,
  ThumbsUp,
  Clock,
  Video,
  Filter,
  CheckSquare,
  Mic,
  Activity,
  Trash2,
  ClipboardCheck,
} from 'lucide-react';
import { Task } from '@/hooks/useTasks';
import { VoiceNote } from '@/hooks/useVoiceNotes';
import { Meeting } from '@/hooks/useMeetings';
import { cn } from '@/lib/utils';

interface ActivityPanelProps {
  tasks: Task[];
  voiceNotes?: VoiceNote[];
  meetings?: Meeting[];
  isPublicView?: boolean;
  onDeleteActivity?: (activityId: string, type: string) => void;
}

type ActivityType = 'task_created' | 'task_completed' | 'task_ready_for_review' | 'meeting_synced' | 'voice_note_recorded';

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  timestamp: Date;
  metadata?: {
    priority?: string;
    summary?: string;
    duration?: number;
  };
}

const ACTIVITY_CONFIG: Record<ActivityType, { icon: typeof CheckCircle2; label: string; color: string }> = {
  task_created: { icon: PlusCircle, label: 'Task Created', color: 'text-blue-500' },
  task_completed: { icon: CheckCircle2, label: 'Task Completed', color: 'text-green-500' },
  task_ready_for_review: { icon: ClipboardCheck, label: 'Ready for Review', color: 'text-amber-500' },
  meeting_synced: { icon: Video, label: 'Meeting Summary', color: 'text-indigo-500' },
  voice_note_recorded: { icon: Mic, label: 'Voice Note', color: 'text-pink-500' },
};

export function ActivityPanel({ 
  tasks, 
  voiceNotes = [], 
  meetings = [],
  isPublicView = false,
  onDeleteActivity,
}: ActivityPanelProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<Set<ActivityType>>(new Set());

  // Build unified activity list (excluding detailed records items)
  const activities = useMemo(() => {
    const items: ActivityItem[] = [];

    // Task activities
    tasks.forEach(task => {
      // Task created
      items.push({
        id: `task-created-${task.id}`,
        type: 'task_created',
        title: task.title,
        timestamp: new Date(task.created_at),
        metadata: { priority: task.priority },
      });

      // Task completed
      if (task.completed_at) {
        items.push({
          id: `task-completed-${task.id}`,
          type: 'task_completed',
          title: task.title,
          timestamp: new Date(task.completed_at),
          metadata: { priority: task.priority },
        });
      }

      // Task ready for review (stage = Review)
      if (task.stage === 'Review') {
        items.push({
          id: `task-review-${task.id}`,
          type: 'task_ready_for_review',
          title: task.title,
          timestamp: new Date(task.updated_at),
          metadata: { priority: task.priority },
        });
      }
    });

    // Meeting activities (summaries)
    meetings.forEach(meeting => {
      items.push({
        id: `meeting-${meeting.id}`,
        type: 'meeting_synced',
        title: meeting.title,
        timestamp: new Date(meeting.meeting_date || meeting.created_at),
        metadata: { 
          summary: meeting.summary || undefined,
          duration: meeting.duration_minutes || undefined,
        },
      });
    });

    // Voice note activities
    voiceNotes.forEach(note => {
      items.push({
        id: `voice-note-${note.id}`,
        type: 'voice_note_recorded',
        title: note.title,
        timestamp: new Date(note.created_at),
        metadata: { 
          summary: note.summary || undefined,
        },
      });
    });

    // Sort by timestamp descending
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return items;
  }, [tasks, meetings, voiceNotes]);

  // Apply filters
  const filteredActivities = useMemo(() => {
    if (filters.size === 0) return activities;
    return activities.filter(a => filters.has(a.type));
  }, [activities, filters]);

  const toggleFilter = (type: ActivityType) => {
    const newFilters = new Set(filters);
    if (newFilters.has(type)) {
      newFilters.delete(type);
    } else {
      newFilters.add(type);
    }
    setFilters(newFilters);
  };

  const handleDelete = (activity: ActivityItem) => {
    if (onDeleteActivity) {
      // Extract the actual ID from the activity ID (remove prefix)
      const actualId = activity.id.split('-').slice(2).join('-') || activity.id.split('-')[1];
      onDeleteActivity(actualId, activity.type);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Activity className="h-4 w-4 mr-2" />
          Activity
          {activities.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              {activities.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Feed
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Filter toolbar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredActivities.length} activities
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                  {filters.size > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {filters.size}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.entries(ACTIVITY_CONFIG).map(([type, config]) => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={filters.has(type as ActivityType)}
                    onCheckedChange={() => toggleFilter(type as ActivityType)}
                  >
                    <config.icon className={cn('h-4 w-4 mr-2', config.color)} />
                    {config.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Activity list */}
          {filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs mt-1">Tasks and meeting updates will appear here</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-1 pr-4">
                {filteredActivities.map((activity) => {
                  const config = ACTIVITY_CONFIG[activity.type];
                  const Icon = config.icon;

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 py-3 border-b border-border last:border-0 group"
                    >
                      <div className={cn('mt-0.5 flex-shrink-0', config.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {config.label}
                          </span>
                          {activity.metadata?.duration && (
                            <Badge variant="secondary" className="text-xs h-5">
                              {activity.metadata.duration} min
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate mt-0.5">
                          {activity.title}
                        </p>
                        {activity.metadata?.summary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {activity.metadata.summary}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                        </span>
                        {/* Only show delete for agency (non-public) view */}
                        {!isPublicView && onDeleteActivity && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(activity)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
