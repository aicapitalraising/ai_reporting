import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Download,
  FileArchive,
  FileText,
  Film,
  Image,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import type { StoryboardScene, VideoGenerationConfig } from '@/types/video';

interface ExportPanelProps {
  scenes: StoryboardScene[];
  characterImage?: string;
  characterName?: string;
  config: VideoGenerationConfig;
  projectName?: string;
}

export function ExportPanel({
  scenes,
  characterImage,
  characterName,
  config,
  projectName = 'video-production',
}: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  const completedScenes = scenes.filter((s) => s.status === 'completed');
  const hasContent = completedScenes.length > 0 || characterImage;

  const generateMasterPrompt = (): string => {
    const lines: string[] = [
      '# VEO3 Production Suite - Master Prompt',
      `# Generated: ${new Date().toISOString()}`,
      '',
      '## Project Configuration',
      `- Project Name: ${projectName}`,
      `- Aspect Ratio: ${config.aspectRatio}`,
      `- Ingredient Type: ${config.ingredientType}`,
      '',
    ];

    if (characterImage && characterName) {
      lines.push('## Character Reference');
      lines.push(`- Name: ${characterName}`);
      lines.push(`- Image: character_reference.png`);
      lines.push('');
    }

    lines.push('## Scenes');
    lines.push('');

    scenes.forEach((scene, index) => {
      lines.push(`### Scene ${index + 1}`);
      lines.push(`**Status:** ${scene.status}`);
      lines.push(`**Duration:** ${scene.duration}s`);
      lines.push(`**Prompt:**`);
      lines.push(scene.prompt);
      if (scene.videoUrl) {
        lines.push(`**Video:** scene_${index + 1}.mp4`);
      }
      lines.push('');
    });

    return lines.join('\n');
  };

  const handleExport = async () => {
    if (!hasContent) {
      toast.error('Nothing to export', {
        description: 'Generate some scenes first',
      });
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      const totalSteps = completedScenes.length + 2; // scenes + prompt + character
      let currentStep = 0;

      // Add master prompt
      const masterPrompt = generateMasterPrompt();
      zip.file('master_prompt.txt', masterPrompt);
      currentStep++;
      setProgress((currentStep / totalSteps) * 100);

      // Add character reference image
      if (characterImage) {
        try {
          const imageResponse = await fetch(characterImage);
          const imageBlob = await imageResponse.blob();
          zip.file('character_reference.png', imageBlob);
        } catch (err) {
          console.error('Failed to fetch character image:', err);
        }
        currentStep++;
        setProgress((currentStep / totalSteps) * 100);
      }

      // Add scene videos
      const scenesFolder = zip.folder('scenes');
      for (const scene of completedScenes) {
        if (scene.videoUrl) {
          try {
            const videoResponse = await fetch(scene.videoUrl);
            const videoBlob = await videoResponse.blob();
            scenesFolder?.file(`scene_${scene.order}.mp4`, videoBlob);
          } catch (err) {
            console.error(`Failed to fetch video for scene ${scene.order}:`, err);
          }
        }
        currentStep++;
        setProgress((currentStep / totalSteps) * 100);
      }

      // Generate and download
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${projectName.replace(/\s+/g, '-')}_production.zip`);

      toast.success('Production package downloaded!', {
        description: `${completedScenes.length} scenes exported`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed', {
        description: 'Please try again',
      });
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const handleCopyPrompt = () => {
    const masterPrompt = generateMasterPrompt();
    navigator.clipboard.writeText(masterPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Master prompt copied!');
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
          <FileArchive className="h-5 w-5 text-primary" />
          Export Production
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Package Contents */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Package Contents
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">master_prompt.txt</span>
            </div>
            {characterImage && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Image className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">character.png</span>
              </div>
            )}
            {completedScenes.map((scene) => (
              <div
                key={scene.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
              >
                <Film className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  scene_{scene.order}.mp4
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {completedScenes.length} videos
          </Badge>
          <Badge variant="outline">
            {completedScenes.length * 8}s total
          </Badge>
        </div>

        {/* Progress */}
        {isExporting && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Packaging assets... {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            disabled={!hasContent || isExporting}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download Package (.zip)
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopyPrompt}
            title="Copy master prompt"
          >
            {copied ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
