import type { SceneAudioConfig, SceneAudioSource, SceneDefinition } from '../types';

const AUDIO_SOURCE_PATTERN = /^(\/|https?:\/\/|data:|blob:)|\.(mp3|m4a|ogg|wav|aac|flac)(\?|#|$)/i;
interface ResolvedAudioAsset {
  id: string;
  src?: string;
  loop?: boolean;
  volume?: number;
  startTime?: number;
  resume?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
}

interface PlayOptions {
  restart?: boolean;
}

export interface SceneAudioController {
  setScene: (scene: SceneDefinition) => void;
  preloadScene: (scene: SceneDefinition) => void;
  recoverPlayback: () => void;
  playHook: (hookId: string, options?: PlayOptions) => boolean;
  playMusicCue: (cueId: string, options?: PlayOptions) => boolean;
  playTrack: (trackId: string, options?: PlayOptions) => boolean;
  playVoice: (voiceId: string, options?: PlayOptions) => boolean;
  playSfx: (sfxId: string, options?: PlayOptions) => boolean;
  pauseMusic: () => void;
  stopMusic: () => void;
  stopVoice: () => void;
  stopSfx: () => void;
  stopAll: () => void;
}

function clampMediaElementVolume(volume: number | undefined): number {
  if (volume === undefined) {
    return 1;
  }

  return Math.min(Math.max(volume, 0), 1);
}

function normalizeOutputGain(volume: number | undefined): number {
  if (volume === undefined) {
    return 1;
  }

  return Math.max(volume, 0);
}

function isAudioSource(value: string): boolean {
  return AUDIO_SOURCE_PATTERN.test(value);
}

function resolveAudioAsset(key: string, source: SceneAudioSource): ResolvedAudioAsset {
  if (typeof source === 'string') {
    const sourceIsFile = isAudioSource(source);
    return {
      id: sourceIsFile ? key : source,
      src: sourceIsFile ? source : undefined,
    };
  }

  return {
    id: source.id ?? key,
    src: source.src,
    loop: source.loop,
    volume: source.volume,
    startTime: source.startTime,
    resume: source.resume,
    preload: source.preload,
  };
}

function createAudioElement(asset: ResolvedAudioAsset, defaultLoop: boolean): HTMLAudioElement {
  const audio = new Audio(asset.src);
  audio.loop = asset.loop ?? defaultLoop;
  audio.volume = clampMediaElementVolume(asset.volume);
  audio.preload = asset.preload ?? 'auto';
  audio.load();
  return audio;
}

interface MusicGainRoute {
  source: MediaElementAudioSourceNode;
  gain: GainNode;
}

export class SceneAudioManager implements SceneAudioController {
  private currentScene?: SceneDefinition;
  private musicEl?: HTMLAudioElement;
  private voiceEl?: HTMLAudioElement;
  private readonly sfxEls = new Set<HTMLAudioElement>();
  private currentMusicSrc?: string;
  private currentMusicAsset?: ResolvedAudioAsset;
  private musicPositions = new Map<string, number>();
  private preloadEls = new Map<string, HTMLAudioElement>();
  private mutedFallbackUnmuteAttempts = new WeakSet<HTMLAudioElement>();
  private audioContext?: AudioContext;
  private musicGainRoutes = new WeakMap<HTMLAudioElement, MusicGainRoute>();

  setScene(scene: SceneDefinition): void {
    this.currentScene = scene;
    this.preloadScene(scene);
  }

  preloadScene(scene: SceneDefinition): void {
    const audio = scene.audio;
    if (!audio) {
      return;
    }

    Object.entries(audio.tracks).forEach(([key, source]) => this.preloadAsset(resolveAudioAsset(key, source)));
    Object.entries(audio.voice ?? {}).forEach(([key, source]) => this.preloadAsset(resolveAudioAsset(key, source)));
    Object.entries(audio.sfx ?? {}).forEach(([key, source]) => this.preloadAsset(resolveAudioAsset(key, source)));
  }

  playHook(hookId: string, options: PlayOptions = {}): boolean {
    const hook = this.getAudioConfig()?.hooks?.[hookId];
    if (!hook) {
      return false;
    }

    let didPlay = false;
    if (hook.stopVoice) {
      this.stopVoice();
    }
    if (hook.stopMusic) {
      this.stopMusic();
    } else if (hook.pauseMusic) {
      this.pauseMusic();
    }
    if (hook.music) {
      didPlay = this.playMusicCue(hook.music, { restart: hook.restartMusic ?? options.restart }) || didPlay;
    }
    if (hook.voice) {
      didPlay = this.playVoice(hook.voice, { restart: hook.restartVoice ?? options.restart }) || didPlay;
    }
    if (hook.sfx) {
      didPlay = this.playSfx(hook.sfx, options) || didPlay;
    }

    return didPlay;
  }

  playMusicCue(cueId: string, options: PlayOptions = {}): boolean {
    const audio = this.getAudioConfig();
    const trackId = audio?.cues?.[cueId] ?? cueId;
    return this.playTrack(trackId, options);
  }

  playTrack(trackId: string, options: PlayOptions = {}): boolean {
    const audio = this.getAudioConfig();
    if (!audio) {
      return false;
    }

    const asset = this.resolveFromMap(trackId, audio.tracks);
    if (!asset?.src) {
      return false;
    }

    const isSameTrack = this.currentMusicSrc === asset.src;
    if (this.currentMusicSrc !== asset.src) {
      this.stopMusic();
      this.musicEl = this.getAudioElement(asset, true);
      this.currentMusicSrc = asset.src;
      this.currentMusicAsset = asset;
    }

    if (!this.musicEl) {
      return false;
    }

    this.currentMusicAsset = asset;
    this.musicEl.loop = asset.loop ?? true;
    this.configureMusicOutput(asset);
    this.musicEl.muted = false;

    if (options.restart) {
      this.musicEl.currentTime = Math.max(asset.startTime ?? 0, 0);
      this.musicPositions.delete(this.getMusicPositionKey(asset));
    } else if (this.musicEl.paused) {
      const savedPosition = asset.resume ? this.musicPositions.get(this.getMusicPositionKey(asset)) : undefined;
      if (savedPosition !== undefined) {
        this.musicEl.currentTime = savedPosition;
      } else if (!isSameTrack || !asset.resume) {
        this.musicEl.currentTime = Math.max(asset.startTime ?? 0, 0);
      }
    }

    this.playMusicElement();
    return true;
  }

  playVoice(voiceId: string, options: PlayOptions = {}): boolean {
    const audio = this.getAudioConfig();
    if (!audio?.voice) {
      return false;
    }

    const asset = this.resolveFromMap(voiceId, audio.voice);
    if (!asset?.src) {
      return false;
    }

    this.stopVoice();
    this.voiceEl = this.getAudioElement(asset, false);
    this.voiceEl.loop = asset.loop ?? false;
    this.voiceEl.volume = clampMediaElementVolume(asset.volume);
    this.voiceEl.muted = false;
    if (options.restart) {
      this.voiceEl.currentTime = 0;
    }

    this.playVoiceElement();
    return true;
  }

  playSfx(sfxId: string, options: PlayOptions = {}): boolean {
    const audio = this.getAudioConfig();
    if (!audio?.sfx) {
      return false;
    }

    const asset = this.resolveFromMap(sfxId, audio.sfx);
    if (!asset?.src) {
      return false;
    }

    const sfxEl = createAudioElement(asset, false);
    sfxEl.loop = asset.loop ?? false;
    sfxEl.volume = clampMediaElementVolume(asset.volume);
    sfxEl.muted = false;
    if (options.restart || asset.startTime) {
      sfxEl.currentTime = Math.max(asset.startTime ?? 0, 0);
    }

    const cleanup = (): void => {
      sfxEl.removeEventListener('ended', cleanup);
      sfxEl.removeEventListener('error', cleanup);
      this.sfxEls.delete(sfxEl);
    };
    sfxEl.addEventListener('ended', cleanup);
    sfxEl.addEventListener('error', cleanup);
    this.sfxEls.add(sfxEl);

    void sfxEl.play().catch(cleanup);
    return true;
  }

  recoverPlayback(): void {
    if (this.musicEl) {
      this.musicEl.muted = false;
      this.resumeAudioContext();
      if (this.musicEl.paused) {
        this.playMusicElement();
      }
    }

    if (this.voiceEl) {
      this.voiceEl.muted = false;
      if (this.voiceEl.paused) {
        this.playVoiceElement();
      }
    }

    this.sfxEls.forEach((sfxEl) => {
      sfxEl.muted = false;
      if (sfxEl.paused) {
        void sfxEl.play().catch(() => {
          this.sfxEls.delete(sfxEl);
        });
      }
    });
  }

  pauseMusic(): void {
    this.rememberMusicPosition();
    this.musicEl?.pause();
  }

  stopMusic(): void {
    this.rememberMusicPosition();
    this.musicEl?.pause();
    this.musicEl = undefined;
    this.currentMusicSrc = undefined;
    this.currentMusicAsset = undefined;
  }

  stopVoice(): void {
    this.voiceEl?.pause();
    this.voiceEl = undefined;
  }

  stopSfx(): void {
    this.sfxEls.forEach((sfxEl) => {
      sfxEl.pause();
    });
    this.sfxEls.clear();
  }

  stopAll(): void {
    this.stopSfx();
    this.stopVoice();
    this.stopMusic();
  }

  private getAudioConfig(): SceneAudioConfig | undefined {
    return this.currentScene?.audio;
  }

  private getMusicPositionKey(asset: ResolvedAudioAsset): string {
    return asset.src ?? asset.id;
  }

  private rememberMusicPosition(): void {
    if (!this.musicEl || !this.currentMusicAsset?.resume) {
      return;
    }

    const position = Number.isFinite(this.musicEl.currentTime) ? this.musicEl.currentTime : 0;
    this.musicPositions.set(this.getMusicPositionKey(this.currentMusicAsset), Math.max(position, 0));
  }

  private playMusicElement(): void {
    const musicEl = this.musicEl;
    if (!musicEl) {
      return;
    }

    this.resumeAudioContext();
    void musicEl.play().then(() => {
      this.mutedFallbackUnmuteAttempts.delete(musicEl);
    }).catch(() => {
      if (musicEl !== this.musicEl) {
        return;
      }

      this.startMutedMusicFallback(musicEl);
    });
  }

  private startMutedMusicFallback(musicEl: HTMLAudioElement): void {
    if (musicEl !== this.musicEl || !musicEl.paused) {
      return;
    }

    musicEl.muted = true;
    void musicEl.play().then(() => {
      if (musicEl !== this.musicEl) {
        return;
      }
      this.scheduleMutedMusicUnmute(musicEl);
    }).catch(() => {
      // Browsers can keep blocking even muted playback in edge cases. Runtime flow stays silent.
    });
  }

  private scheduleMutedMusicUnmute(musicEl: HTMLAudioElement): void {
    if (this.mutedFallbackUnmuteAttempts.has(musicEl)) {
      return;
    }

    this.mutedFallbackUnmuteAttempts.add(musicEl);
    window.setTimeout(() => {
      if (musicEl !== this.musicEl) {
        return;
      }

      musicEl.muted = false;
      this.resumeAudioContext();
      if (musicEl.paused) {
        this.playMusicElement();
      }
    }, 0);
  }

  private playVoiceElement(): void {
    const voiceEl = this.voiceEl;
    if (!voiceEl) {
      return;
    }

    void voiceEl.play().then(() => {
    }).catch(() => {
      // Voice should never block a scene if browser autoplay rules reject it.
    });
  }

  private preloadAsset(asset: ResolvedAudioAsset): void {
    if (!asset.src || this.preloadEls.has(asset.src)) {
      return;
    }

    this.preloadEls.set(asset.src, createAudioElement(asset, false));
  }

  private getAudioElement(asset: ResolvedAudioAsset, defaultLoop: boolean): HTMLAudioElement {
    const preloaded = asset.src ? this.preloadEls.get(asset.src) : undefined;
    const audio = preloaded ?? createAudioElement(asset, defaultLoop);
    audio.loop = asset.loop ?? defaultLoop;
    audio.volume = clampMediaElementVolume(asset.volume);
    return audio;
  }

  private configureMusicOutput(asset: ResolvedAudioAsset): void {
    if (!this.musicEl) {
      return;
    }

    const route = asset.volume !== undefined && asset.volume > 1
      ? this.ensureMusicGainRoute(this.musicEl)
      : this.musicGainRoutes.get(this.musicEl);
    if (route) {
      this.musicEl.volume = 1;
      route.gain.gain.value = normalizeOutputGain(asset.volume);
      return;
    }

    this.musicEl.volume = clampMediaElementVolume(asset.volume);
  }

  private ensureMusicGainRoute(audio: HTMLAudioElement): MusicGainRoute | null {
    const existingRoute = this.musicGainRoutes.get(audio);
    if (existingRoute) {
      return existingRoute;
    }

    const context = this.ensureAudioContext();
    if (!context) {
      return null;
    }

    const source = context.createMediaElementSource(audio);
    const gain = context.createGain();
    source.connect(gain);
    gain.connect(context.destination);

    const route = { source, gain };
    this.musicGainRoutes.set(audio, route);
    return route;
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.audioContext) {
      return this.audioContext;
    }

    const AudioContextConstructor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) {
      return null;
    }

    this.audioContext = new AudioContextConstructor();
    return this.audioContext;
  }

  private resumeAudioContext(): void {
    if (this.audioContext?.state === 'suspended') {
      void this.audioContext.resume().catch(() => {
        // Browser autoplay policy can still reject a resume outside trusted input.
      });
    }
  }

  private resolveFromMap(
    requestedId: string,
    sourceMap: Record<string, SceneAudioSource>,
  ): ResolvedAudioAsset | null {
    const directSource = sourceMap[requestedId];
    if (directSource) {
      return resolveAudioAsset(requestedId, directSource);
    }

    for (const [key, source] of Object.entries(sourceMap)) {
      const resolved = resolveAudioAsset(key, source);
      if (resolved.id === requestedId) {
        return resolved;
      }
    }

    return isAudioSource(requestedId) ? resolveAudioAsset(requestedId, requestedId) : null;
  }
}
