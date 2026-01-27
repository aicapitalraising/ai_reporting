import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DesktopMockupProps {
  url: string;
  title?: string;
  className?: string;
}

export function DesktopMockup({ url, title, className }: DesktopMockupProps) {
  // Extract domain from URL for display
  const getDomain = (fullUrl: string) => {
    try {
      const urlObj = new URL(fullUrl);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return fullUrl;
    }
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      )}
      {/* Browser Window */}
      <div className="bg-foreground rounded-lg shadow-xl overflow-hidden" style={{ width: '640px' }}>
        {/* Title Bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-foreground/80">
          {/* Traffic Lights */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#febc2e' }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#28c840' }} />
          </div>
          
          {/* Address Bar */}
          <div className="flex-1 mx-4">
            <div className="flex items-center gap-2 bg-muted rounded px-3 py-1">
              <Globe className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">
                {getDomain(url)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Browser Content */}
        <div className="bg-background overflow-hidden" style={{ height: '400px' }}>
          <iframe
            src={url}
            title={title || "Desktop Preview"}
            className="border-0 origin-top-left"
            style={{
              width: '1280px',
              height: '800px',
              transform: 'scale(0.5)',
              transformOrigin: 'top left',
            }}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
}
