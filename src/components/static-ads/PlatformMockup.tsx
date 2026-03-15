import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Heart, MessageCircle, Share2, ThumbsUp, Send, MoreHorizontal, Globe, Bookmark } from 'lucide-react';

interface PlatformMockupProps {
  imageUrl: string;
  headline: string;
  ctaText: string;
  clientName?: string;
  clientLogo?: string;
  children?: React.ReactNode;
}

export function PlatformMockup({ imageUrl, headline, ctaText, clientName = 'Your Brand', clientLogo, children }: PlatformMockupProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="text-xs h-7">
            <Eye className="h-3 w-3 mr-1" />
            Preview
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-sm">Preview in Context</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="facebook" className="w-full">
          <TabsList className="w-full rounded-none border-b bg-transparent h-9 px-4">
            <TabsTrigger value="facebook" className="text-xs">Facebook</TabsTrigger>
            <TabsTrigger value="instagram" className="text-xs">Instagram</TabsTrigger>
            <TabsTrigger value="linkedin" className="text-xs">LinkedIn</TabsTrigger>
            <TabsTrigger value="google" className="text-xs">Google</TabsTrigger>
          </TabsList>

          <div className="p-4">
            <TabsContent value="facebook" className="mt-0">
              <div className="border rounded-xl bg-card overflow-hidden max-w-sm mx-auto">
                {/* Header */}
                <div className="flex items-center gap-2.5 p-3">
                  <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {clientName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{clientName}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">Sponsored · <Globe className="h-2.5 w-2.5" /></p>
                  </div>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="px-3 pb-2 text-xs">{headline}</p>
                <img src={imageUrl} alt="Ad" className="w-full aspect-video object-cover" />
                <div className="p-3 border-t">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[10px]">👍 142</span>
                    <span className="text-[10px]">24 comments · 8 shares</span>
                  </div>
                  <div className="flex items-center justify-around mt-2 pt-2 border-t">
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ThumbsUp className="h-3.5 w-3.5" /> Like</button>
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><MessageCircle className="h-3.5 w-3.5" /> Comment</button>
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Share2 className="h-3.5 w-3.5" /> Share</button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="instagram" className="mt-0">
              <div className="border rounded-xl bg-card overflow-hidden max-w-sm mx-auto">
                <div className="flex items-center gap-2.5 p-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
                    <div className="h-full w-full rounded-full bg-card flex items-center justify-center text-[9px] font-bold">
                      {clientName.charAt(0)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{clientName.toLowerCase().replace(/\s+/g, '')}</p>
                    <p className="text-[10px] text-muted-foreground">Sponsored</p>
                  </div>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </div>
                <img src={imageUrl} alt="Ad" className="w-full aspect-square object-cover" />
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Heart className="h-5 w-5" />
                      <MessageCircle className="h-5 w-5" />
                      <Send className="h-5 w-5" />
                    </div>
                    <Bookmark className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold">1,247 likes</p>
                  <p className="text-xs"><span className="font-semibold">{clientName.toLowerCase().replace(/\s+/g, '')}</span> {headline}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="linkedin" className="mt-0">
              <div className="border rounded-xl bg-card overflow-hidden max-w-sm mx-auto">
                <div className="flex items-center gap-2.5 p-3">
                  <div className="h-10 w-10 rounded bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {clientName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{clientName}</p>
                    <p className="text-[10px] text-muted-foreground">Promoted</p>
                  </div>
                </div>
                <p className="px-3 pb-2 text-xs">{headline}</p>
                <img src={imageUrl} alt="Ad" className="w-full aspect-video object-cover" />
                <div className="p-3 border-t">
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <button className="flex items-center gap-1 text-xs hover:text-foreground"><ThumbsUp className="h-3.5 w-3.5" /> Like</button>
                    <button className="flex items-center gap-1 text-xs hover:text-foreground"><MessageCircle className="h-3.5 w-3.5" /> Comment</button>
                    <button className="flex items-center gap-1 text-xs hover:text-foreground"><Share2 className="h-3.5 w-3.5" /> Repost</button>
                    <button className="flex items-center gap-1 text-xs hover:text-foreground"><Send className="h-3.5 w-3.5" /> Send</button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="google" className="mt-0">
              <div className="max-w-sm mx-auto space-y-3">
                <p className="text-[10px] text-muted-foreground">Shown as sidebar ad on websites</p>
                <div className="border rounded-lg bg-muted/30 p-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-2">
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                    <div className="space-y-2">
                      <div className="border rounded-lg overflow-hidden bg-card">
                        <img src={imageUrl} alt="Ad" className="w-full aspect-square object-cover" />
                        <div className="p-1.5">
                          <p className="text-[8px] font-semibold truncate">{headline}</p>
                          <span className="text-[7px] text-primary font-medium">{ctaText}</span>
                        </div>
                        <p className="text-[6px] text-muted-foreground px-1.5 pb-1">Ad · {clientName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
