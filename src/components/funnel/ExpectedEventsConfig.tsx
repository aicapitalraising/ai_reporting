import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  useExpectedEvents, 
  useAddExpectedEvent, 
  useRemoveExpectedEvent,
  STANDARD_EVENTS,
  PLATFORM_LABELS,
  ExpectedEvent 
} from '@/hooks/useExpectedEvents';

interface ExpectedEventsConfigProps {
  stepId: string;
  isPublicView?: boolean;
}

const PLATFORM_COLORS: Record<string, string> = {
  meta: 'bg-blue-100 text-blue-700 border-blue-200',
  google: 'bg-green-100 text-green-700 border-green-200',
  linkedin: 'bg-sky-100 text-sky-700 border-sky-200',
  tiktok: 'bg-pink-100 text-pink-700 border-pink-200',
};

export function ExpectedEventsConfig({ stepId, isPublicView = false }: ExpectedEventsConfigProps) {
  const { data: expectedEvents = [], isLoading } = useExpectedEvents(stepId);
  const addEvent = useAddExpectedEvent();
  const removeEvent = useRemoveExpectedEvent();
  
  const [platform, setPlatform] = useState<'meta' | 'google' | 'linkedin' | 'tiktok'>('meta');
  const [eventName, setEventName] = useState('');
  const [eventSearchOpen, setEventSearchOpen] = useState(false);
  
  const standardEventsForPlatform = STANDARD_EVENTS[platform] || [];
  
  const handleAddEvent = async () => {
    if (!eventName.trim()) return;
    
    const isCustom = !standardEventsForPlatform.some(
      e => e.toLowerCase() === eventName.toLowerCase()
    );
    
    await addEvent.mutateAsync({
      stepId,
      platform,
      eventName: eventName.trim(),
      isCustom,
    });
    
    setEventName('');
  };
  
  const handleRemoveEvent = async (event: ExpectedEvent) => {
    await removeEvent.mutateAsync({ id: event.id, stepId });
  };
  
  const groupedEvents = expectedEvents.reduce((acc, event) => {
    if (!acc[event.platform]) {
      acc[event.platform] = [];
    }
    acc[event.platform].push(event);
    return acc;
  }, {} as Record<string, ExpectedEvent[]>);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Define which conversion events should be present on this page. 
        The system will verify these during scans.
      </div>
      
      {/* Add Event Form */}
      {!isPublicView && (
        <div className="flex gap-2">
          <Select value={platform} onValueChange={(v) => setPlatform(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="meta">Meta</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover open={eventSearchOpen} onOpenChange={setEventSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="flex-1 justify-start font-normal"
              >
                {eventName || 'Select or type event...'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search events..." 
                  value={eventName}
                  onValueChange={setEventName}
                />
                <CommandList>
                  <CommandEmpty>
                    <div className="p-2 text-sm text-muted-foreground">
                      Press Enter to add "{eventName}" as custom event
                    </div>
                  </CommandEmpty>
                  <CommandGroup heading="Standard Events">
                    {standardEventsForPlatform.map((event) => (
                      <CommandItem
                        key={event}
                        value={event}
                        onSelect={(value) => {
                          setEventName(value);
                          setEventSearchOpen(false);
                        }}
                      >
                        {event}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
          <Button 
            onClick={handleAddEvent}
            disabled={!eventName.trim() || addEvent.isPending}
            size="icon"
          >
            {addEvent.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
      
      {/* Current Expected Events */}
      {expectedEvents.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground bg-muted/50 rounded-lg">
          No expected events configured.
          {!isPublicView && ' Add events above to track conversions.'}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedEvents).map(([plat, events]) => (
            <div key={plat} className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {PLATFORM_LABELS[plat] || plat}
              </div>
              <div className="flex flex-wrap gap-2">
                {events.map((event) => (
                  <Badge
                    key={event.id}
                    variant="outline"
                    className={`${PLATFORM_COLORS[event.platform]} flex items-center gap-1`}
                  >
                    {event.event_name}
                    {event.is_custom && (
                      <span className="text-[10px] opacity-70">(custom)</span>
                    )}
                    {!isPublicView && (
                      <button
                        onClick={() => handleRemoveEvent(event)}
                        className="ml-1 hover:opacity-70"
                        disabled={removeEvent.isPending}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
