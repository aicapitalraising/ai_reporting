import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGeminiKey } from './useGeminiKey';
import { toast } from 'sonner';
import type { AvatarAngle, AngleConfig, GeneratedAngle } from '@/types';

export interface AvatarGenerationParams {
  gender: string;
  ageRange: string;
  ethnicity: string;
  style: string;
  background: string;
  backgroundPrompt?: string;
  customPrompt?: string;
  isStock?: boolean;
  clientId?: string;
  // Nano Banana Pro controls
  cameraDevice?: 'iphone' | 'samsung';
  aspectRatio?: '9:16' | '6:19';
  realism?: number;
  wideAngle?: number;
  // Angle generation
  angleType?: AvatarAngle;
  // Reference image for identity consistency
  referenceImageUrl?: string;
  // Hyper-realistic controls
  realism_level?: 'standard' | 'high' | 'ultra-realistic';
  style_preset?: 'professional_headshot' | 'lifestyle' | 'editorial' | 'social_media';
  // Look generation
  look_type?: 'different_outfit' | 'different_setting' | 'different_expression' | 'different_angle';
  look_description?: string;
  avatar_description?: string;
}

export interface AvatarGenerationResult {
  success: boolean;
  imageUrl?: string;
  storagePath?: string;
  error?: string;
}

// Camera angle presets for multi-perspective generation
// Includes classic shots AND 180° arc positions around the avatar
export const ANGLE_PRESETS: AngleConfig[] = [
  // Classic shot types
  {
    type: 'close-up',
    label: 'Close-Up',
    icon: '🔍',
    category: 'classic',
    promptModifier: 'extreme close-up portrait, face fills 80% of frame, intimate detail shot, eyes and lips are the main focus',
    focalLength: '85mm portrait lens, f/1.8 shallow depth of field, creamy bokeh background blur',
    framing: 'tight crop on face and eyes, capturing every skin texture detail, slight chin tilt up',
  },
  {
    type: 'medium',
    label: 'Medium Shot',
    icon: '📱',
    category: 'classic',
    promptModifier: 'medium shot selfie, head and shoulders visible, natural arms-length framing, classic social media portrait',
    focalLength: 'standard 35mm focal length, balanced perspective, natural proportions',
    framing: 'classic selfie composition, chest to top of head visible, one arm possibly visible holding phone',
  },
  {
    type: 'wide',
    label: 'Wide Shot',
    icon: '🖼️',
    category: 'classic',
    promptModifier: 'wide environmental portrait, upper body and surroundings clearly visible, establishing shot',
    focalLength: '24mm wide angle lens, more environment in frame, slight perspective distortion at edges',
    framing: 'full torso and some of room visible, environmental context emphasized, subject centered',
  },
  {
    type: 'side-profile',
    label: 'Side Profile',
    icon: '👤',
    category: 'classic',
    promptModifier: '3/4 angle portrait, turned 45 degrees away from camera, elegant profile view showing jawline',
    focalLength: '50mm natural lens, flattering side lighting with rim light on hair and cheek',
    framing: 'elegant profile angle, chin and nose silhouette visible, beautiful cheekbone highlight',
  },
  // 180° Arc positions around the avatar
  {
    type: 'front-left-45',
    label: 'Front Left 45°',
    icon: '↖️',
    category: '180-arc',
    promptModifier: 'portrait photographed from 45 degrees to the left of center, showing both eyes with left side slightly closer to camera, natural conversational angle',
    focalLength: '50mm natural lens, flattering perspective, soft directional light from right',
    framing: 'face angled 45 degrees left, more of right cheek visible, natural head position',
  },
  {
    type: 'front-right-45',
    label: 'Front Right 45°',
    icon: '↗️',
    category: '180-arc',
    promptModifier: 'portrait photographed from 45 degrees to the right of center, showing both eyes with right side slightly closer to camera, natural conversational angle',
    focalLength: '50mm natural lens, flattering perspective, soft directional light from left',
    framing: 'face angled 45 degrees right, more of left cheek visible, natural head position',
  },
  {
    type: 'left-90',
    label: 'Left Profile 90°',
    icon: '⬅️',
    category: '180-arc',
    promptModifier: 'full left profile portrait, camera positioned 90 degrees to the left, showing complete side view of face, nose and lips silhouette prominent',
    focalLength: '85mm portrait lens, dramatic side lighting with rim light on face edge',
    framing: 'complete left side profile, single eye visible, jawline and neck clearly defined',
  },
  {
    type: 'right-90',
    label: 'Right Profile 90°',
    icon: '➡️',
    category: '180-arc',
    promptModifier: 'full right profile portrait, camera positioned 90 degrees to the right, showing complete side view of face, nose and lips silhouette prominent',
    focalLength: '85mm portrait lens, dramatic side lighting with rim light on face edge',
    framing: 'complete right side profile, single eye visible, jawline and neck clearly defined',
  },
  {
    type: 'back-left-135',
    label: 'Back Left 135°',
    icon: '↙️',
    category: '180-arc',
    promptModifier: 'three-quarter back view from 135 degrees left, showing back of head and partial profile, hair texture prominent, ear visible',
    focalLength: '50mm lens, soft backlight with hair light rim effect',
    framing: 'back of head with cheek edge visible, showing hairstyle from behind, environmental context',
  },
  {
    type: 'back-right-135',
    label: 'Back Right 135°',
    icon: '↘️',
    category: '180-arc',
    promptModifier: 'three-quarter back view from 135 degrees right, showing back of head and partial profile, hair texture prominent, ear visible',
    focalLength: '50mm lens, soft backlight with hair light rim effect',
    framing: 'back of head with cheek edge visible, showing hairstyle from behind, environmental context',
  },
  {
    type: 'over-shoulder-left',
    label: 'Over Shoulder Left',
    icon: '🎬',
    category: '180-arc',
    promptModifier: 'over-the-shoulder shot from behind left shoulder, camera looking past shoulder at what subject is facing, cinematic composition',
    focalLength: '35mm lens, depth of field showing shoulder in soft foreground blur',
    framing: 'left shoulder and back of head in foreground, face partially visible, POV perspective',
  },
  {
    type: 'over-shoulder-right',
    label: 'Over Shoulder Right',
    icon: '🎥',
    category: '180-arc',
    promptModifier: 'over-the-shoulder shot from behind right shoulder, camera looking past shoulder at what subject is facing, cinematic composition',
    focalLength: '35mm lens, depth of field showing shoulder in soft foreground blur',
    framing: 'right shoulder and back of head in foreground, face partially visible, POV perspective',
  },
];

// Ethnicity options for diverse representation
export const ETHNICITY_OPTIONS = [
  { id: 'caucasian', name: 'Caucasian/European' },
  { id: 'african', name: 'African/Black' },
  { id: 'east-asian', name: 'East Asian' },
  { id: 'south-asian', name: 'South Asian' },
  { id: 'hispanic', name: 'Hispanic/Latino' },
  { id: 'middle-eastern', name: 'Middle Eastern' },
  { id: 'mixed', name: 'Mixed/Multiracial' },
];

// Background presets - hyper-realistic UGC environments matching reference quality
export const BACKGROUND_PRESETS = [
  { id: 'podcast', name: 'Podcast Studio', prompt: 'professional podcast studio setup, sitting behind Shure SM7B microphone on boom arm, warm ambient studio lighting, vertical wood slat accent wall in background, green plant visible to side, neon sign partially visible, cream or neutral halter top or turtleneck, high ponytail with loose curled ends and face-framing pieces, small gold flower stud earrings, natural bronzed glowing skin, mid-speech expression talking to camera' },
  { id: 'car', name: 'In Car (Tesla)', prompt: 'sitting in Tesla Model 3/Y white vegan leather interior, bright natural daylight through windshield and windows, trees visible outside, car selfie angle from passenger perspective, sunglasses pushed up on head as hair accessory, black or navy tank top, small gold hoop earrings, genuine laughing smile showing teeth, relaxed happy expression, one hand gesturing while talking' },
  { id: 'mirror-selfie', name: 'Mirror Selfie', prompt: 'bedroom bathroom mirror selfie, holding iPhone 15 Pro visible in reflection, messy lived-in room background slightly visible, black tank top or casual tee, long wavy hair natural texture, minimal jewelry, casual peace sign or hair touch pose, natural no-makeup skin, slightly moody ambient bedroom lighting' },
  { id: 'highrise', name: 'High-Rise Night', prompt: 'luxury high-rise apartment with floor-to-ceiling windows, nighttime city skyline with bokeh lights visible through glass, dark sophisticated ambiance, black sleeveless top, hair pulled back in low bun or ponytail, holding product or glass in hands, talking to camera explaining something, elegant but approachable energy' },
  { id: 'couch', name: 'Living Room', prompt: 'sitting on modern neutral couch or sofa, cozy living room with plants and natural decor, soft natural window light from side, relaxed home setting, comfortable casual outfit, genuine conversational expression, lifestyle content creator vibe' },
  { id: 'coffee-shop', name: 'Coffee Shop', prompt: 'trendy coffee shop interior, warm ambient Edison bulb lighting, bokeh background with exposed brick or plants, holding coffee cup in hands, casual meetup aesthetic, oversized sweater or casual top, hair down natural, talking to friend across table vibe' },
  { id: 'gym', name: 'Gym / Fitness', prompt: 'modern gym environment with equipment visible, wearing sports bra or athletic tank, hair in high ponytail, AirPods in ears, post-workout glowing skin with natural sweat, confident motivational energy, filming workout content' },
  { id: 'outdoor', name: 'Outdoor Golden Hour', prompt: 'outdoor setting with beautiful golden hour sunlight, trees and greenery soft bokeh background, warm glowing rim light on hair, fresh natural makeup, casual summer outfit, genuine relaxed smile, authentic lifestyle portrait' },
  { id: 'office', name: 'Modern Office', prompt: 'contemporary office or co-working space, computer monitor visible, professional but approachable outfit, blazer or smart casual, natural window lighting from side, talking on video call or to camera, modern girlboss energy' },
  { id: 'studio', name: 'Studio Neutral', prompt: 'clean neutral gray or white studio backdrop, soft professional lighting with catchlights, classic headshot composition, polished professional outfit, confident approachable expression' },
  { id: 'kitchen', name: 'Kitchen', prompt: 'modern bright kitchen interior, white cabinets and marble counters, cooking or holding food, warm natural morning lighting, casual comfortable outfit, home chef or lifestyle content aesthetic' },
  { id: 'bedroom', name: 'Bedroom GRWM', prompt: 'cozy bedroom getting-ready setting, natural morning light through sheer curtains, sitting at vanity or on bed, casual loungewear or robe, doing makeup or hair, genuine candid moment, get-ready-with-me content style' },
  { id: 'rooftop', name: 'Rooftop Sunset', prompt: 'urban rooftop or balcony with city skyline, golden hour sunset lighting, cocktail or coffee in hand, stylish going-out outfit, hair styled, dramatic city backdrop, cosmopolitan lifestyle aesthetic' },
  { id: 'beach', name: 'Beach/Pool', prompt: 'beach or poolside setting, bright natural sunlight, swimwear cover-up or casual summer dress, sunglasses on head, tanned glowing skin, ocean or pool visible in background, vacation content vibes' },
];

// Style descriptions - focus on UGC creator styles
export const STYLE_OPTIONS = [
  { id: 'ugc', name: 'UGC Creator', description: 'Authentic TikTok/Instagram creator' },
  { id: 'lifestyle', name: 'Lifestyle', description: 'Polished influencer aesthetic' },
  { id: 'casual', name: 'Casual', description: 'Relaxed, everyday look' },
  { id: 'professional', name: 'Professional', description: 'Business attire, polished' },
  { id: 'fitness', name: 'Fitness', description: 'Athletic, workout style' },
];

// Style presets for hyper-realistic generation
export const STYLE_PRESETS = [
  { id: 'professional_headshot', name: 'Professional Headshot', description: 'Business attire, neutral background, warm lighting' },
  { id: 'lifestyle', name: 'Lifestyle', description: 'Casual setting, natural light, environmental context' },
  { id: 'editorial', name: 'Editorial', description: 'Fashion-forward, dramatic lighting, artistic composition' },
  { id: 'social_media', name: 'Social Media', description: 'Bright, engaging, platform-optimized framing' },
];

// Realism level presets
export const REALISM_LEVELS = [
  { id: 'standard', name: 'Standard', description: 'Clean, polished look' },
  { id: 'high', name: 'High', description: 'Detailed portrait, professional quality' },
  { id: 'ultra-realistic', name: 'Ultra-Realistic', description: '8K, Canon EOS R5 quality' },
];

// Look type options for generating variations
export const LOOK_TYPES = [
  { id: 'different_outfit', name: 'Different Outfit', description: 'Same person, new clothing style', icon: '👔' },
  { id: 'different_setting', name: 'Different Setting', description: 'Same person, new environment', icon: '🏖️' },
  { id: 'different_expression', name: 'Different Expression', description: 'Same person, new mood/pose', icon: '😊' },
  { id: 'different_angle', name: 'Different Angle', description: 'Same person, new camera angle', icon: '📐' },
];

// Camera device options
export const CAMERA_DEVICE_OPTIONS = [
  { id: 'iphone', name: 'iPhone', description: 'Natural Apple color science' },
  { id: 'samsung', name: 'Samsung', description: 'Vibrant AMOLED colors' },
];

// Aspect ratio options
export const ASPECT_RATIO_OPTIONS = [
  { id: '9:16', name: 'Vertical (9:16)', dimensions: '576 × 1024 px' },
  { id: '6:19', name: 'Tall (6:19)', dimensions: '324 × 1024 px' },
];

export function useAvatarGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAngles, setIsGeneratingAngles] = useState(false);
  const { getApiKey, hasApiKey } = useGeminiKey();

  const generateAvatar = useCallback(async (params: AvatarGenerationParams): Promise<AvatarGenerationResult> => {
    // Use localStorage key if available; edge function falls back to server env var
    const apiKey = getApiKey() || undefined;

    // No rate limit check - image generation is unlimited
    setIsGenerating(true);

    try {
      // Get the background prompt from preset
      const backgroundPreset = BACKGROUND_PRESETS.find(b => b.id === params.background);
      // Get angle preset if specified
      const anglePreset = params.angleType 
        ? ANGLE_PRESETS.find(a => a.type === params.angleType) 
        : null;
      
      const result = await supabase.functions.invoke('generate-avatar', {
        body: {
          ...params,
          backgroundPrompt: backgroundPreset?.prompt || params.backgroundPrompt,
          apiKey,
          cameraDevice: params.cameraDevice || 'iphone',
          aspectRatio: params.aspectRatio || '3:4',
          realism: params.realism ?? 0.7,
          wideAngle: params.wideAngle ?? 0.5,
          // Angle-specific prompts
          angleType: params.angleType,
          anglePromptModifier: anglePreset?.promptModifier,
          angleFocalLength: anglePreset?.focalLength,
          angleFraming: anglePreset?.framing,
          // Reference image
          referenceImageUrl: params.referenceImageUrl,
          // Hyper-realistic controls
          realism_level: params.realism_level,
          style_preset: params.style_preset,
          // Look generation
          look_type: params.look_type,
          look_description: params.look_description,
          avatar_description: params.avatar_description,
        },
      });

      if (result.error) {
        console.error('Edge function error:', result.error);
        toast.error('Failed to generate avatar');
        return { success: false, error: result.error.message };
      }

      const data = result.data;
      
      if (!data?.success || !data?.imageUrl) {
        console.error('Generation failed:', data);
        toast.error(data?.error || 'Failed to generate avatar');
        return { success: false, error: data?.error || 'Unknown error' };
      }

      toast.success('Avatar generated successfully!', {
        description: 'Powered by Nano Banana Pro',
      });

      return {
        success: true,
        imageUrl: data.imageUrl,
        storagePath: data.storagePath,
      };

    } catch (error) {
      console.error('Avatar generation error:', error);
      toast.error('Failed to generate avatar');
      return { success: false, error: String(error) };
    } finally {
      setIsGenerating(false);
    }
  }, [getApiKey, hasApiKey]);

  // Generate all 4 camera angles in parallel
  const generateAngles = useCallback(async (
    baseParams: Omit<AvatarGenerationParams, 'angleType'>,
    selectedAngles: AvatarAngle[] = ['close-up', 'medium', 'wide', 'side-profile'],
    onProgress?: (angle: AvatarAngle, status: 'generating' | 'completed' | 'failed') => void
  ): Promise<GeneratedAngle[]> => {
    // Use localStorage key if available; edge function falls back to server env var
    const apiKey = getApiKey() || undefined;

    setIsGeneratingAngles(true);

    try {
      // Generate all angles in parallel
      const results = await Promise.all(
        selectedAngles.map(async (angleType): Promise<GeneratedAngle> => {
          onProgress?.(angleType, 'generating');
          
          const result = await generateAvatar({
            ...baseParams,
            angleType,
          });

          if (result.success && result.imageUrl) {
            onProgress?.(angleType, 'completed');
            return { angle: angleType, imageUrl: result.imageUrl, status: 'completed' };
          } else {
            onProgress?.(angleType, 'failed');
            return { angle: angleType, imageUrl: '', status: 'failed', error: result.error };
          }
        })
      );

      const successCount = results.filter(r => r.status === 'completed').length;
      if (successCount === selectedAngles.length) {
        toast.success(`Generated all ${successCount} camera angles!`);
      } else if (successCount > 0) {
        toast.success(`Generated ${successCount}/${selectedAngles.length} angles`);
      }

      return results;
    } catch (error) {
      console.error('Angle generation error:', error);
      toast.error('Failed to generate angles');
      return selectedAngles.map(angle => ({ angle, imageUrl: '', status: 'failed' as const, error: String(error) }));
    } finally {
      setIsGeneratingAngles(false);
    }
  }, [generateAvatar, getApiKey, hasApiKey]);

  return {
    generateAvatar,
    generateAngles,
    isGenerating,
    isGeneratingAngles,
    hasApiKey,
    ETHNICITY_OPTIONS,
    BACKGROUND_PRESETS,
    STYLE_OPTIONS,
    STYLE_PRESETS,
    REALISM_LEVELS,
    LOOK_TYPES,
    CAMERA_DEVICE_OPTIONS,
    ASPECT_RATIO_OPTIONS,
    ANGLE_PRESETS,
  };
}
