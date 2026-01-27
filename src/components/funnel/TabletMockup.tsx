import { cn } from '@/lib/utils';

interface TabletMockupProps {
  url: string;
  title?: string;
  className?: string;
}

export function TabletMockup({ url, title, className }: TabletMockupProps) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      )}
      {/* iPad Frame */}
      <div className="relative bg-foreground rounded-[24px] p-3 shadow-xl">
        {/* Camera */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-muted" />
        
        {/* Screen Container */}
        <div className="relative bg-background rounded-[12px] overflow-hidden" style={{ width: '400px', height: '580px' }}>
          {/* Iframe with scaling */}
          <div className="w-full h-full overflow-hidden">
            <iframe
              src={url}
              title={title || "Tablet Preview"}
              className="border-0 origin-top-left"
              style={{
                width: '820px',
                height: '1180px',
                transform: 'scale(0.49)',
                transformOrigin: 'top left',
              }}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          </div>
        </div>
        
        {/* Home Indicator */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-muted-foreground/50 rounded-full" />
      </div>
    </div>
  );
}
