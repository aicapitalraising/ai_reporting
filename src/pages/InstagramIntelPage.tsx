import { AppLayout } from '@/components/layout/AppLayout';
import { InstagramScrapeForm } from '@/components/instagram/InstagramScrapeForm';
import { ScrapeJobHistory } from '@/components/instagram/ScrapeJobHistory';
import { InstagramMediaGrid } from '@/components/instagram/InstagramMediaGrid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Instagram, Search, Image, History } from 'lucide-react';

export default function InstagramIntelPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Instagram className="h-6 w-6" />
            Instagram Intel
          </h1>
          <p className="text-muted-foreground mt-1">
            Scrape Instagram profiles, hashtags, and posts for creative inspiration
          </p>
        </div>

        <Tabs defaultValue="scrape" className="space-y-6">
          <TabsList>
            <TabsTrigger value="scrape" className="gap-1">
              <Search className="h-3.5 w-3.5" /> Scrape
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-1">
              <Image className="h-3.5 w-3.5" /> Media Library
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <History className="h-3.5 w-3.5" /> Job History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scrape" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <InstagramScrapeForm />
              </div>
              <div className="lg:col-span-2">
                <ScrapeJobHistory />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="library">
            <InstagramMediaGrid />
          </TabsContent>

          <TabsContent value="history">
            <ScrapeJobHistory />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
