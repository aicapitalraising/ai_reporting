import { Smartphone, Tablet, Monitor } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type DeviceType = 'phone' | 'tablet' | 'desktop';

interface DeviceSwitcherProps {
  value: DeviceType;
  onChange: (value: DeviceType) => void;
}

export function DeviceSwitcher({ value, onChange }: DeviceSwitcherProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as DeviceType)}
      className="border rounded-lg p-1"
    >
      <ToggleGroupItem value="phone" aria-label="Phone preview" className="gap-2 px-3">
        <Smartphone className="h-4 w-4" />
        <span className="hidden sm:inline text-sm">Phone</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="tablet" aria-label="Tablet preview" className="gap-2 px-3">
        <Tablet className="h-4 w-4" />
        <span className="hidden sm:inline text-sm">Tablet</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="desktop" aria-label="Desktop preview" className="gap-2 px-3">
        <Monitor className="h-4 w-4" />
        <span className="hidden sm:inline text-sm">Desktop</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
