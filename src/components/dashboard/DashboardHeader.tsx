import { Settings, Zap, Settings2, Shield, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  onGlobalSettings?: () => void;
  onAgencySettings?: () => void;
  onSpamBlacklist?: () => void;
  onDatabase?: () => void;
}

export function DashboardHeader({ 
  title, 
  subtitle, 
  onGlobalSettings,
  onAgencySettings,
  onSpamBlacklist,
  onDatabase,
}: DashboardHeaderProps) {
  return (
    <header className="border-b-2 border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
            <Zap className="h-3 w-3 text-chart-2" />
            <span>Last sync: 2 min ago</span>
          </div>
          {onAgencySettings && (
            <Button variant="outline" size="sm" onClick={onAgencySettings}>
              <Settings2 className="h-4 w-4 mr-2" />
              Settings
            </Button>
          )}
          {onSpamBlacklist && (
            <Button variant="outline" size="sm" onClick={onSpamBlacklist}>
              <Shield className="h-4 w-4 mr-2" />
              Spam
            </Button>
          )}
          {onDatabase && (
            <Button variant="outline" size="sm" onClick={onDatabase}>
              <Database className="h-4 w-4 mr-2" />
              Database
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
