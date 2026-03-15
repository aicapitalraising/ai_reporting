import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Download, Check, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Avatar, AvatarAngle, GeneratedAngle } from '@/types';
import { useAvatarGeneration, ANGLE_PRESETS } from '@/hooks/useAvatarGeneration';
import { toast } from 'sonner';

interface AnglesTabProps {
  avatar: Avatar;
  onAngleGenerated: (angle: GeneratedAngle) => void;
}

// Group presets by category
const CLASSIC_ANGLES = ANGLE_PRESETS.filter(p => p.category === 'classic' || !p.category);
const ARC_ANGLES = ANGLE_PRESETS.filter(p => p.category === '180-arc');

export function AnglesTab({ avatar, onAngleGenerated }: AnglesTabProps) {
  const { generateAngles, isGeneratingAngles, hasApiKey } = useAvatarGeneration();
  
  // Angle selection - default to classic 4
  const [selectedAngles, setSelectedAngles] = useState<AvatarAngle[]>(['close-up', 'medium', 'wide', 'side-profile']);
  
  // Options
  const [keepBackground, setKeepBackground] = useState(true);
  const [keepOutfit, setKeepOutfit] = useState(true);
  const [customInstructions, setCustomInstructions] = useState('');
  
  // Generation state
  const [generatedAngles, setGeneratedAngles] = useState<GeneratedAngle[]>([]);
  const [generatingAngle, setGeneratingAngle] = useState<AvatarAngle | null>(null);

  const toggleAngle = (angle: AvatarAngle) => {
    setSelectedAngles(prev => 
      prev.includes(angle) 
        ? prev.filter(a => a !== angle)
        : [...prev, angle]
    );
  };

  const selectAllClassic = () => {
    const classicTypes = CLASSIC_ANGLES.map(a => a.type);
    setSelectedAngles(prev => {
      const withoutClassic = prev.filter(a => !classicTypes.includes(a));
      const allSelected = classicTypes.every(t => prev.includes(t));
      return allSelected ? withoutClassic : [...withoutClassic, ...classicTypes];
    });
  };

  const selectAll180Arc = () => {
    const arcTypes = ARC_ANGLES.map(a => a.type);
    setSelectedAngles(prev => {
      const withoutArc = prev.filter(a => !arcTypes.includes(a));
      const allSelected = arcTypes.every(t => prev.includes(t));
      return allSelected ? withoutArc : [...withoutArc, ...arcTypes];
    });
  };

  const handleGenerateAngles = async () => {
    if (selectedAngles.length === 0) {
      toast.error('Select at least one angle');
      return;
    }

    // Reset previous results
    setGeneratedAngles([]);

    // Build base params from avatar - maintain identity consistency
    // Use the original avatar image as reference for identity consistency
    const baseParams = {
      gender: avatar.gender || 'female',
      ageRange: avatar.age_range || '26-35',
      ethnicity: avatar.ethnicity || 'caucasian',
      style: avatar.style || 'ugc',
      background: keepBackground ? 'studio' : 'outdoor', // Neutral studio for consistency
      isStock: avatar.is_stock,
      clientId: avatar.client_id || undefined,
      // CRITICAL: Pass the original avatar image as reference for identity matching
      referenceImageUrl: avatar.image_url,
      // Include strong identity consistency prompts with options
      customPrompt: [
        'CRITICAL: Generate the EXACT SAME PERSON as shown in the reference image.',
        'Maintain IDENTICAL facial features, bone structure, nose shape, eye shape, lip shape, skin tone, and complete identity.',
        'This person MUST be recognizable as the same individual - no variation in facial features.',
        keepOutfit 
          ? 'Keep IDENTICAL clothing, accessories, jewelry, hairstyle, and styling from the reference image.' 
          : 'You may vary the clothing and accessories while keeping the same person.',
        keepBackground 
          ? [
              'ENVIRONMENT CONTINUITY (CRITICAL): This is the SAME location as the reference image.',
              'The background MUST show the SAME physical environment, buildings, landscape, objects, and setting.',
              'As the camera orbits around the subject, reveal MORE of the surrounding area that would logically exist in this location.',
              'Maintain consistent lighting direction, time of day, weather, and atmospheric conditions.',
              'Think of this as a REAL camera moving to a new position in the SAME physical space — the environment extends naturally.',
              'Background elements should shift perspective naturally as the camera angle changes (parallax effect).',
              'Do NOT generate a new or different environment — EXTEND the existing one.',
            ].join(' ')
          : 'You may use a different background setting while keeping the same person.',
        'This is the same person photographed from a different camera angle only.',
        'Hyper-realistic UGC selfie style, natural skin texture with visible pores.',
        customInstructions ? `ADDITIONAL INSTRUCTIONS: ${customInstructions}` : '',
      ].filter(Boolean).join(' '),
    };

    const results = await generateAngles(
      baseParams,
      selectedAngles,
      (angle, status) => {
        if (status === 'generating') {
          setGeneratingAngle(angle);
        } else {
          setGeneratingAngle(null);
        }
      }
    );

    setGeneratedAngles(results);
    
    // Notify parent of each successful generation
    results.forEach(result => {
      if (result.status === 'completed') {
        onAngleGenerated(result);
      }
    });
  };

  const downloadAngle = async (angle: GeneratedAngle) => {
    if (!angle.imageUrl) return;
    
    try {
      const response = await fetch(angle.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${avatar.name}-${angle.angle}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download image');
    }
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="font-semibold">Generate Camera Angles</h3>
          <p className="text-sm text-muted-foreground">
            Create multiple perspectives of this avatar while maintaining identity consistency
          </p>
        </div>

        {/* Classic Angles Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Classic Shots</Label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={selectAllClassic}
              disabled={isGeneratingAngles}
              className="h-7 text-xs"
            >
              {CLASSIC_ANGLES.every(a => selectedAngles.includes(a.type)) ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CLASSIC_ANGLES.map((preset) => (
              <AngleButton
                key={preset.type}
                preset={preset}
                isSelected={selectedAngles.includes(preset.type)}
                isGenerating={generatingAngle === preset.type}
                result={generatedAngles.find(g => g.angle === preset.type)}
                disabled={isGeneratingAngles}
                onToggle={() => toggleAngle(preset.type)}
              />
            ))}
          </div>
        </div>

        {/* 180° Arc Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>180° Arc Positions</Label>
              <Badge variant="outline" className="text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Environment
              </Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={selectAll180Arc}
              disabled={isGeneratingAngles}
              className="h-7 text-xs"
            >
              {ARC_ANGLES.every(a => selectedAngles.includes(a.type)) ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Build a complete 180° view around the avatar to establish environment and spatial context
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ARC_ANGLES.map((preset) => (
              <AngleButton
                key={preset.type}
                preset={preset}
                isSelected={selectedAngles.includes(preset.type)}
                isGenerating={generatingAngle === preset.type}
                result={generatedAngles.find(g => g.angle === preset.type)}
                disabled={isGeneratingAngles}
                onToggle={() => toggleAngle(preset.type)}
              />
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <Label>Options</Label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={keepBackground} 
                onCheckedChange={(c) => setKeepBackground(!!c)}
                disabled={isGeneratingAngles}
              />
              <span className="text-sm">Keep same background</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={keepOutfit} 
                onCheckedChange={(c) => setKeepOutfit(!!c)}
                disabled={isGeneratingAngles}
              />
              <span className="text-sm">Keep same outfit</span>
            </label>
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="space-y-2">
          <Label>Custom Instructions (optional)</Label>
          <Textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="e.g. Remove the microphone, add sunglasses, change to a navy suit..."
            rows={2}
            className="text-sm resize-none"
            disabled={isGeneratingAngles}
          />
          <p className="text-xs text-muted-foreground">
            Add specific changes applied to all generated angles
          </p>
        </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerateAngles}
        disabled={isGeneratingAngles || selectedAngles.length === 0}
        className="w-full gap-2"
        size="lg"
      >
        {isGeneratingAngles ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating {selectedAngles.length} Angles...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate {selectedAngles.length} Angles
          </>
        )}
      </Button>


        {/* Generated Results */}
        {generatedAngles.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label>Generated Angles</Label>
              <Badge variant="secondary">
                {generatedAngles.filter(g => g.status === 'completed').length}/{generatedAngles.length}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {generatedAngles.map((result) => {
                const preset = ANGLE_PRESETS.find(p => p.type === result.angle);
                return (
                  <div 
                    key={result.angle}
                    className={cn(
                      'relative rounded-lg overflow-hidden',
                      result.status === 'failed' && 'opacity-50'
                    )}
                  >
                    {result.imageUrl ? (
                      <>
                        <img 
                          src={result.imageUrl} 
                          alt={result.angle}
                          className="w-full aspect-[3/4] object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">
                              {preset?.icon} {preset?.label}
                            </Badge>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 w-7 p-0"
                              onClick={() => downloadAngle(result)}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">Failed</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
          <span>
            Nano Banana Pro maintains identity consistency across all camera angles
          </span>
        </div>
    </div>
  );
}

// Extracted component for angle buttons
interface AngleButtonProps {
  preset: typeof ANGLE_PRESETS[0];
  isSelected: boolean;
  isGenerating: boolean;
  result?: GeneratedAngle;
  disabled: boolean;
  onToggle: () => void;
}

function AngleButton({ preset, isSelected, isGenerating, result, disabled, onToggle }: AngleButtonProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'relative p-3 rounded-lg border text-left transition-all',
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-foreground/30',
        isGenerating && 'animate-pulse border-primary',
        result?.status === 'completed' && 'border-green-500 bg-green-500/10',
        result?.status === 'failed' && 'border-destructive bg-destructive/10'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg">{preset.icon}</span>
        {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {result?.status === 'completed' && <Check className="h-4 w-4 text-green-500" />}
        {result?.status === 'failed' && <X className="h-4 w-4 text-destructive" />}
        {!isGenerating && !result && isSelected && (
          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        )}
      </div>
      <span className="text-sm font-medium">{preset.label}</span>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
        {preset.framing.split(',')[0]}
      </p>
    </button>
  );
}
