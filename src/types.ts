export type VisualEra =
  | 'deck-gothic'
  | 'ps1-low-poly'
  | 'anime-finale'
  | 'stealth-ops';

export type SceneRuntime = 'three' | 'dom';

export interface FallbackRigDefinition {
  colors: {
    base: string;
    trim: string;
    accent: string;
    outline: string;
  };
}

export interface DialogueSequenceDefinition {
  speakerId?: string;
  speakerLabel: string;
  lines: string[];
}

export interface WorldDialogueSequenceDefinition extends DialogueSequenceDefinition {
  anchor: 'player' | 'enemy';
}

export interface SpriteSheetFrame {
  x: number;
  y: number;
}

export interface SpriteSheetSpec {
  image: string;
  sheetWidth: number;
  sheetHeight: number;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  displayHeight: number;
  frameDurationMs: number;
  frames: readonly SpriteSheetFrame[];
}

export interface SpriteSheetPoseAsset {
  kind: 'sprite-sheet';
  sheet: SpriteSheetSpec;
}

export interface StaticImagePoseAsset {
  kind: 'static-image';
  image: string;
}

export type ActorPoseAsset = SpriteSheetPoseAsset | StaticImagePoseAsset;

export interface ActorVisualDefinition {
  actorId: string;
  label: string;
  defaultFacing: 'left' | 'right';
  worldLayoutHeight: number;
  battleLayoutHeight: number;
  poses: Record<string, ActorPoseAsset>;
}

export interface SceneAudioAssetDefinition {
  id?: string;
  src?: string;
  label?: string;
  loop?: boolean;
  volume?: number;
  startTime?: number;
  resume?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
}

export type SceneAudioSource = string | SceneAudioAssetDefinition;

export interface SceneAudioHookDefinition {
  music?: string;
  voice?: string;
  sfx?: string;
  restartMusic?: boolean;
  restartVoice?: boolean;
  pauseMusic?: boolean;
  stopMusic?: boolean;
  stopVoice?: boolean;
}

export interface SceneAudioConfig {
  tracks: Record<string, SceneAudioSource>;
  cues?: Record<string, string>;
  voice?: Record<string, SceneAudioSource>;
  sfx?: Record<string, SceneAudioSource>;
  hooks?: Record<string, SceneAudioHookDefinition>;
}

export type ActTwoModelRole = 'hero' | 'partner' | 'enemy-standard' | 'enemy-boss';

export type ActTwoModelPackaging = 'single-glb-multi-clip' | 'per-clip-glb-shared-rig';

export type ActTwoAnimationPhase = 'exploration' | 'battle';

export type ActTwoAnimationSlot =
  | 'exploration-idle'
  | 'exploration-move'
  | 'battle-start'
  | 'battle-idle'
  | 'battle-guard'
  | 'battle-attack'
  | 'battle-hit'
  | 'battle-defeat'
  | 'battle-skill'
  | 'battle-victory';

export type ActTwoAnimationStatus = 'missing' | 'ready';

export interface ActTwoAnimationBinding {
  slot: ActTwoAnimationSlot;
  phase: ActTwoAnimationPhase;
  required: boolean;
  status: ActTwoAnimationStatus;
  file?: string;
  clipNameHint?: string;
  notes?: string;
}

export interface ActTwoModelSpec {
  actorId: string;
  label: string;
  role: ActTwoModelRole;
  packaging: ActTwoModelPackaging;
  rootDirectory: string;
  bindings: ActTwoAnimationBinding[];
}

export interface ActTwoModelSchema {
  version: number;
  conventions: string[];
  actorSpecs: ActTwoModelSpec[];
}

export interface RelicDefinition {
  id: string;
  name: string;
  comedicTheme: string;
  bossSource: string;
  transformationRole: string;
  pixelLabel: string;
  finaleLabel: string;
  color: string;
  imagePath?: string;
}

export interface BossEncounterDefinition {
  id: string;
  name: string;
  role: string;
  dramaticTagline: string;
  comedicTheme: string;
  introLine: string;
  victoryLine: string;
  tauntLines: string[];
  attackPatternDescription: string;
}

export interface SceneDefinition {
  id: string;
  actNumber: number;
  title: string;
  subtitle: string;
  homage?: string;
  visualEra: VisualEra;
  runtime: SceneRuntime;
  objective: string;
  controls: string;
  intro: string;
  outro: string;
  mechanicsHighlights?: string[];
  partyRoster?: string[];
  enemyRoster?: string[];
  backgroundImage?: string;
  backgroundImagePosition?: string;
  backgroundFloorOffset?: string;
  audio?: SceneAudioConfig;
  palette: {
    background: string;
    accent: string;
    ui: string;
  };
  bossEncounter?: BossEncounterDefinition;
  relicReward?: RelicDefinition;
}

export interface TransformationStep {
  relicId: string;
  callout: string;
  effect: string;
  roleLabel: string;
}

export interface TransformationSequence {
  finalFormName: string;
  introCopy: string;
  steps: TransformationStep[];
  finalCallout: string;
}

export interface FinalePromptConfig {
  label: string;
  copy: string;
  payoffBeats: string[];
  heartfeltCopy: string[];
}

export interface GameContent {
  fallbackRig: FallbackRigDefinition;
  relics: RelicDefinition[];
  scenes: SceneDefinition[];
  transformation: TransformationSequence;
  finalePrompt: FinalePromptConfig;
}
