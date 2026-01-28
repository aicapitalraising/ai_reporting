import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wrench, Search, BarChart3, FileText, Lightbulb } from 'lucide-react';

export interface ToolMode {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  prompt: string;
}

export const TOOL_MODES: ToolMode[] = [
  {
    id: 'deepResearch',
    name: 'Deep Research',
    icon: <Search className="h-4 w-4" />,
    description: 'Thorough multi-step analysis',
    prompt: 'Conduct thorough research and analysis. Break down the problem, explore multiple angles, cite specific data points, and provide comprehensive insights with actionable recommendations.',
  },
  {
    id: 'analyzeData',
    name: 'Analyze Data',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Parse and analyze metrics',
    prompt: 'Analyze the provided data thoroughly. Identify patterns, trends, anomalies, and correlations. Present findings with clear visualizations in markdown tables and provide data-driven insights.',
  },
  {
    id: 'createReport',
    name: 'Create Report',
    icon: <FileText className="h-4 w-4" />,
    description: 'Generate formatted reports',
    prompt: 'Generate a professional report with the following sections: Executive Summary, Key Findings, Detailed Analysis, and Recommendations. Use proper markdown formatting with headers, bullet points, and tables where appropriate.',
  },
  {
    id: 'campaignIdeas',
    name: 'Campaign Ideas',
    icon: <Lightbulb className="h-4 w-4" />,
    description: 'Brainstorm creative campaigns',
    prompt: 'Brainstorm creative campaign ideas and optimization strategies. Consider the target audience, budget constraints, current performance metrics, and industry best practices. Provide specific, actionable recommendations.',
  },
];

interface AIToolsMenuProps {
  onSelectTool: (tool: ToolMode) => void;
  activeTool?: ToolMode | null;
}

export function AIToolsMenu({ onSelectTool, activeTool }: AIToolsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={activeTool ? "secondary" : "ghost"} 
          size="sm" 
          className="h-8 gap-1.5"
        >
          <Wrench className="h-4 w-4" />
          <span className="hidden sm:inline">
            {activeTool ? activeTool.name : 'Tools'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-popover">
        {TOOL_MODES.map((tool) => (
          <DropdownMenuItem
            key={tool.id}
            onClick={() => onSelectTool(tool)}
            className="flex items-start gap-3 py-2.5"
          >
            <span className="mt-0.5 text-muted-foreground">{tool.icon}</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{tool.name}</span>
              <span className="text-xs text-muted-foreground">{tool.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
