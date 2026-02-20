import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Building2 } from 'lucide-react';
import { useAgencyMembers, AgencyMember } from '@/hooks/useTasks';
import { useAgencyPods, AgencyPod } from '@/hooks/useAgencyPods';
import { cn } from '@/lib/utils';

interface MentionOption {
  id: string;
  name: string;
  type: 'member' | 'pod';
  color?: string | null;
  podName?: string;
  memberIds?: string[]; // for pod: all member IDs in that pod
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  onInput?: (e: React.FormEvent<HTMLTextAreaElement>) => void;
}

export interface ParsedMention {
  name: string;
  type: 'member' | 'pod';
  memberIds: string[]; // IDs to notify
}

// Extract @mentions from text
export function parseMentions(
  text: string,
  members: AgencyMember[],
  pods: AgencyPod[]
): ParsedMention[] {
  const mentionRegex = /@([\w\s]+?)(?=\s@|\s*$|[.,!?;])/gi;
  const matches = [...text.matchAll(mentionRegex)];
  const mentions: ParsedMention[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const name = match[1].trim().toLowerCase();
    if (seen.has(name)) continue;

    // Check pods first (e.g., "@Creatives Team")
    const podMatch = pods.find(
      p => p.name.toLowerCase() === name || `${p.name.toLowerCase()} team` === name
    );
    if (podMatch) {
      const podMemberIds = members
        .filter(m => m.pod_id === podMatch.id)
        .map(m => m.id);
      mentions.push({ name: podMatch.name, type: 'pod', memberIds: podMemberIds });
      seen.add(name);
      continue;
    }

    // Check members
    const memberMatch = members.find(m => m.name.toLowerCase() === name);
    if (memberMatch) {
      mentions.push({ name: memberMatch.name, type: 'member', memberIds: [memberMatch.id] });
      seen.add(name);
    }
  }

  return mentions;
}

export function MentionTextarea({
  value,
  onChange,
  onKeyDown,
  onPaste,
  placeholder,
  className,
  rows,
  onInput,
}: MentionTextareaProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: agencyMembers = [] } = useAgencyMembers();
  const { data: pods = [] } = useAgencyPods();

  const options = useMemo<MentionOption[]>(() => {
    const podOptions: MentionOption[] = pods.map(pod => ({
      id: `pod-${pod.id}`,
      name: `${pod.name} Team`,
      type: 'pod',
      color: pod.color,
      memberIds: agencyMembers.filter(m => m.pod_id === pod.id).map(m => m.id),
    }));

    const memberOptions: MentionOption[] = agencyMembers.map(member => ({
      id: `member-${member.id}`,
      name: member.name,
      type: 'member',
      color: member.pod?.color,
      podName: member.pod?.name,
    }));

    return [...podOptions, ...memberOptions];
  }, [agencyMembers, pods]);

  const filteredOptions = useMemo(() => {
    if (!mentionQuery) return options;
    const q = mentionQuery.toLowerCase();
    return options.filter(o => o.name.toLowerCase().includes(q));
  }, [options, mentionQuery]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredOptions.length]);

  const insertMention = useCallback((option: MentionOption) => {
    if (mentionStartPos === null) return;
    const before = value.slice(0, mentionStartPos);
    const after = value.slice(textareaRef.current?.selectionStart ?? value.length);
    const newValue = `${before}@${option.name} ${after}`;
    onChange(newValue);
    setShowDropdown(false);
    setMentionQuery('');
    setMentionStartPos(null);

    // Focus back and set cursor
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const cursorPos = before.length + option.name.length + 2; // +2 for @ and space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    });
  }, [mentionStartPos, value, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;
    // Find if we're in a mention context
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt !== -1) {
      // Check if there's a space before @ or it's the start
      const charBefore = lastAt > 0 ? textBeforeCursor[lastAt - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || lastAt === 0) {
        const query = textBeforeCursor.slice(lastAt + 1);
        // No newlines in the query
        if (!query.includes('\n')) {
          setMentionQuery(query);
          setMentionStartPos(lastAt);
          setShowDropdown(true);
          return;
        }
      }
    }

    setShowDropdown(false);
    setMentionQuery('');
    setMentionStartPos(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && filteredOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % filteredOptions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + filteredOptions.length) % filteredOptions.length);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        insertMention(filteredOptions[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredOptions[selectedIndex]);
        return;
      }
    }

    onKeyDown?.(e);
  };

  return (
    <div className="relative flex-1">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={onPaste}
        placeholder={placeholder}
        className={className}
        rows={rows}
        onInput={onInput}
        onBlur={() => {
          // Delay to allow click on dropdown
          setTimeout(() => setShowDropdown(false), 200);
        }}
      />

      {showDropdown && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
        >
          <ScrollArea className="max-h-48">
            <div className="p-1">
              {filteredOptions.map((option, index) => (
                <div
                  key={option.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(option);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {option.type === 'pod' ? (
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  {option.color && (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <span className="font-medium">{option.name}</span>
                  {option.type === 'pod' && (
                    <span className="text-xs text-muted-foreground ml-auto">Team</span>
                  )}
                  {option.podName && (
                    <span className="text-xs text-muted-foreground ml-auto">{option.podName}</span>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
