import { Globe } from 'lucide-react';

interface DesktopMockupProps {
  url: string;
}

export function DesktopMockup({ url }: DesktopMockupProps) {
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
    <div className="flex flex-col items-center">
      {/* Browser Window */}
      <div className="bg-[#2a2a2a] rounded-lg shadow-xl overflow-hidden" style={{ width: '640px' }}>
        {/* Title Bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a]">
          {/* Traffic Lights */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          
          {/* Address Bar */}
          <div className="flex-1 mx-4">
            <div className="flex items-center gap-2 bg-[#3a3a3a] rounded px-3 py-1">
              <Globe className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-300 truncate">
                {getDomain(url)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Browser Content */}
        <div className="bg-white overflow-hidden" style={{ height: '400px' }}>
          <iframe
            src={url}
            title="Desktop Preview"
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
