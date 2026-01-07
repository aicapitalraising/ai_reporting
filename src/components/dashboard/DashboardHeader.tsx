import { useState } from 'react';
import { Moon, Sun, Settings, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  onGlobalSettings?: () => void;
}

export function DashboardHeader({ title, subtitle, onGlobalSettings }: DashboardHeaderProps) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="border-b-2 border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mr-4">
            <Zap className="h-3 w-3 text-chart-2" />
            <span>Last sync: 2 min ago</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onGlobalSettings}>
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
