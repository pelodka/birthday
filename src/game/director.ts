import { AUDIO_HOOKS } from '../audio/hooks';
import { SceneAudioManager, type SceneAudioController } from '../audio/sceneAudio';
import { GamepadInputManager } from '../input/gamepad';
import type { GameContent, SceneDefinition } from '../types';
import { escapeAttribute, escapeCssUrl, escapeCssValue, escapeHtml } from './domMarkup';

const INTRO_VIDEO_SRC = '/video/intro-loud.mp4';
const INTRO_VIDEO_START_SECONDS = 5;
const INTRO_VIDEO_AUDIO_END_SECONDS = 32;
const INTRO_VIDEO_VISUAL_LEAD_OUT_SECONDS = 1.25;
const INTRO_VIDEO_VISUAL_END_SECONDS = INTRO_VIDEO_AUDIO_END_SECONDS - INTRO_VIDEO_VISUAL_LEAD_OUT_SECONDS;
const INTRO_VIDEO_FADE_OUT_MS = 320;
const INTRO_TITLE_CARD_DURATION_MS = 1700;
const LOCATION_TITLE_CARD_SFX_SRC = '/audio/shared/sfx/among-us-reveal.mp3';
const LOCATION_TITLE_CARD_SFX_END_GRACE_MS = 120;
const LOCATION_TITLE_CARD_MAX_DURATION_MS = 10000;
const INTRO_LOCATION_TITLE_CARD = { place: 'САНКТ-ПЕТЕРБУРГ', year: '2020' } as const;
const INTER_ACT_TITLE_CARDS: Record<string, { place: string; year?: string }> = {
  'act-1-calendar': { place: 'ЕРЕВАН', year: '2022' },
  'act-2-catchphrase': { place: 'БЕРЛИН', year: '2025' },
  'act-3-weekend': { place: 'ЮБИЛЕЙ' },
};

interface DirectorLaunchOptions {
  startSceneId?: string;
  autoplay?: boolean;
}

type SceneCleanup = () => void;

interface SceneMountContext {
  target: HTMLElement;
  scene: SceneDefinition;
  content: GameContent;
  input: GamepadInputManager;
  audio: SceneAudioController;
  onComplete: () => void;
  onRestart: () => void;
  onStatusChange: (copy: string) => void;
}

interface SceneRuntimeRegistration {
  preload: () => Promise<unknown>;
  mount: (context: SceneMountContext) => Promise<SceneCleanup>;
}

const SCENE_RUNTIME_REGISTRY: Record<string, SceneRuntimeRegistration> = {
  'act-1-calendar': {
    preload: () => import('./domActs'),
    mount: async ({ target, scene, content, input, audio, onComplete, onRestart, onStatusChange }) => {
      const { mountDomEncounter } = await import('./domActs');
      return mountDomEncounter({
        target,
        scene,
        content,
        input,
        audio,
        onComplete,
        onRestart,
        onStatusChange,
      });
    },
  },
  'act-2-catchphrase': {
    preload: () => import('./actTwoThree'),
    mount: async ({ target, scene, content, input, audio, onComplete, onStatusChange }) => {
      const { mountActTwoThree } = await import('./actTwoThree');
      return mountActTwoThree({
        target,
        scene,
        fallbackRig: content.fallbackRig,
        input,
        audio,
        onComplete,
        onStatusChange,
      });
    },
  },
  'act-3-weekend': {
    preload: () => import('./threeAct'),
    mount: async ({ target, scene, input, audio, onComplete, onStatusChange }) => {
      const { mountThreeEncounter } = await import('./threeAct');
      return mountThreeEncounter({
        target,
        scene,
        input,
        audio,
        onComplete,
        onStatusChange,
      });
    },
  },
  'act-4-finale': {
    preload: () => import('./domActs'),
    mount: async ({ target, scene, content, input, audio, onComplete, onRestart, onStatusChange }) => {
      const { mountDomEncounter } = await import('./domActs');
      return mountDomEncounter({
        target,
        scene,
        content,
        input,
        audio,
        onComplete,
        onRestart,
        onStatusChange,
      });
    },
  },
};

export class EraRoastDirector {
  private readonly root: HTMLElement;
  private readonly content: GameContent;
  private readonly launchOptions: DirectorLaunchOptions;
  private readonly input = new GamepadInputManager();
  private readonly audio = new SceneAudioManager();
  private currentSceneIndex = 0;
  private readonly collectedRelics = new Set<string>();
  private activeCleanup?: () => void;
  private introVideoCleanup?: () => void;
  private introVideoEl?: HTMLVideoElement;
  private inputCleanup?: () => void;
  private readonly titleCardSfxEls = new Set<HTMLAudioElement>();
  private introTitleCardTimeoutId = 0;
  private titleCardSequence = 0;
  private stageShellEl!: HTMLDivElement;
  private stageEl!: HTMLDivElement;
  private overlayEl!: HTMLDivElement;
  private sceneStatusEl!: HTMLParagraphElement;
  private relicRackEl!: HTMLDivElement;

  constructor(root: HTMLElement, content: GameContent, launchOptions: DirectorLaunchOptions = {}) {
    this.root = root;
    this.content = content;
    this.launchOptions = launchOptions;
  }

  render(): void {
    this.root.innerHTML = `
      <div class="app-shell">
        <div class="stage-shell" data-era="briefing">
          <div class="persistent-relic-rack" data-persistent-relics></div>
          <div class="stage" data-stage></div>
          <div class="overlay overlay--visible" data-overlay></div>
          <p class="scene-status" data-scene-status aria-live="polite"></p>
        </div>
      </div>
    `;

    this.stageShellEl = this.root.querySelector<HTMLDivElement>('.stage-shell')!;
    this.stageEl = this.root.querySelector<HTMLDivElement>('[data-stage]')!;
    this.overlayEl = this.root.querySelector<HTMLDivElement>('[data-overlay]')!;
    this.sceneStatusEl = this.root.querySelector<HTMLParagraphElement>('[data-scene-status]')!;
    this.relicRackEl = this.root.querySelector<HTMLDivElement>('[data-persistent-relics]')!;
    this.renderPersistentRelics();
    this.bindGlobalInput();
    this.input.start();

    if (this.launchOptions.startSceneId) {
      this.startFromScene(this.launchOptions.startSceneId, this.launchOptions.autoplay ?? false);
      return;
    }

    this.showIntro();
  }

  private startFromScene(sceneId: string, autoplay: boolean): void {
    const sceneIndex = this.content.scenes.findIndex((scene) => scene.id === sceneId);
    if (sceneIndex < 0) {
      this.showIntro();
      return;
    }

    this.currentSceneIndex = sceneIndex;
    this.collectedRelics.clear();

    this.content.scenes.slice(0, sceneIndex).forEach((scene) => {
      if (scene.relicReward) {
        this.collectedRelics.add(scene.relicReward.id);
      }
    });
    this.renderPersistentRelics();

    const scene = this.content.scenes[sceneIndex]!;
    if (autoplay) {
      this.updateSceneChrome(scene);
      void this.playScene(scene);
      return;
    }

    this.showBriefing(scene);
  }

  private showIntro(): void {
    this.stopIntroVideo();
    this.audio.stopAll();
    this.currentSceneIndex = 0;
    this.collectedRelics.clear();
    this.renderPersistentRelics();
    const firstScene = this.content.scenes[0];
    this.clearStage();
    if (firstScene) {
      this.updateSceneChrome(firstScene);
    } else {
      this.stageShellEl.dataset.era = 'briefing';
      this.sceneStatusEl.textContent = 'Ready to begin.';
    }

    this.showOverlay(`
      <section class="start-screen" aria-label="Start">
        <button class="app-button app-button--bright app-button--mega" data-action="start" type="button">
          CLICK ME
        </button>
      </section>
    `);

    this.overlayEl.querySelector<HTMLButtonElement>('[data-action="start"]')?.addEventListener(
      'click',
      () => {
        const openingScene = this.content.scenes[0];
        if (openingScene) {
          this.preloadSceneRuntime(openingScene);
          this.playIntroVideo(() => {
            this.showPastHandoff(() => {
              this.playLocationTitleCard(INTRO_LOCATION_TITLE_CARD.place, INTRO_LOCATION_TITLE_CARD.year, () => {
                void this.playScene(openingScene);
              });
            });
          });
        }
      },
      { once: true },
    );
  }

  private showBriefing(scene: SceneDefinition): void {
    this.stopIntroVideo();
    this.clearStage();
    this.audio.setScene(scene);
    this.audio.playHook(AUDIO_HOOKS.director.briefing);
    this.updateSceneChrome(scene);

    const relicReward = scene.relicReward;
    const relicPreviewVisual = relicReward?.imagePath
      ? `<img class="relic-preview__image" src="${escapeAttribute(relicReward.imagePath)}" alt="" aria-hidden="true" decoding="async">`
      : '';
    const relicMarkup = relicReward
      ? `
        <div class="relic-preview" style="--relic-color:${escapeCssValue(relicReward.color)}">
          ${relicPreviewVisual}
          <strong>${escapeHtml(relicReward.name)}</strong>
          <span>${escapeHtml(relicReward.transformationRole)}</span>
        </div>
      `
      : '';

    this.showOverlay(`
      <section class="overlay-card overlay-card--briefing">
        <p class="eyebrow">Act ${scene.actNumber}</p>
        <h2>${escapeHtml(scene.title)}</h2>
        <p>${escapeHtml(scene.intro)}</p>
        <p>${escapeHtml(scene.objective)}</p>
        <p class="overlay-card__controls">${escapeHtml(scene.controls)}</p>
        ${relicMarkup}
        <button class="app-button app-button--bright" data-action="play" type="button" aria-label="${escapeAttribute(`Enter Act ${scene.actNumber}`)}">Press X</button>
      </section>
    `);

    this.overlayEl.querySelector<HTMLButtonElement>('[data-action="play"]')?.addEventListener(
      'click',
      () => {
        void this.playScene(scene);
      },
      { once: true },
    );
  }

  private playIntroVideo(onComplete: () => void): void {
    this.stopIntroVideo();
    this.audio.stopAll();
    this.clearStage();
    this.sceneStatusEl.textContent = 'Rolling intro reel...';

    this.showOverlay(`
      <section class="intro-video" aria-label="Intro video">
        <video class="intro-video__media" data-intro-video playsinline preload="auto">
          <source src="${INTRO_VIDEO_SRC}" type="video/mp4" />
        </video>
        <button class="app-button intro-video__skip" data-action="skip-intro" type="button">
          Press X
        </button>
      </section>
    `);
    this.overlayEl.classList.add('overlay--video');

    const videoEl = this.overlayEl.querySelector<HTMLVideoElement>('[data-intro-video]');
    const skipButtonEl = this.overlayEl.querySelector<HTMLButtonElement>('[data-action="skip-intro"]');

    if (!videoEl) {
      onComplete();
      return;
    }

    this.introVideoEl = videoEl;

    let rafId = 0;
    let finishTimeoutId = 0;
    let isComplete = false;
    let isVideoEnding = false;
    let hasPlaybackStarted = false;

    const cleanup = (): void => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (finishTimeoutId) {
        window.clearTimeout(finishTimeoutId);
        finishTimeoutId = 0;
      }
      videoEl.pause();
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoEl.removeEventListener('ended', finish);
      videoEl.removeEventListener('error', finish);
      skipButtonEl?.removeEventListener('click', finish);
      this.overlayEl.classList.remove('overlay--video');
      this.overlayEl.classList.remove('overlay--video-ending');
      if (this.introVideoCleanup === cleanup) {
        this.introVideoCleanup = undefined;
      }
      if (this.introVideoEl === videoEl) {
        this.introVideoEl = undefined;
      }
    };

    const beginVisualEnding = (): void => {
      if (isVideoEnding) {
        return;
      }
      isVideoEnding = true;
      this.overlayEl.classList.add('overlay--video-ending');
    };

    const finish = (): void => {
      if (isComplete) {
        return;
      }
      isComplete = true;
      this.sceneStatusEl.textContent = 'Act 1 loading...';
      beginVisualEnding();
      finishTimeoutId = window.setTimeout(() => {
        cleanup();
        onComplete();
      }, INTRO_VIDEO_FADE_OUT_MS);
    };

    const monitorPlayback = (): void => {
      if (isComplete) {
        return;
      }

      if (videoEl.currentTime >= INTRO_VIDEO_VISUAL_END_SECONDS) {
        beginVisualEnding();
      }

      if (videoEl.currentTime >= INTRO_VIDEO_AUDIO_END_SECONDS) {
        videoEl.currentTime = INTRO_VIDEO_AUDIO_END_SECONDS;
        finish();
        return;
      }

      rafId = window.requestAnimationFrame(monitorPlayback);
    };

    const startMonitorPlayback = (): void => {
      if (hasPlaybackStarted || isComplete) {
        return;
      }
      hasPlaybackStarted = true;
      rafId = window.requestAnimationFrame(monitorPlayback);
    };

    const beginPlayback = (): void => {
      videoEl.currentTime = INTRO_VIDEO_START_SECONDS;
      videoEl.muted = false;
      videoEl.volume = 1;
      void videoEl.play().then(startMonitorPlayback).catch(() => {
        if (isComplete) {
          return;
        }

        videoEl.muted = true;
        void videoEl.play().then(startMonitorPlayback).catch(() => {
          finish();
        });
      });
    };

    const handleLoadedMetadata = (): void => {
      beginPlayback();
    };

    this.introVideoCleanup = cleanup;
    videoEl.volume = 1;

    if (videoEl.readyState >= HTMLMediaElement.HAVE_METADATA) {
      beginPlayback();
    } else {
      videoEl.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
    }

    videoEl.addEventListener('ended', finish);
    videoEl.addEventListener('error', finish);
    skipButtonEl?.addEventListener('click', finish, { once: true });
  }

  private showPastHandoff(onComplete: () => void): void {
    this.audio.stopAll();
    this.showOverlay(`
      <section class="intro-title-card intro-title-card--button" aria-label="Intro handoff">
        <button class="app-button app-button--bright app-button--mega" data-action="past-handoff" type="button">
          НАЗАД В ПРОШЛОЕ
        </button>
      </section>
    `);
    this.overlayEl.classList.add('overlay--title-card');
    this.sceneStatusEl.textContent = 'Назад в прошлое';

    this.overlayEl.querySelector<HTMLButtonElement>('[data-action="past-handoff"]')?.addEventListener(
      'click',
      onComplete,
      { once: true },
    );
  }

  private playLocationTitleCard(place: string, year: string | undefined, onComplete: () => void): void {
    if (this.introTitleCardTimeoutId) {
      window.clearTimeout(this.introTitleCardTimeoutId);
      this.introTitleCardTimeoutId = 0;
    }

    this.stopTitleCardSfx();
    const titleCardSequence = ++this.titleCardSequence;
    let completed = false;
    const complete = (): void => {
      if (completed || titleCardSequence !== this.titleCardSequence) {
        return;
      }

      completed = true;
      if (this.introTitleCardTimeoutId) {
        window.clearTimeout(this.introTitleCardTimeoutId);
        this.introTitleCardTimeoutId = 0;
      }
      onComplete();
    };

    this.audio.stopAll();
    this.showOverlay(`
      <section class="intro-title-card ${year ? '' : 'intro-title-card--single'}" aria-label="Location title card">
        <h2 class="intro-title-card__place">${escapeHtml(place)}</h2>
        ${year ? `<p class="intro-title-card__year">${escapeHtml(year)}</p>` : ''}
      </section>
    `);
    this.overlayEl.classList.add('overlay--title-card');
    this.sceneStatusEl.textContent = year ? `${place} ${year}` : place;
    void this.playLocationTitleCardSfx().then(complete);

    this.introTitleCardTimeoutId = window.setTimeout(complete, LOCATION_TITLE_CARD_MAX_DURATION_MS);
  }

  private playLocationTitleCardSfx(): Promise<void> {
    return new Promise((resolve) => {
      const sfxEl = new Audio(LOCATION_TITLE_CARD_SFX_SRC);
      sfxEl.preload = 'auto';
      sfxEl.volume = 0.9;
      sfxEl.muted = false;
      let completed = false;
      let durationFallbackTimeoutId = 0;
      let blockedPlaybackTimeoutId = 0;

      const cleanup = (): void => {
        sfxEl.removeEventListener('loadedmetadata', scheduleDurationFallback);
        sfxEl.removeEventListener('durationchange', scheduleDurationFallback);
        sfxEl.removeEventListener('ended', complete);
        sfxEl.removeEventListener('error', scheduleBlockedPlaybackFallback);
        if (durationFallbackTimeoutId) {
          window.clearTimeout(durationFallbackTimeoutId);
          durationFallbackTimeoutId = 0;
        }
        if (blockedPlaybackTimeoutId) {
          window.clearTimeout(blockedPlaybackTimeoutId);
          blockedPlaybackTimeoutId = 0;
        }
        this.titleCardSfxEls.delete(sfxEl);
      };

      const complete = (): void => {
        if (completed) {
          return;
        }

        completed = true;
        cleanup();
        resolve();
      };

      function scheduleDurationFallback(): void {
        if (
          durationFallbackTimeoutId ||
          !Number.isFinite(sfxEl.duration) ||
          sfxEl.duration <= 0 ||
          sfxEl.loop
        ) {
          return;
        }

        const remainingMs = Math.max((sfxEl.duration - sfxEl.currentTime) * 1000, 0);
        durationFallbackTimeoutId = window.setTimeout(complete, remainingMs + LOCATION_TITLE_CARD_SFX_END_GRACE_MS);
      }

      const scheduleBlockedPlaybackFallback = (): void => {
        if (completed || blockedPlaybackTimeoutId) {
          return;
        }

        blockedPlaybackTimeoutId = window.setTimeout(complete, INTRO_TITLE_CARD_DURATION_MS);
      };

      sfxEl.addEventListener('loadedmetadata', scheduleDurationFallback);
      sfxEl.addEventListener('durationchange', scheduleDurationFallback);
      sfxEl.addEventListener('ended', complete);
      sfxEl.addEventListener('error', scheduleBlockedPlaybackFallback);
      this.titleCardSfxEls.add(sfxEl);

      void sfxEl.play().then(scheduleDurationFallback).catch(() => {
        // Title cards should still advance if browser audio policy blocks this one-shot.
        scheduleBlockedPlaybackFallback();
      });
    });
  }

  private stopTitleCardSfx(): void {
    this.titleCardSfxEls.forEach((sfxEl) => {
      sfxEl.pause();
    });
    this.titleCardSfxEls.clear();
  }

  private async playScene(scene: SceneDefinition): Promise<void> {
    this.updateSceneChrome(scene);
    this.audio.setScene(scene);
    this.audio.stopVoice();
    this.hideOverlay();
    this.stageEl.innerHTML = '<div class="loading-stage">Loading era renderer...</div>';

    const registration = SCENE_RUNTIME_REGISTRY[scene.id];
    if (!registration) {
      this.sceneStatusEl.textContent = `Unsupported ${scene.runtime} scene.`;
      this.stageEl.innerHTML = `
        <section class="battle-shell">
          <article class="battle-panel">
            <p class="eyebrow">Unsupported Scene</p>
            <h2>${escapeHtml(scene.title)}</h2>
            <p>No runtime has been registered for this scene id.</p>
          </article>
        </section>
      `;
      return;
    }

    this.activeCleanup = await registration.mount({
      target: this.stageEl,
      scene,
      content: this.content,
      input: this.input,
      audio: this.audio,
      onComplete: () => this.completeScene(scene),
      onRestart: () => this.showIntro(),
      onStatusChange: (copy) => {
        this.sceneStatusEl.textContent = copy;
      },
    });
  }

  private completeScene(scene: SceneDefinition): void {
    if (scene.relicReward) {
      this.collectedRelics.add(scene.relicReward.id);
      this.renderPersistentRelics();
    }

    if (scene.id === 'act-1-calendar' || scene.id === 'act-2-catchphrase' || scene.id === 'act-3-weekend') {
      this.currentSceneIndex += 1;
      const upcomingScene = this.content.scenes[this.currentSceneIndex];
      if (!upcomingScene) {
        this.showIntro();
        return;
      }

      this.clearStage();
      this.updateSceneChrome(upcomingScene);
      const transitionCard = INTER_ACT_TITLE_CARDS[scene.id];
      if (transitionCard) {
        this.playLocationTitleCard(transitionCard.place, transitionCard.year, () => {
          void this.playScene(upcomingScene);
        });
        return;
      }

      void this.playScene(upcomingScene);
      return;
    }

    this.clearStage();
    this.audio.setScene(scene);
    this.audio.playHook(AUDIO_HOOKS.director.victory);
    this.sceneStatusEl.textContent = scene.outro;

    const nextScene = this.content.scenes[this.currentSceneIndex + 1];
    const actionLabel = nextScene ? `Advance to Act ${nextScene.actNumber}` : 'Return to Title';
    const rewardVisual = scene.relicReward?.imagePath
      ? `<img class="reward-relic-image" src="${escapeAttribute(scene.relicReward.imagePath)}" alt="" aria-hidden="true" decoding="async">`
      : '';

    this.showOverlay(`
      <section class="overlay-card overlay-card--reward">
        <p class="eyebrow">Victory</p>
        ${rewardVisual}
        <h2>${escapeHtml(scene.relicReward?.name ?? scene.title)}</h2>
        <p>${escapeHtml(scene.bossEncounter?.victoryLine ?? scene.outro)}</p>
        <button class="app-button app-button--bright" data-action="next" type="button" aria-label="${escapeAttribute(actionLabel)}">Press X</button>
      </section>
    `);

    this.overlayEl.querySelector<HTMLButtonElement>('[data-action="next"]')?.addEventListener(
      'click',
      () => {
        this.currentSceneIndex += 1;
        const upcomingScene = this.content.scenes[this.currentSceneIndex];
        if (upcomingScene) {
          const transitionCard = INTER_ACT_TITLE_CARDS[scene.id];
          if (transitionCard) {
            this.playLocationTitleCard(transitionCard.place, transitionCard.year, () => {
              this.showBriefing(upcomingScene);
            });
            return;
          }

          this.showBriefing(upcomingScene);
        } else {
          this.showIntro();
        }
      },
      { once: true },
    );
  }

  private updateSceneChrome(scene: SceneDefinition): void {
    this.stageShellEl.dataset.era = scene.visualEra;
    this.stageShellEl.style.setProperty('--scene-bg', escapeCssValue(scene.palette.background));
    this.stageShellEl.style.setProperty('--scene-accent', escapeCssValue(scene.palette.accent));
    this.stageShellEl.style.setProperty('--scene-ui', escapeCssValue(scene.palette.ui));
    this.stageShellEl.style.setProperty(
      '--scene-backdrop-image',
      scene.backgroundImage ? `url("${escapeCssUrl(scene.backgroundImage)}")` : 'none',
    );
    this.stageShellEl.style.setProperty(
      '--scene-backdrop-position',
      escapeCssValue(scene.backgroundImagePosition ?? 'center center'),
    );
    this.stageShellEl.style.setProperty(
      '--scene-backdrop-opacity',
      scene.id === 'act-1-calendar' || scene.id === 'act-4-finale' ? '0' : scene.backgroundImage ? '0.58' : '0',
    );
    this.stageShellEl.style.setProperty('--scene-floor-offset', escapeCssValue(scene.backgroundFloorOffset ?? '68px'));
    this.sceneStatusEl.textContent = scene.bossEncounter?.dramaticTagline ?? scene.subtitle;
  }

  private renderPersistentRelics(): void {
    const collected = this.content.relics.filter((relic) => this.collectedRelics.has(relic.id));
    if (collected.length === 0) {
      this.relicRackEl.innerHTML = '';
      this.relicRackEl.classList.remove('is-visible');
      return;
    }

    this.relicRackEl.classList.add('is-visible');
    this.relicRackEl.innerHTML = collected
      .map((relic) => {
        const iconMarkup = relic.imagePath
          ? `<img class="persistent-relic__icon-image" src="${escapeAttribute(relic.imagePath)}" alt="${escapeAttribute(relic.name)}" decoding="async">`
          : relic.id === 'calendar-core'
            ? `<img class="persistent-relic__icon-image" src="/sprites/act-1/act01-artifact-v002.png" alt="${escapeAttribute(relic.name)}" decoding="async">`
            : `<span class="persistent-relic__glyph">${escapeHtml(relic.pixelLabel)}</span>`;

        return `
          <article class="persistent-relic" style="--relic-color:${escapeCssValue(relic.color)}">
            <span class="persistent-relic__icon">${iconMarkup}</span>
            <span class="persistent-relic__copy">
              <strong>${escapeHtml(relic.name)}</strong>
              <small>${escapeHtml(relic.transformationRole)}</small>
            </span>
          </article>
        `;
      })
      .join('');
  }

  private showOverlay(markup: string): void {
    this.overlayEl.classList.remove('overlay--video');
    this.overlayEl.classList.remove('overlay--title-card');
    this.overlayEl.innerHTML = markup;
    this.overlayEl.classList.add('overlay--visible');
  }

  private hideOverlay(): void {
    if (this.introTitleCardTimeoutId) {
      window.clearTimeout(this.introTitleCardTimeoutId);
      this.introTitleCardTimeoutId = 0;
    }

    this.titleCardSequence += 1;
    this.stopTitleCardSfx();
    this.overlayEl.classList.remove('overlay--video');
    this.overlayEl.classList.remove('overlay--title-card');
    this.overlayEl.classList.remove('overlay--visible');
    this.overlayEl.innerHTML = '';
  }

  private clearStage(): void {
    this.activeCleanup?.();
    this.activeCleanup = undefined;
    this.audio.stopVoice();
    this.stageEl.innerHTML = '';
  }

  private preloadSceneRuntime(scene: SceneDefinition): void {
    this.audio.preloadScene(scene);
    void SCENE_RUNTIME_REGISTRY[scene.id]?.preload();
  }

  private stopIntroVideo(): void {
    this.introVideoCleanup?.();
    this.introVideoCleanup = undefined;
  }

  private recoverIntroVideoAudio(): void {
    const videoEl = this.introVideoEl;
    if (!videoEl || !videoEl.isConnected) {
      return;
    }

    videoEl.muted = false;
    if (videoEl.paused) {
      void videoEl.play().catch(() => {
        videoEl.muted = true;
        void videoEl.play().catch(() => {
          // Keep the recovery path quiet; the original start attempt owns intro completion.
        });
      });
    }
  }

  private recoverRuntimeMedia(): void {
    this.recoverIntroVideoAudio();
    this.audio.recoverPlayback();
  }

  private bindGlobalInput(): void {
    this.inputCleanup?.();
    const recoverMedia = (): void => this.recoverRuntimeMedia();
    const recoverMediaAfterRuntimeInput = (): void => {
      this.recoverRuntimeMedia();
      window.setTimeout(() => this.recoverRuntimeMedia(), 0);
    };
    const unsubscribeInput = this.input.subscribe((state) => {
      if (
        Math.abs(state.moveX) > 0.01 ||
        Math.abs(state.moveY) > 0.01 ||
        Math.abs(state.lookX) > 0.01 ||
        Math.abs(state.lookY) > 0.01 ||
        state.confirm ||
        state.cancel ||
        state.shoot
      ) {
        recoverMediaAfterRuntimeInput();
      }

      if (!state.confirmPressed || !this.overlayEl.classList.contains('overlay--visible')) {
        return;
      }

      recoverMediaAfterRuntimeInput();
      this.overlayEl.querySelector<HTMLButtonElement>('button:not([disabled])')?.click();
    });
    window.addEventListener('pointerdown', recoverMedia, { passive: true });
    window.addEventListener('keydown', recoverMedia);

    this.inputCleanup = () => {
      unsubscribeInput();
      window.removeEventListener('pointerdown', recoverMedia);
      window.removeEventListener('keydown', recoverMedia);
    };
  }
}
