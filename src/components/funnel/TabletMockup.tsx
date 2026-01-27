interface TabletMockupProps {
  url: string;
}

export function TabletMockup({ url }: TabletMockupProps) {
  return (
    <div className="flex flex-col items-center">
      {/* iPad Frame */}
      <div className="relative bg-[#1a1a1a] rounded-[24px] p-3 shadow-xl">
        {/* Camera */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#2a2a2a]" />
        
        {/* Screen Container */}
        <div className="relative bg-white rounded-[12px] overflow-hidden" style={{ width: '400px', height: '580px' }}>
          {/* Iframe with scaling */}
          <div className="w-full h-full overflow-hidden">
            <iframe
              src={url}
              title="Tablet Preview"
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
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#3a3a3a] rounded-full" />
      </div>
      
      {/* URL Display */}
      <p className="text-xs text-muted-foreground mt-2 max-w-[400px] truncate text-center">
        {url}
      </p>
    </div>
  );
}
