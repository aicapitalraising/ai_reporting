// Video Batch Types

export type IngredientType = 'avatar' | 'broll' | 'mixed';

export interface StoryboardScene {
  id: string;
  order: number;
  prompt: string;
  duration: number; // Always 8 seconds for Veo3
  ingredientType: IngredientType;
  avatarId?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  operationId?: string;
  // Extended scene fields for detailed scene control
  action?: string; // What happens in this scene
  lipSyncLine?: string; // Dialogue/voiceover for this segment
  cameraAngle?: string; // Camera perspective (close-up, wide, etc.)
  imageUrl?: string; // Generated scene image for image-to-video
}

export interface VideoScript {
  id: string;
  projectId: string;
  title: string;
  rawContent: string;
  scenes: StoryboardScene[];
  createdAt: string;
}

export interface VideoGenerationConfig {
  aspectRatio: '16:9' | '9:16';
  ingredientType: IngredientType;
  selectedAvatarId?: string;
  useVoiceover?: boolean;
}
