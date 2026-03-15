import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Zap,
  Target,
  Heart,
  TrendingUp,
  MessageSquare,
  Users,
  Star,
  Film,
  Lightbulb,
  Shield,
} from 'lucide-react';

export interface ScriptFramework {
  id: string;
  name: string;
  description: string;
  template: string;
  category: 'conversion' | 'awareness' | 'engagement' | 'testimonial';
  icon: React.ReactNode;
}

const MARKETING_FRAMEWORKS: ScriptFramework[] = [
  // Conversion frameworks
  {
    id: 'hormozi',
    name: 'Hormozi Offer',
    description: '$100M Offers style: value stack with risk reversal',
    template: 'Scene 1: State the {PAIN_POINT}\nScene 2: Agitate - show consequences\nScene 3: Present {PRODUCT} as the solution\nScene 4: Value stack - everything included\nScene 5: Risk reversal + CTA',
    category: 'conversion',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    id: 'pas',
    name: 'Problem-Agitate-Solve',
    description: 'Classic copywriting framework for pain-focused ads',
    template: 'Scene 1: {PROBLEM} - the struggle\nScene 2: Agitate - make it worse\nScene 3: Introduce solution\nScene 4: Show transformation\nScene 5: CTA with urgency',
    category: 'conversion',
    icon: <Target className="h-4 w-4" />,
  },
  {
    id: 'aida',
    name: 'AIDA Formula',
    description: 'Attention → Interest → Desire → Action',
    template: 'Scene 1: Attention grabber\nScene 2: Build interest with benefits\nScene 3: Create desire with proof\nScene 4: Overcome objections\nScene 5: Strong call to action',
    category: 'conversion',
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    id: 'faab',
    name: 'Feature-Advantage-Benefit',
    description: 'Transform features into emotional benefits',
    template: 'Scene 1: Hook with end result\nScene 2: Feature 1 → Benefit\nScene 3: Feature 2 → Emotional payoff\nScene 4: Feature 3 → Life transformation\nScene 5: Bundle value + CTA',
    category: 'conversion',
    icon: <Star className="h-4 w-4" />,
  },
  {
    id: 'before-after-bridge',
    name: 'Before-After-Bridge',
    description: 'Show transformation with your product as the bridge',
    template: 'Scene 1: BEFORE - current painful state\nScene 2: AFTER - desired outcome\nScene 3: BRIDGE - how {PRODUCT} gets you there\nScene 4: Proof and testimonials\nScene 5: Limited time offer + CTA',
    category: 'conversion',
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    id: 'objection-crusher',
    name: 'Objection Crusher',
    description: 'Address and destroy top 3 objections',
    template: 'Scene 1: "I know what you\'re thinking..."\nScene 2: Objection 1 + counter\nScene 3: Objection 2 + proof\nScene 4: Objection 3 + guarantee\nScene 5: "So what\'s stopping you?" + CTA',
    category: 'conversion',
    icon: <Shield className="h-4 w-4" />,
  },
  // Awareness frameworks
  {
    id: 'harmon-brothers',
    name: 'Harmon Brothers',
    description: 'Viral comedic storytelling with product demo',
    template: 'Scene 1: Humorous relatable situation\nScene 2: Problem escalates hilariously\nScene 3: Product reveal with demo\nScene 4: Benefits shown comedically\nScene 5: Memorable tagline + CTA',
    category: 'awareness',
    icon: <Film className="h-4 w-4" />,
  },
  {
    id: 'story-hook',
    name: 'Story Hook',
    description: 'Personal narrative that builds emotional connection',
    template: 'Scene 1: "Let me tell you a story..."\nScene 2: The struggle/journey\nScene 3: The breakthrough moment\nScene 4: The transformation\nScene 5: "And you can too..." + CTA',
    category: 'awareness',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: 'pattern-interrupt',
    name: 'Pattern Interrupt',
    description: 'Unexpected opening that demands attention',
    template: 'Scene 1: SHOCKING statement or visual\nScene 2: "Now that I have your attention..."\nScene 3: Key insight/value\nScene 4: How to get it\nScene 5: Urgency + CTA',
    category: 'awareness',
    icon: <Lightbulb className="h-4 w-4" />,
  },
  {
    id: 'myth-buster',
    name: 'Myth Buster',
    description: 'Debunk common misconceptions in your niche',
    template: 'Scene 1: "Everyone thinks {MYTH}..."\nScene 2: "But here\'s the truth..."\nScene 3: Evidence and proof\nScene 4: The real solution\nScene 5: "Join the people who know" + CTA',
    category: 'awareness',
    icon: <Lightbulb className="h-4 w-4" />,
  },
  {
    id: 'day-in-life',
    name: 'Day in the Life',
    description: 'Authentic lifestyle content showing product use',
    template: 'Scene 1: Morning routine context\nScene 2: Problem moment\nScene 3: Using {PRODUCT}\nScene 4: Result/benefit in action\nScene 5: Subtle CTA + link',
    category: 'awareness',
    icon: <Film className="h-4 w-4" />,
  },
  // Engagement frameworks
  {
    id: 'ugc-review',
    name: 'UGC Review Style',
    description: 'Authentic user-generated content feel',
    template: 'Scene 1: "Okay so I finally tried..."\nScene 2: Unboxing/first impression\nScene 3: Actually using it\nScene 4: Genuine reaction to results\nScene 5: "Would I recommend?" + verdict',
    category: 'engagement',
    icon: <Users className="h-4 w-4" />,
  },
  {
    id: 'duet-response',
    name: 'Duet/Response Style',
    description: 'React to a trend or question format',
    template: 'Scene 1: Show the trend/question\nScene 2: Your reaction\nScene 3: Your answer/take\nScene 4: Proof/demonstration\nScene 5: Engagement hook + CTA',
    category: 'engagement',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: 'hook-loop',
    name: 'Hook Loop',
    description: 'Create curiosity gaps that keep viewers watching',
    template: 'Scene 1: "Wait until you see..."\nScene 2: Build anticipation\nScene 3: Mini payoff + new hook\nScene 4: Main reveal\nScene 5: "Want more?" + follow CTA',
    category: 'engagement',
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    id: 'tutorial-soft-sell',
    name: 'Tutorial Soft Sell',
    description: 'Teach something valuable while showcasing product',
    template: 'Scene 1: "How to {OUTCOME}"\nScene 2: Step 1 (with product)\nScene 3: Step 2 (product shines)\nScene 4: Result achieved\nScene 5: "Get yours to try this" + link',
    category: 'engagement',
    icon: <Lightbulb className="h-4 w-4" />,
  },
  {
    id: 'comparison-test',
    name: 'Comparison Test',
    description: 'Side-by-side comparison showing your advantage',
    template: 'Scene 1: "Let\'s compare..."\nScene 2: The other option\nScene 3: Your product\nScene 4: Clear winner moment\nScene 5: "The choice is obvious" + CTA',
    category: 'engagement',
    icon: <Target className="h-4 w-4" />,
  },
  // Testimonial frameworks
  {
    id: 'transformation-story',
    name: 'Transformation Story',
    description: 'Before/after customer success story',
    template: 'Scene 1: "I used to {PAIN}..."\nScene 2: "Then I found {PRODUCT}"\nScene 3: The journey/using it\nScene 4: The transformation\nScene 5: "If I can do it, you can too"',
    category: 'testimonial',
    icon: <Heart className="h-4 w-4" />,
  },
  {
    id: 'skeptic-convert',
    name: 'Skeptic to Convert',
    description: 'Overcame doubts to become a believer',
    template: 'Scene 1: "I was skeptical at first..."\nScene 2: What made me try it\nScene 3: First experience\nScene 4: Now I can\'t live without it\nScene 5: "Give it a chance" + CTA',
    category: 'testimonial',
    icon: <Shield className="h-4 w-4" />,
  },
  {
    id: 'expert-endorsement',
    name: 'Expert Endorsement',
    description: 'Authority figure validation',
    template: 'Scene 1: Expert credentials\nScene 2: "In my X years..."\nScene 3: Why this product stands out\nScene 4: Professional recommendation\nScene 5: "That\'s why I recommend" + CTA',
    category: 'testimonial',
    icon: <Star className="h-4 w-4" />,
  },
  {
    id: 'interview-style',
    name: 'Interview Style',
    description: 'Q&A format testimonial',
    template: 'Scene 1: "What was your biggest struggle?"\nScene 2: Customer answer\nScene 3: "How did {PRODUCT} help?"\nScene 4: Transformation story\nScene 5: "Would you recommend?" + yes',
    category: 'testimonial',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: 'result-showcase',
    name: 'Result Showcase',
    description: 'Numbers and proof-driven testimonial',
    template: 'Scene 1: "In just {TIME}..."\nScene 2: Specific result #1\nScene 3: Specific result #2\nScene 4: How it changed my life\nScene 5: "Get your results" + CTA',
    category: 'testimonial',
    icon: <TrendingUp className="h-4 w-4" />,
  },
];

interface FrameworkSelectorProps {
  selectedFrameworks: string[];
  onFrameworksChange: (frameworks: string[]) => void;
  customScript: string;
  onCustomScriptChange: (script: string) => void;
  maxSelections?: number;
}

export function FrameworkSelector({
  selectedFrameworks,
  onFrameworksChange,
  customScript,
  onCustomScriptChange,
  maxSelections = 3,
}: FrameworkSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const toggleFramework = (frameworkId: string) => {
    if (selectedFrameworks.includes(frameworkId)) {
      onFrameworksChange(selectedFrameworks.filter((id) => id !== frameworkId));
    } else if (selectedFrameworks.length < maxSelections) {
      onFrameworksChange([...selectedFrameworks, frameworkId]);
    }
  };

  const filteredFrameworks =
    activeCategory === 'all'
      ? MARKETING_FRAMEWORKS
      : MARKETING_FRAMEWORKS.filter((f) => f.category === activeCategory);

  const categoryLabels = {
    all: 'All Frameworks',
    conversion: 'Conversion',
    awareness: 'Awareness',
    engagement: 'Engagement',
    testimonial: 'Testimonial',
  };

  return (
    <div className="space-y-6">
      {/* Custom Script Input */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground">
            <MessageSquare className="h-5 w-5 text-primary" />
            Custom Script
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={customScript}
            onChange={(e) => onCustomScriptChange(e.target.value)}
            placeholder="Paste your script here...

Scene 1: [Visual description]
Voiceover: 'Your dialogue here'

Scene 2: [Visual description]
Voiceover: 'Continue the story...'"
            className="min-h-[150px] bg-muted/30 border-border font-mono text-sm text-foreground placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Or select AI frameworks below to generate a script automatically
          </p>
        </CardContent>
      </Card>

      {/* Framework Selection */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <Zap className="h-5 w-5 text-primary" />
              AI Script Frameworks
            </CardTitle>
            <Badge variant="secondary" className="gap-1">
              {selectedFrameworks.length}/{maxSelections} selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Tabs */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="grid grid-cols-5 w-full">
              {Object.entries(categoryLabels).map(([key, label]) => (
                <TabsTrigger key={key} value={key} className="text-xs">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Framework Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFrameworks.map((framework) => {
              const isSelected = selectedFrameworks.includes(framework.id);
              const isDisabled =
                !isSelected && selectedFrameworks.length >= maxSelections;

              return (
                <button
                  key={framework.id}
                  onClick={() => toggleFramework(framework.id)}
                  disabled={isDisabled}
                  className={cn(
                    'p-4 rounded-xl border text-left transition-all',
                    'bg-muted hover:bg-muted/80',
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10'
                      : 'border-border',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted-foreground/10 text-muted-foreground'
                      )}
                    >
                      {framework.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground truncate">
                          {framework.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize shrink-0"
                        >
                          {framework.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {framework.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { MARKETING_FRAMEWORKS };
