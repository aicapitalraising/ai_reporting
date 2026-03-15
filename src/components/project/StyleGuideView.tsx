import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdStyles } from '@/hooks/useAdStyles';
import { Loader2, Lightbulb, Target, Palette, MessageSquare } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface StyleGuideViewProps {
  clientId: string;
}

export function StyleGuideView({ clientId }: StyleGuideViewProps) {
  const { data: styles = [], isLoading } = useAdStyles(clientId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const styleCategories = [
    {
      name: 'Attention Grabbers',
      description: 'Styles designed to stop the scroll and capture attention',
      styles: ['Bold Headline', 'Funny / Meme', 'Top of Funnel'],
    },
    {
      name: 'Social Proof',
      description: 'Leverage testimonials, press, and reviews',
      styles: ['Testimonial', 'Press Feature / Tweet', 'Press Release'],
    },
    {
      name: 'Value & Comparison',
      description: 'Showcase benefits and competitive advantages',
      styles: ['Top 5', 'Us vs Them', 'Comparison Chart', 'Problem → Solution'],
    },
    {
      name: 'Education & Process',
      description: 'Teach and guide potential customers',
      styles: ['How-To Steps', 'Educational / Infographic', 'Before & After'],
    },
    {
      name: 'Conversion Focused',
      description: 'Drive immediate action with offers and guarantees',
      styles: ['Pricing / Offer', 'Low Ticket', 'Guarantee / Risk Reversal'],
    },
    {
      name: 'Creative & Visual',
      description: 'Clean visuals and unique angles',
      styles: ['Single Image', 'Ad Angles'],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Style Guide</h2>
        <p className="text-sm text-muted-foreground">
          Learn how each ad style works and when to use it for best results
        </p>
      </div>

      {/* Quick Tips */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Quick Tips for Better Ads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <Target className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <span>Use 3-5 different styles per campaign to test what resonates</span>
            </li>
            <li className="flex items-start gap-2">
              <Palette className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <span>Upload reference images to guide the AI toward your preferred aesthetic</span>
            </li>
            <li className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <span>Customize prompt templates to include brand-specific messaging</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Style Categories */}
      <div className="space-y-4">
        {styleCategories.map((category) => (
          <Card key={category.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{category.name}</CardTitle>
              <CardDescription className="text-xs">{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {category.styles.map((styleName) => {
                  const style = styles.find((s) => s.name === styleName);
                  if (!style) return null;
                  
                  return (
                    <AccordionItem key={style.id} value={style.id}>
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center gap-2">
                          {style.name}
                          {style.example_image_url && (
                            <Badge variant="outline" className="text-[10px]">
                              Has Reference
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          <p className="text-sm text-muted-foreground">
                            {style.description}
                          </p>
                          
                          {style.example_image_url && (
                            <div>
                              <p className="text-xs font-medium mb-1">Reference Image</p>
                              <img
                                src={style.example_image_url}
                                alt={`${style.name} reference`}
                                className="w-32 h-32 object-cover rounded-lg border"
                              />
                            </div>
                          )}
                          
                          <div>
                            <p className="text-xs font-medium mb-1">Prompt Template</p>
                            <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                              {style.prompt_template.slice(0, 300)}
                              {style.prompt_template.length > 300 && '...'}
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All Styles Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">All {styles.length} Styles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {styles.map((style) => (
              <Badge key={style.id} variant={style.is_default ? 'secondary' : 'outline'}>
                {style.name}
                {style.example_image_url && ' 📷'}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
