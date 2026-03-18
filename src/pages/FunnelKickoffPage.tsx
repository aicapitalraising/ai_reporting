import logo from '@/assets/logo-aicra.png';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import KickoffTab from '@/components/funnel-builder/client/KickoffTab';

export default function Kickoff() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/">
            <img src={logo} alt="AI Capital Raising Accelerator" className="h-8" />
          </a>
          <a href="https://aicapitalraising.com/steps" target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="font-semibold rounded-lg">
              <Phone className="w-4 h-4 mr-1.5" />
              Kick Off Call
            </Button>
          </a>
        </div>
      </header>

      <section className="py-16 md:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <KickoffTab />
        </div>
      </section>

      <footer className="border-t border-border py-8 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={logo} alt="AI Capital Raising Accelerator" className="h-7" />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AI Capital Raising. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
