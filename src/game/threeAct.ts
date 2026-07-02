import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

import {
  ACT_THREE_COPY,
  type ActThreeHandsVisualConfig,
  type ActThreeMissionObjectiveDefinition,
  type ActThreeMissionObjectiveId,
  type ActThreePhaseId,
} from '../content/actThree';
import { AUDIO_HOOKS } from '../audio/hooks';
import type { SceneAudioController } from '../audio/sceneAudio';
import type { GamepadInputManager } from '../input/gamepad';
import type { SceneDefinition } from '../types';
import {
  type ActThreeImportedActor,
  createActThreeBoss,
  createActThreeCorridor,
  createActThreeDust,
  createActThreeFirstPersonHandsFallback,
  createActThreeGuard,
  loadActThreeBoss,
  loadActThreeFirstPersonHands,
  loadActThreeGuard,
  setActThreeFirstPersonHandsCredentialState,
} from './actThreeVisuals';
import { createScheduler } from './scheduler';

interface ThreeEncounterConfig {
  target: HTMLElement;
  scene: SceneDefinition;
  input: GamepadInputManager;
  audio: SceneAudioController;
  onComplete: () => void;
  onStatusChange: (copy: string) => void;
}

interface GuardState {
  id: string;
  hitsLanded: number;
  mesh: THREE.Group;
  aimTarget: THREE.Mesh;
  actor: ActThreeImportedActor | null;
  invincibleUntil: number;
  neutralized: boolean;
}

interface PromptState {
  title: string;
  body: string;
  progress: string;
}

interface ProjectileEffect {
  sprite: THREE.Sprite;
  flash: THREE.Sprite;
  start: THREE.Vector3;
  end: THREE.Vector3;
  age: number;
  duration: number;
  flashDuration: number;
  spinSpeed: number;
}

interface HandsTuneState {
  targetSize: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

interface CheckpointRelicState {
  objective: ActThreeMissionObjectiveDefinition;
  guardIndex: number;
  texture: THREE.Texture;
  worldSprite: THREE.Sprite;
  segmentIndex: number;
  pickupProgress: number;
  available: boolean;
  collected: boolean;
}

type StartupBriefingStep = 'kill' | 'spare';

const HANDS_TUNER_STORAGE_KEY = 'act-three:hands-tuner';
const HANDS_TUNER_QUERY_PARAM = 'handsTuner';
const STARTUP_KILL_PROMPT: PromptState = {
  title: '',
  body: 'Чтобы убить - стреляйте.',
  progress: '',
};
const STARTUP_SPARE_LOADING_PROMPT: PromptState = {
  title: '',
  body: 'Чтобы не убить - не стреляйте.',
  progress: '',
};
const STARTUP_SPARE_READY_PROMPT: PromptState = {
  title: '',
  body: 'Чтобы не убить - не стреляйте.',
  progress: '',
};
const ACT_THREE_GAMEPAD_LOOK_SPEED = 2.35;
const ACT_THREE_ARTICLE_PROJECTILES = [
  { label: 'DER', color: '#36a3ff', tint: 0x36a3ff },
  { label: 'DIE', color: '#ff4fc3', tint: 0xff4fc3 },
  { label: 'DAS', color: '#ffe24c', tint: 0xffd84a },
] as const;
const HANDS_TUNER_CONTROLS = [
  { label: 'Scale', path: 'targetSize', min: 0.6, max: 4, step: 0.01 },
  { label: 'Position X', path: 'position.x', min: -2, max: 2, step: 0.01 },
  { label: 'Position Y', path: 'position.y', min: -2.5, max: 1, step: 0.01 },
  { label: 'Position Z', path: 'position.z', min: -4, max: -0.2, step: 0.01 },
  { label: 'Tilt X', path: 'rotation.x', min: -1.4, max: 1.4, step: 0.01 },
  { label: 'Turn Y', path: 'rotation.y', min: -3.2, max: 4.9, step: 0.01 },
  { label: 'Roll Z', path: 'rotation.z', min: -1.4, max: 1.4, step: 0.01 },
] as const;

type HandsTunerPath = (typeof HANDS_TUNER_CONTROLS)[number]['path'];

const {
  checkpointRequiredHits,
  guards: guardDefinitions,
  mission,
  prompts,
  shootout,
  world: worldConfig,
} = ACT_THREE_COPY;

function roundTuneValue(value: number): number {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatTuneValue(value: number): string {
  return String(roundTuneValue(value));
}

function formatYawExpression(value: number): string {
  const offsetFromPi = roundTuneValue(value - Math.PI);
  if (offsetFromPi === 0) {
    return 'Math.PI';
  }

  const operator = offsetFromPi < 0 ? '-' : '+';
  return `Math.PI ${operator} ${formatTuneValue(Math.abs(offsetFromPi))}`;
}

function createHandsTuneState(base: ActThreeHandsVisualConfig): HandsTuneState {
  return {
    targetSize: base.targetSize,
    position: new THREE.Vector3(base.position.x, base.position.y, base.position.z),
    rotation: new THREE.Euler(base.rotation.x, base.rotation.y, base.rotation.z),
  };
}

function createArticleProjectileTexture(label: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(-0.18);
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 8;
    context.shadowColor = color;
    context.shadowBlur = 18;
    context.strokeRect(-104, -38, 208, 76);
    context.font = '900 58px Impact, "Arial Black", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, 0, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createImpactFlashTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');

  if (context) {
    const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 58);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.35, 'rgba(255, 45, 45, 0.85)');
    gradient.addColorStop(1, 'rgba(255, 45, 45, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createRelicSprite(texture: THREE.Texture, scale: { x: number; y: number }): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: 0xffffff,
    transparent: true,
    opacity: 0.98,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale.x, scale.y, 1);
  sprite.visible = false;
  return sprite;
}

function readStoredHandsTune(base: ActThreeHandsVisualConfig): HandsTuneState {
  const tune = createHandsTuneState(base);

  try {
    const stored = window.localStorage.getItem(HANDS_TUNER_STORAGE_KEY);
    if (!stored) {
      return tune;
    }

    const parsed = JSON.parse(stored) as Partial<{
      targetSize: number;
      position: Partial<Record<'x' | 'y' | 'z', number>>;
      rotation: Partial<Record<'x' | 'y' | 'z', number>>;
    }>;
    if (typeof parsed.targetSize === 'number') {
      tune.targetSize = parsed.targetSize;
    }
    if (parsed.position) {
      tune.position.set(
        typeof parsed.position.x === 'number' ? parsed.position.x : tune.position.x,
        typeof parsed.position.y === 'number' ? parsed.position.y : tune.position.y,
        typeof parsed.position.z === 'number' ? parsed.position.z : tune.position.z,
      );
    }
    if (parsed.rotation) {
      tune.rotation.set(
        typeof parsed.rotation.x === 'number' ? parsed.rotation.x : tune.rotation.x,
        typeof parsed.rotation.y === 'number' ? parsed.rotation.y : tune.rotation.y,
        typeof parsed.rotation.z === 'number' ? parsed.rotation.z : tune.rotation.z,
      );
    }
  } catch (error) {
    console.warn('Act 3 hands tuner settings could not be restored.', error);
  }

  return tune;
}

function serializeHandsTune(tune: HandsTuneState): string {
  return JSON.stringify({
    targetSize: roundTuneValue(tune.targetSize),
    position: {
      x: roundTuneValue(tune.position.x),
      y: roundTuneValue(tune.position.y),
      z: roundTuneValue(tune.position.z),
    },
    rotation: {
      x: roundTuneValue(tune.rotation.x),
      y: roundTuneValue(tune.rotation.y),
      z: roundTuneValue(tune.rotation.z),
    },
  });
}

function createHandsConfigSnippet(base: ActThreeHandsVisualConfig, tune: HandsTuneState): string {
  return `hands: {
  assetPath: '${base.assetPath}',
  // Overall hand rig scale.
  targetSize: ${formatTuneValue(tune.targetSize)},
  // Camera-space placement: +x = right, +y = up, +z = closer to camera.
  position: { x: ${formatTuneValue(tune.position.x)}, y: ${formatTuneValue(tune.position.y)}, z: ${formatTuneValue(tune.position.z)} },
  // Camera-space rotation in radians: x = tilt up/down, y = turn left/right, z = roll.
  rotation: { x: ${formatTuneValue(tune.rotation.x)}, y: ${formatYawExpression(tune.rotation.y)}, z: ${formatTuneValue(tune.rotation.z)} },
  // Small motion offsets while the player moves.
  bobAmplitudeX: ${formatTuneValue(base.bobAmplitudeX)},
  bobAmplitudeY: ${formatTuneValue(base.bobAmplitudeY)},
  bobSpeed: ${formatTuneValue(base.bobSpeed)},
  credentialGlow: '${base.credentialGlow}',
},`;
}

function getHandsTuneValue(tune: HandsTuneState, path: HandsTunerPath): number {
  if (path === 'targetSize') {
    return tune.targetSize;
  }

  const [group, axis] = path.split('.') as ['position' | 'rotation', 'x' | 'y' | 'z'];
  return tune[group][axis];
}

function setHandsTuneValue(tune: HandsTuneState, path: HandsTunerPath, value: number): void {
  if (path === 'targetSize') {
    tune.targetSize = value;
    return;
  }

  const [group, axis] = path.split('.') as ['position' | 'rotation', 'x' | 'y' | 'z'];
  tune[group][axis] = value;
}

export function mountThreeEncounter({
  target,
  scene,
  input,
  audio,
  onComplete,
  onStatusChange,
}: ThreeEncounterConfig): () => void {
  target.innerHTML = '';

  const scheduler = createScheduler();
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.domElement.className = 'stage__three-canvas stage__three-canvas--aaa';

  const overlay = document.createElement('div');
  overlay.className = 'stealth-ui';
  overlay.dataset.actThreeUi = 'true';
  overlay.innerHTML = `
    <article class="stealth-ui__card" data-act-three-card>
      <button class="stealth-ui__dismiss" type="button" aria-label="Dismiss instructions" data-startup-dismiss>×</button>
      <p class="eyebrow">Administrative Combat Prompt</p>
      <h3 data-stealth-title>Booting residency citadel instructions...</h3>
      <p data-stealth-body>${scene.objective}</p>
      <p class="stealth-ui__progress" data-stealth-progress>${prompts.checkpointOne.intro.progress}</p>
    </article>
    <p class="stealth-ui__lock" data-stealth-lock hidden></p>
    <div class="stealth-ui__crosshair" aria-hidden="true">
      <span class="stealth-ui__crosshair-line stealth-ui__crosshair-line--top"></span>
      <span class="stealth-ui__crosshair-line stealth-ui__crosshair-line--right"></span>
      <span class="stealth-ui__crosshair-line stealth-ui__crosshair-line--bottom"></span>
      <span class="stealth-ui__crosshair-line stealth-ui__crosshair-line--left"></span>
      <span class="stealth-ui__crosshair-dot"></span>
    </div>
    <div class="stealth-ui__article-magazine" data-act-three-article-magazine data-visible="false" aria-label="Loaded article projectiles"></div>
    <section class="stealth-ui__mission" data-act-three-mission aria-live="polite">
      <h2 data-act-three-mission-title></h2>
      <ol data-act-three-mission-list></ol>
    </section>
    <div class="stealth-ui__target-label" data-act-three-target-label data-visible="false" aria-live="polite"></div>
    <div class="stealth-ui__inventory" data-act-three-inventory></div>
  `;
  overlay.style.setProperty('--act-three-crosshair-size', `${worldConfig.crosshair.size}px`);
  overlay.style.setProperty('--act-three-crosshair-gap', `${worldConfig.crosshair.gap}px`);
  overlay.style.setProperty('--act-three-crosshair-thickness', `${worldConfig.crosshair.thickness}px`);
  overlay.style.setProperty('--act-three-crosshair-color', worldConfig.crosshair.color);
  overlay.style.setProperty('--act-three-crosshair-glow', worldConfig.crosshair.glowColor);

  target.appendChild(renderer.domElement);
  target.appendChild(overlay);

  const promptTitle = overlay.querySelector<HTMLElement>('[data-stealth-title]')!;
  const promptBody = overlay.querySelector<HTMLElement>('[data-stealth-body]')!;
  const promptProgress = overlay.querySelector<HTMLElement>('[data-stealth-progress]')!;
  const lockHint = overlay.querySelector<HTMLElement>('[data-stealth-lock]')!;
  const startupDismissButton = overlay.querySelector<HTMLButtonElement>('[data-startup-dismiss]')!;
  const missionPanel = overlay.querySelector<HTMLElement>('[data-act-three-mission]')!;
  const missionTitle = overlay.querySelector<HTMLElement>('[data-act-three-mission-title]')!;
  const missionList = overlay.querySelector<HTMLOListElement>('[data-act-three-mission-list]')!;
  const targetLabel = overlay.querySelector<HTMLElement>('[data-act-three-target-label]')!;
  const articleMagazine = overlay.querySelector<HTMLElement>('[data-act-three-article-magazine]')!;
  const inventory = overlay.querySelector<HTMLElement>('[data-act-three-inventory]')!;
  const handsTunerEnabled = new URLSearchParams(window.location.search).get(HANDS_TUNER_QUERY_PARAM) === '1';
  const handsTune = handsTunerEnabled ? readStoredHandsTune(worldConfig.hands) : createHandsTuneState(worldConfig.hands);
  const missionObjectiveElements = new Map<ActThreeMissionObjectiveId, HTMLElement>();
  const missionCompleted = new Set<ActThreeMissionObjectiveId>();
  const inventoryBadges = new Map<ActThreeMissionObjectiveId, HTMLElement>();

  missionTitle.textContent = mission.title;
  mission.objectives.forEach((objective, index) => {
    const item = document.createElement('li');
    item.dataset.objectiveId = objective.id;
    item.innerHTML = `<span class="stealth-ui__mission-number">${index + 1}.</span><span>${objective.label}</span>`;
    missionList.appendChild(item);
    missionObjectiveElements.set(objective.id, item);

    if (!objective.pickup) {
      return;
    }

    const badge = document.createElement('article');
    badge.className = `stealth-ui__pickup-badge stealth-ui__pickup-badge--${objective.pickup.hudSlot}`;
    badge.dataset.objectiveId = objective.id;
    const image = document.createElement('img');
    image.src = objective.pickup.spritePath;
    image.alt = '';
    image.decoding = 'async';
    image.setAttribute('aria-hidden', 'true');
    const description = document.createElement('span');
    description.textContent = objective.pickup.description;
    badge.append(image, description);
    inventory.appendChild(badge);
    inventoryBadges.set(objective.id, badge);
  });

  const persistHandsTune = (): void => {
    if (!handsTunerEnabled) {
      return;
    }

    try {
      window.localStorage.setItem(HANDS_TUNER_STORAGE_KEY, serializeHandsTune(handsTune));
    } catch (error) {
      console.warn('Act 3 hands tuner settings could not be saved.', error);
    }
  };

  const world = new THREE.Scene();
  world.background = new THREE.Color(scene.palette.background);
  world.fog = new THREE.Fog(scene.palette.background, worldConfig.fogNear, worldConfig.fogFar);

  const accentColor = new THREE.Color(scene.palette.accent);

  const camera = new THREE.PerspectiveCamera(
    worldConfig.camera.fov,
    16 / 9,
    worldConfig.camera.near,
    worldConfig.camera.far,
  );
  camera.position.set(
    worldConfig.hero.startPosition.x,
    worldConfig.hero.startPosition.y,
    worldConfig.hero.startPosition.z,
  );
  camera.rotation.order = 'YXZ';
  camera.rotation.set(0, worldConfig.hero.startRotationY, 0);
  world.add(camera);

  const controls = new PointerLockControls(camera, renderer.domElement);
  controls.pointerSpeed = worldConfig.camera.pointerSpeed;
  controls.minPolarAngle = Math.PI / 2 - worldConfig.camera.maxPitch;
  controls.maxPolarAngle = Math.PI / 2 - worldConfig.camera.minPitch;

  const ambient = new THREE.AmbientLight(0x87d7ff, 0.72);
  world.add(ambient);

  const hemisphere = new THREE.HemisphereLight(0xdff6ff, 0x04090d, 1.4);
  world.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
  keyLight.position.set(7, 11, 10);
  world.add(keyLight);

  const rim = new THREE.PointLight(accentColor, 11, 26, 2);
  rim.position.set(0, 5, -18);
  world.add(rim);

  const corridor = createActThreeCorridor(worldConfig.corridor, worldConfig.lanePositions, accentColor);
  world.add(corridor);

  const createAimTarget = (radius: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.SphereGeometry(radius, 12, 12),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );

  const guardOne = createActThreeGuard(worldConfig.guards[0]!);
  guardOne.position.set(
    worldConfig.guards[0]!.position.x,
    worldConfig.guards[0]!.position.y,
    worldConfig.guards[0]!.position.z,
  );
  world.add(guardOne);

  const guardTwo = createActThreeGuard(worldConfig.guards[1]!);
  guardTwo.position.set(
    worldConfig.guards[1]!.position.x,
    worldConfig.guards[1]!.position.y,
    worldConfig.guards[1]!.position.z,
  );
  guardTwo.visible = false;
  world.add(guardTwo);

  const guards: GuardState[] = [
    {
      id: guardDefinitions[0]!.id,
      hitsLanded: 0,
      mesh: guardOne,
      aimTarget: createAimTarget(worldConfig.guards[0]!.targetHeight * 0.8),
      actor: null,
      invincibleUntil: 0,
      neutralized: false,
    },
    {
      id: guardDefinitions[1]!.id,
      hitsLanded: 0,
      mesh: guardTwo,
      aimTarget: createAimTarget(worldConfig.guards[1]!.targetHeight * 0.8),
      actor: null,
      invincibleUntil: 0,
      neutralized: false,
    },
  ];
  guards.forEach((guard, index) => {
    guard.aimTarget.position.y = worldConfig.guards[index]!.targetHeight * 0.5;
    guard.mesh.add(guard.aimTarget);
  });

  const boss = createActThreeBoss(worldConfig.boss);
  boss.visible = false;
  boss.position.set(worldConfig.boss.position.x, worldConfig.boss.position.y, worldConfig.boss.position.z);
  world.add(boss);

  let bossActor: ActThreeImportedActor | null = null;
  let bossInvincibleUntil = 0;
  const bossAimTarget = new THREE.Mesh(
    new THREE.SphereGeometry(worldConfig.boss.aimRadius, 16, 16),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  bossAimTarget.position.set(worldConfig.boss.aimOffset.x, worldConfig.boss.aimOffset.y, worldConfig.boss.aimOffset.z);
  boss.add(bossAimTarget);

  const particles = createActThreeDust(accentColor, worldConfig.dust);
  world.add(particles);
  const articleProjectileTextures = ACT_THREE_ARTICLE_PROJECTILES.map((article) => ({
    ...article,
    texture: createArticleProjectileTexture(article.label, article.color),
  }));
  const impactFlashTexture = createImpactFlashTexture();
  const activeProjectiles: ProjectileEffect[] = [];

  let phase: ActThreePhaseId = 'checkpoint-one';
  let credentialed = false;
  let moveForwardHeld = false;
  let strafeLeftHeld = false;
  let strafeRightHeld = false;
  let previousTime = performance.now();
  let frameId = 0;
  let shotsLanded = 0;
  let promptCache = '';
  let startupReady = false;
  let startupPromptVisible = false;
  let startupPromptDismissible = false;
  let startupBriefingStep: StartupBriefingStep = 'kill';
  let startupAssetsReady = false;
  let articleProjectileIndex = 0;
  let moveBackwardHeld = false;
  let movementBlockedUntil = 0;
  let hands: THREE.Group | null = createActThreeFirstPersonHandsFallback(worldConfig.hands);
  let handsRecoil = 0;
  const guardLoadPromises = new Map<number, Promise<ActThreeImportedActor | null>>();
  let bossLoadPromise: Promise<ActThreeImportedActor | null> | null = null;
  let disposed = false;
  let actThreeRewardVisible = false;
  let actThreeRewardCollected = false;
  let actThreeRewardButton: HTMLButtonElement | null = null;
  let activeAudioCue = '';
  let gamepadLookActive = false;

  const bossSequence = worldConfig.boss.animationSequence;

  const syncArticleMagazine = (): void => {
    const spentInCycle = articleProjectileIndex % ACT_THREE_ARTICLE_PROJECTILES.length;
    articleMagazine.dataset.visible = startupReady ? 'true' : 'false';
    articleMagazine.replaceChildren(
      ...ACT_THREE_ARTICLE_PROJECTILES.map((article, index) => {
        const round = document.createElement('span');
        round.className = 'stealth-ui__article-round';
        round.dataset.spent = index < spentInCycle ? 'true' : 'false';
        round.style.setProperty('--article-color', article.color);
        round.textContent = article.label;
        return round;
      }),
    );
  };
  syncArticleMagazine();

  const playBossInitialIdle = (): void => {
    if (bossSequence) {
      bossActor?.playClip(bossSequence.initialIdle, 'idle');
      return;
    }

    bossActor?.play('idle', { idleVariant: 0 });
  };

  const playBossHitForHits = (landedHits: number): number => {
    if (bossSequence) {
      return bossActor?.playClip(landedHits === 1 ? bossSequence.hitOne : bossSequence.hitTwo, 'hit') ?? 0.75;
    }

    return bossActor?.play('hit') ?? 0.75;
  };

  const playBossIdleAfterHit = (landedHits: number): void => {
    if (bossSequence) {
      const clipName = landedHits === 1 ? bossSequence.idleAfterHitOne : bossSequence.idleAfterHitTwo;
      bossActor?.playClip(clipName, 'idle');
      return;
    }

    bossActor?.play('idle', { idleVariant: landedHits % 2 === 1 ? 1 : 0 });
  };

  const playBossDeath = (): number => {
    if (bossSequence) {
      return bossActor?.playClip(bossSequence.death, 'dead') ?? 2.6;
    }

    return bossActor?.play('dead') ?? 2.6;
  };

  const playPhaseAudio = (hookId: string): void => {
    if (activeAudioCue === hookId) {
      return;
    }

    activeAudioCue = hookId;
    audio.playHook(hookId);
  };

  const ensureBossLoaded = (): Promise<ActThreeImportedActor | null> => {
    if (bossActor) {
      return Promise.resolve(bossActor);
    }
    if (bossLoadPromise) {
      return bossLoadPromise;
    }

    bossLoadPromise = loadActThreeBoss(worldConfig.boss)
      .then((actor) => {
        if (disposed) {
          actor.dispose();
          return null;
        }

        bossActor = actor;
        boss.add(actor.group);
        const bossWasVisible = boss.visible;
        boss.visible = true;
        actor.warmUp(renderer, world, camera);
        boss.visible = bossWasVisible;
        playBossInitialIdle();
        return actor;
      })
      .catch((error) => {
        bossLoadPromise = null;
        console.warn('Act 3 LEA boss GLBs failed to load.', error);
        return null;
      });
    return bossLoadPromise;
  };

  const ensureGuardLoaded = (index: number): Promise<ActThreeImportedActor | null> => {
    const guard = guards[index];
    const guardVisual = worldConfig.guards[index];
    if (!guard || !guardVisual) {
      return Promise.resolve(null);
    }
    if (guard.actor) {
      return Promise.resolve(guard.actor);
    }
    const existingLoad = guardLoadPromises.get(index);
    if (existingLoad) {
      return existingLoad;
    }

    const loadPromise = loadActThreeGuard(guardVisual)
      .then((actor) => {
        if (disposed) {
          actor.dispose();
          return null;
        }
        if (guard.actor) {
          actor.dispose();
          return guard.actor;
        }

        guard.actor = actor;
        guard.mesh.add(actor.group);
        actor.play('idle');
        const guardWasVisible = guard.mesh.visible;
        guard.mesh.visible = true;
        actor.warmUp(renderer, world, camera);
        guard.mesh.visible = guardWasVisible;
        return actor;
      })
      .catch((error) => {
        console.warn(`Act 3 checkpoint enemy GLBs failed to load for ${guardVisual.actorId}.`, error);
        guardLoadPromises.delete(index);
        return null;
      });
    guardLoadPromises.set(index, loadPromise);
    return loadPromise;
  };

  const shotRaycaster = new THREE.Raycaster();
  const shotDirection = new THREE.Vector3();
  const shotOrigin = new THREE.Vector3();
  const projectileStart = new THREE.Vector3();
  const projectileEnd = new THREE.Vector3();
  const laneLimit = worldConfig.corridor.wallOffsetX - worldConfig.corridor.wallThickness - 0.7;
  const pathSegments = [
    {
      start: new THREE.Vector3(0, worldConfig.hero.startPosition.y, 34),
      end: new THREE.Vector3(0, worldConfig.hero.startPosition.y, -32),
    },
    {
      start: new THREE.Vector3(0, worldConfig.hero.startPosition.y, -32),
      end: new THREE.Vector3(36, worldConfig.hero.startPosition.y, -32),
    },
    {
      start: new THREE.Vector3(36, worldConfig.hero.startPosition.y, -32),
      end: new THREE.Vector3(36, worldConfig.hero.startPosition.y, -78),
    },
  ] as const;
  const corridorHalfWidth = worldConfig.corridor.wallOffsetX - worldConfig.corridor.wallThickness - 0.45;
  const corridorAreas = [
    { minX: -corridorHalfWidth, maxX: corridorHalfWidth, minZ: -37.8, maxZ: 34, segmentIndex: 0 },
    { minX: 1.2, maxX: 34.8, minZ: -37.8, maxZ: -26.2, segmentIndex: 1 },
    { minX: 30.2, maxX: 41.8, minZ: -77.4, maxZ: -33.2, segmentIndex: 2 },
  ] as const;
  const guardPathSegmentIndexes = [0, 1] as const;
  const bossPathSegmentIndex = 2;
  const relicTextureLoader = new THREE.TextureLoader();
  const checkpointRelics: CheckpointRelicState[] = mission.objectives.flatMap((objective, index) => {
    if (!objective.pickup || index > 1) {
      return [];
    }

    const texture = relicTextureLoader.load(objective.pickup.spritePath);
    texture.colorSpace = THREE.SRGBColorSpace;
    const worldSprite = createRelicSprite(texture, objective.pickup.scale);
    world.add(worldSprite);

    return [
      {
        objective,
        guardIndex: index,
        texture,
        worldSprite,
        segmentIndex: guardPathSegmentIndexes[index] ?? 0,
        pickupProgress: 0,
        available: false,
        collected: false,
      },
    ];
  });
  const checkpointRelicByObjective = new Map(
    checkpointRelics.map((relic) => [relic.objective.id, relic] as const),
  );
  const segmentScratch = new THREE.Vector3();
  const forwardScratch = new THREE.Vector3();
  const centerScratch = new THREE.Vector3();
  const relicPickupScratch = new THREE.Vector3();
  let pathSegmentIndex = 0;
  let pathProgress = 0;
  const cameraMoveDirection = new THREE.Vector3();
  const candidateCameraPosition = new THREE.Vector3();

  const getPathSegmentLength = (index: number): number => {
    const segment = pathSegments[index] ?? pathSegments[0]!;
    return segment.start.distanceTo(segment.end);
  };

  const getPathForward = (index: number, targetVector = new THREE.Vector3()): THREE.Vector3 => {
    const segment = pathSegments[index] ?? pathSegments[0]!;
    return targetVector.copy(segment.end).sub(segment.start).normalize();
  };

  const getPathRight = (index: number, targetVector = new THREE.Vector3()): THREE.Vector3 => {
    const forward = getPathForward(index, targetVector);
    return targetVector.set(-forward.z, 0, forward.x).normalize();
  };

  const getCenterAtPathProgress = (index: number, progress: number, targetVector = new THREE.Vector3()): THREE.Vector3 => {
    const segment = pathSegments[index] ?? pathSegments[0]!;
    return targetVector.copy(segment.start).addScaledVector(getPathForward(index, forwardScratch), progress);
  };

  const getPositionProgressOnSegment = (index: number, position: THREE.Vector3): number => {
    const segment = pathSegments[index] ?? pathSegments[0]!;
    return segmentScratch.copy(position).sub(segment.start).dot(getPathForward(index, forwardScratch));
  };

  const updatePathStateFromCamera = (): void => {
    const containingAreas = corridorAreas.filter(
      (area) =>
        camera.position.x >= area.minX &&
        camera.position.x <= area.maxX &&
        camera.position.z >= area.minZ &&
        camera.position.z <= area.maxZ,
    );
    const containingArea =
      containingAreas.find((area) => area.segmentIndex === pathSegmentIndex) ??
      containingAreas[containingAreas.length - 1];
    if (containingArea) {
      pathSegmentIndex = containingArea.segmentIndex;
    }
    pathProgress = THREE.MathUtils.clamp(
      getPositionProgressOnSegment(pathSegmentIndex, camera.position),
      0,
      getPathSegmentLength(pathSegmentIndex),
    );
    camera.position.y = worldConfig.hero.startPosition.y;
  };

  const faceRouteDirection = (): void => {
    if (controls.isLocked || gamepadLookActive || phase === 'complete') {
      return;
    }

    const activeGuard = getActiveCheckpointGuard();
    const activeGuardIndex = activeGuard ? guards.indexOf(activeGuard) : -1;
    if (
      activeGuard &&
      !activeGuard.neutralized &&
      activeGuard.mesh.visible &&
      pathSegmentIndex === guardPathSegmentIndexes[activeGuardIndex]
    ) {
      camera.lookAt(activeGuard.mesh.position.x, activeGuard.mesh.position.y + 1.45, activeGuard.mesh.position.z);
      return;
    }

    if (phase === 'shootout' && boss.visible && pathSegmentIndex === bossPathSegmentIndex) {
      camera.lookAt(
        worldConfig.boss.position.x + worldConfig.boss.aimOffset.x,
        worldConfig.boss.position.y + worldConfig.boss.aimOffset.y,
        worldConfig.boss.position.z + worldConfig.boss.aimOffset.z,
      );
      return;
    }

    const segmentLength = getPathSegmentLength(pathSegmentIndex);
    let lookSegmentIndex = pathSegmentIndex;
    let lookProgress = pathProgress + 8;
    if (lookProgress > segmentLength && pathSegments[pathSegmentIndex + 1]) {
      lookSegmentIndex = pathSegmentIndex + 1;
      lookProgress = Math.min(8, getPathSegmentLength(lookSegmentIndex));
    }

    const lookAtPoint = getCenterAtPathProgress(
      lookSegmentIndex,
      Math.min(lookProgress, getPathSegmentLength(lookSegmentIndex)),
      centerScratch,
    );
    camera.lookAt(lookAtPoint.x, worldConfig.hero.startPosition.y, lookAtPoint.z);
  };
  const updatePointerLockHint = (): void => {
    overlay.dataset.pointerLock = controls.isLocked ? 'locked' : 'unlocked';
    lockHint.hidden = true;
  };

  const syncInternalEncounterState = (): void => {
    overlay.dataset.phase = phase;
    overlay.dataset.checkpointOneHits = String(guards[0]?.hitsLanded ?? 0);
    overlay.dataset.checkpointTwoHits = String(guards[1]?.hitsLanded ?? 0);
    overlay.dataset.bossHits = String(shotsLanded);
    overlay.dataset.bossAnimationSlot = bossActor?.getActiveSlot() ?? '';
    overlay.dataset.bossAnimationClip = bossActor?.getActiveClipName() ?? '';
    overlay.dataset.pathSegment = String(pathSegmentIndex);
    overlay.dataset.playerX = camera.position.x.toFixed(2);
    overlay.dataset.playerZ = camera.position.z.toFixed(2);
    overlay.dataset.playerYaw = camera.rotation.y.toFixed(2);
    overlay.dataset.deutschA1Collected = checkpointRelicByObjective.get('deutsch-a1')?.collected ? 'true' : 'false';
    overlay.dataset.einbuergerungstestCollected = checkpointRelicByObjective.get('einbuergerungstest')?.collected
      ? 'true'
      : 'false';
    overlay.dataset.deutschA1Inventory = inventoryBadges.get('deutsch-a1')?.classList.contains('is-collected')
      ? 'visible'
      : 'hidden';
    overlay.dataset.einbuergerungstestInventory = inventoryBadges
      .get('einbuergerungstest')
      ?.classList.contains('is-collected')
      ? 'visible'
      : 'hidden';
  };

  const setPrompt = ({ title, body, progress }: PromptState): void => {
    const next = `${title}|${body}|${progress}`;
    syncInternalEncounterState();
    if (promptCache === next) {
      return;
    }
    promptCache = next;
    promptTitle.textContent = title;
    promptBody.textContent = body;
    promptProgress.textContent = progress;
    onStatusChange(body);
  };

  let targetLabelCache = '';

  const setTargetEnemyLabel = (label: string): void => {
    if (targetLabelCache === label) {
      return;
    }

    targetLabelCache = label;
    targetLabel.textContent = label;
    targetLabel.dataset.visible = label ? 'true' : 'false';
    overlay.dataset.crosshairTarget = label;
  };

  const showMissionHud = (): void => {
    missionTitle.textContent = `${mission.title}:`;
    missionPanel.classList.remove('is-intro');
    missionPanel.classList.add('is-hud');
  };

  const showMissionIntro = (): void => {
    missionTitle.textContent = mission.title;
    missionPanel.classList.add('is-visible', 'is-intro');
    missionPanel.classList.remove('is-hud');
    scheduler.schedule(showMissionHud, 1900);
  };

  const completeMissionObjective = (objectiveId: ActThreeMissionObjectiveId): void => {
    if (missionCompleted.has(objectiveId)) {
      return;
    }

    missionCompleted.add(objectiveId);
    missionObjectiveElements.get(objectiveId)?.classList.add('is-complete');
  };

  const consumeInventoryBadge = (objectiveId: ActThreeMissionObjectiveId): void => {
    const badge = inventoryBadges.get(objectiveId);
    if (!badge) {
      return;
    }

    badge.classList.remove('is-collected');
    badge.classList.add('is-spent');
  };

  const setStartupModalState = (visible: boolean, dismissible = false): void => {
    startupPromptVisible = visible;
    startupPromptDismissible = dismissible;
    overlay.dataset.startupModal = visible ? 'visible' : 'hidden';
    overlay.dataset.startupDismissible = dismissible ? 'true' : 'false';
    overlay.dataset.startupStep = startupBriefingStep;
    overlay.dataset.startupAssetsReady = startupAssetsReady ? 'true' : 'false';
    startupDismissButton.disabled = !dismissible;
  };

  const getStartupPrompt = (): PromptState => {
    if (startupBriefingStep === 'kill') {
      return STARTUP_KILL_PROMPT;
    }

    return startupAssetsReady ? STARTUP_SPARE_READY_PROMPT : STARTUP_SPARE_LOADING_PROMPT;
  };

  const syncStartupModal = (): void => {
    if (!startupPromptVisible || startupReady) {
      return;
    }

    setStartupModalState(true, startupBriefingStep === 'kill' || startupAssetsReady);
    setPrompt(getStartupPrompt());
    updatePointerLockHint();
  };

  const advanceStartupModal = (): void => {
    if (!startupPromptVisible || !startupPromptDismissible || startupReady) {
      return;
    }

    if (startupBriefingStep === 'kill') {
      startupBriefingStep = 'spare';
      syncStartupModal();
      return;
    }

    if (!startupAssetsReady) {
      syncStartupModal();
      return;
    }

    startupReady = true;
    setStartupModalState(false);
    syncArticleMagazine();
    showMissionIntro();
    resetMovementState();
    updatePointerLockHint();
    playPhaseAudio(AUDIO_HOOKS.actThree.checkpointOneStart);
    setPrompt(prompts.checkpointOne.intro);
  };

  const resize = (): void => {
    const width = target.clientWidth || 1280;
    const height = target.clientHeight || 720;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const updateHandsCredentials = (): void => {
    if (!hands) {
      return;
    }

    setActThreeFirstPersonHandsCredentialState(hands, worldConfig.hands, credentialed);
  };

  const prewarmEncounterVisibility = (): void => {
    const cameraPosition = camera.position.clone();
    const cameraQuaternion = camera.quaternion.clone();
    const guardOneVisible = guardOne.visible;
    const guardTwoVisible = guardTwo.visible;
    const bossVisible = boss.visible;
    const warmTargets = [
      new THREE.Vector3(guardOne.position.x, guardOne.position.y + 1.5, guardOne.position.z),
      new THREE.Vector3(guardTwo.position.x, guardTwo.position.y + 1.5, guardTwo.position.z),
      new THREE.Vector3(
        worldConfig.boss.position.x + worldConfig.boss.aimOffset.x,
        worldConfig.boss.position.y + worldConfig.boss.aimOffset.y,
        worldConfig.boss.position.z + worldConfig.boss.aimOffset.z,
      ),
    ];

    guardOne.visible = true;
    guardTwo.visible = true;
    boss.visible = true;
    warmTargets.forEach((lookAt) => {
      camera.lookAt(lookAt);
      camera.updateMatrixWorld(true);
      renderer.compile(world, camera);
      renderer.render(world, camera);
    });
    guardOne.visible = guardOneVisible;
    guardTwo.visible = guardTwoVisible;
    boss.visible = bossVisible;
    camera.position.copy(cameraPosition);
    camera.quaternion.copy(cameraQuaternion);
    camera.updateMatrixWorld(true);
  };

  const applyHandsTuning = (movementBob = 0, laneSway = 0, recoil = 0): void => {
    if (!hands) {
      return;
    }

    const recoilKick = recoil * recoil;
    hands.position.set(
      handsTune.position.x + laneSway * worldConfig.hands.bobAmplitudeX,
      handsTune.position.y + movementBob - recoilKick * 0.018,
      handsTune.position.z + recoilKick * 0.08,
    );
    hands.rotation.set(
      handsTune.rotation.x + movementBob * 0.45 - recoilKick * 0.035,
      handsTune.rotation.y,
      handsTune.rotation.z - laneSway * 0.08 + recoilKick * 0.01,
    );
    hands.scale.setScalar(handsTune.targetSize / Math.max(worldConfig.hands.targetSize, 0.001));
  };

  const triggerHandsRecoil = (): void => {
    handsRecoil = Math.min(1, Math.max(handsRecoil, 0.22) + 0.58);
  };

  const mountHandsTuner = (): void => {
    const panel = document.createElement('aside');
    panel.className = 'stealth-ui__hands-tuner';
    panel.setAttribute('aria-label', 'Act 3 hands tuner');
    panel.innerHTML = `
      <div class="stealth-ui__hands-tuner-head">
        <strong>Hands Tuner</strong>
        <span>Live values for <code>visuals.ts</code></span>
      </div>
    `;

    const controlList = document.createElement('div');
    controlList.className = 'stealth-ui__hands-tuner-controls';
    panel.appendChild(controlList);

    const valueOutputs = new Map<HandsTunerPath, HTMLOutputElement>();

    HANDS_TUNER_CONTROLS.forEach((control) => {
      const row = document.createElement('label');
      row.className = 'stealth-ui__hands-tuner-row';

      const label = document.createElement('span');
      label.textContent = control.label;

      const valueOutput = document.createElement('output');
      valueOutput.value = formatTuneValue(getHandsTuneValue(handsTune, control.path));
      valueOutputs.set(control.path, valueOutput);

      const range = document.createElement('input');
      range.type = 'range';
      range.min = String(control.min);
      range.max = String(control.max);
      range.step = String(control.step);
      range.value = String(getHandsTuneValue(handsTune, control.path));
      range.dataset.handsTune = control.path;

      range.addEventListener('input', () => {
        setHandsTuneValue(handsTune, control.path, Number(range.value));
        valueOutput.value = formatTuneValue(getHandsTuneValue(handsTune, control.path));
        persistHandsTune();
        applyHandsTuning();
        snippet.value = createHandsConfigSnippet(worldConfig.hands, handsTune);
      });

      row.append(label, range, valueOutput);
      controlList.appendChild(row);
    });

    const actions = document.createElement('div');
    actions.className = 'stealth-ui__hands-tuner-actions';

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.textContent = 'Copy Config';

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.textContent = 'Reset';

    actions.append(copyButton, resetButton);
    panel.appendChild(actions);

    const snippet = document.createElement('textarea');
    snippet.className = 'stealth-ui__hands-tuner-snippet';
    snippet.readOnly = true;
    snippet.spellcheck = false;
    snippet.value = createHandsConfigSnippet(worldConfig.hands, handsTune);
    panel.appendChild(snippet);

    const stopGameInput = (event: Event): void => {
      event.stopPropagation();
    };
    ['pointerdown', 'click', 'keydown', 'keyup', 'wheel'].forEach((eventName) => {
      panel.addEventListener(eventName, stopGameInput);
    });

    copyButton.addEventListener('click', () => {
      const previousLabel = copyButton.textContent ?? 'Copy Config';
      snippet.select();
      if (navigator.clipboard) {
        void navigator.clipboard.writeText(snippet.value).then(() => {
          copyButton.textContent = 'Copied';
          scheduler.schedule(() => {
            copyButton.textContent = previousLabel;
          }, 900);
        });
      }
    });

    resetButton.addEventListener('click', () => {
      const resetTune = createHandsTuneState(worldConfig.hands);
      handsTune.targetSize = resetTune.targetSize;
      handsTune.position.copy(resetTune.position);
      handsTune.rotation.copy(resetTune.rotation);
      try {
        window.localStorage.removeItem(HANDS_TUNER_STORAGE_KEY);
      } catch {
        // Non-critical: the sliders still reset even if storage is unavailable.
      }

      HANDS_TUNER_CONTROLS.forEach((control) => {
        const input = controlList.querySelector<HTMLInputElement>(`[data-hands-tune="${control.path}"]`);
        const nextValue = getHandsTuneValue(handsTune, control.path);
        if (input) {
          input.value = String(nextValue);
        }
        const output = valueOutputs.get(control.path);
        if (output) {
          output.value = formatTuneValue(nextValue);
        }
      });
      applyHandsTuning();
      snippet.value = createHandsConfigSnippet(worldConfig.hands, handsTune);
    });

    overlay.appendChild(panel);
  };

  const collectActThreeReward = (): void => {
    if (!actThreeRewardVisible || actThreeRewardCollected || !actThreeRewardButton) {
      return;
    }

    actThreeRewardCollected = true;
    audio.playHook(AUDIO_HOOKS.shared.collection);
    audio.stopMusic();
    actThreeRewardButton.classList.remove('is-descending');
    actThreeRewardButton.classList.add('is-flight');
    scheduler.schedule(() => onComplete(), 880);
  };

  const showActThreeReward = (): void => {
    if (actThreeRewardVisible || actThreeRewardCollected) {
      return;
    }

    actThreeRewardVisible = true;
    const rewardButton = document.createElement('button');
    rewardButton.className = 'act-three-reward is-descending';
    rewardButton.type = 'button';
    rewardButton.setAttribute('aria-label', `Забрать ${scene.relicReward?.name ?? 'Пэ Эм Жэ'}`);

    const rewardVisual = document.createElement('span');
    rewardVisual.className = 'act-three-reward__visual';
    if (scene.relicReward?.imagePath) {
      const image = document.createElement('img');
      image.src = scene.relicReward.imagePath;
      image.alt = '';
      image.decoding = 'async';
      image.setAttribute('aria-hidden', 'true');
      rewardVisual.appendChild(image);
    } else {
      rewardVisual.textContent = scene.relicReward?.pixelLabel ?? 'ПМЖ';
    }

    const label = document.createElement('span');
    label.className = 'act-three-reward__label';
    label.textContent = scene.relicReward?.name ?? 'Пэ Эм Жэ';

    rewardButton.append(rewardVisual, label);
    overlay.appendChild(rewardButton);
    actThreeRewardButton = rewardButton;
    setPrompt(prompts.shootout.bossDown(scene.outro));

    rewardButton.addEventListener(
      'click',
      () => {
        collectActThreeReward();
      },
      { once: true },
    );
  };

  const updateShotRay = (): void => {
    camera.updateMatrixWorld(true);
    shotDirection.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    shotRaycaster.set(camera.position, shotDirection);
  };

  const spawnSpriteProjectile = (
    target: THREE.Object3D | null,
    texture: THREE.Texture,
    options: {
      color: THREE.ColorRepresentation;
      flashColor?: THREE.ColorRepresentation;
      scale: { x: number; y: number };
      duration: number;
      spinSpeed: number;
      additive?: boolean;
    },
  ): void => {
    audio.playHook(AUDIO_HOOKS.actThree.shot);
    triggerHandsRecoil();
    updateShotRay();
    shotOrigin.set(0.34, -0.28, -0.72);
    camera.localToWorld(shotOrigin);
    projectileStart.copy(shotOrigin);
    projectileEnd.copy(camera.position).addScaledVector(shotDirection, 38);

    if (target) {
      target.updateMatrixWorld(true);
      const hit = shotRaycaster.intersectObject(target, true)[0];
      if (hit) {
        projectileEnd.copy(hit.point);
      }
    }

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      color: options.color,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: options.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(projectileStart);
    sprite.scale.set(options.scale.x, options.scale.y, 1);
    sprite.center.set(0.5, 0.5);
    world.add(sprite);

    const flashMaterial = new THREE.SpriteMaterial({
      map: impactFlashTexture,
      color: options.flashColor ?? 0xff4545,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const flash = new THREE.Sprite(flashMaterial);
    flash.visible = false;
    flash.position.copy(projectileEnd);
    flash.scale.set(1.2, 1.2, 1);
    world.add(flash);

    activeProjectiles.push({
      sprite,
      flash,
      start: projectileStart.clone(),
      end: projectileEnd.clone(),
      age: 0,
      duration: options.duration,
      flashDuration: 0.18,
      spinSpeed: options.spinSpeed,
    });
  };

  const spawnArticleProjectile = (target: THREE.Object3D | null): void => {
    const article = articleProjectileTextures[articleProjectileIndex % articleProjectileTextures.length]!;
    articleProjectileIndex += 1;
    syncArticleMagazine();

    spawnSpriteProjectile(target, article.texture, {
      color: article.tint,
      flashColor: article.tint,
      scale: { x: 0.95, y: 0.48 },
      duration: 0.16,
      spinSpeed: 13,
      additive: true,
    });
  };

  const spawnBossRegisteredProjectile = (hitNumber: number): void => {
    if (hitNumber === 2) {
      const relic = checkpointRelicByObjective.get('deutsch-a1');
      if (relic) {
        consumeInventoryBadge('deutsch-a1');
        spawnSpriteProjectile(bossAimTarget, relic.texture, {
          color: 0xffffff,
          scale: { x: 0.58, y: 0.86 },
          duration: 0.26,
          spinSpeed: -7.2,
        });
        return;
      }
    }

    if (hitNumber === 3) {
      const relic = checkpointRelicByObjective.get('einbuergerungstest');
      if (relic) {
        consumeInventoryBadge('einbuergerungstest');
        spawnSpriteProjectile(bossAimTarget, relic.texture, {
          color: 0xffffff,
          scale: { x: 0.7, y: 0.7 },
          duration: 0.26,
          spinSpeed: 7.2,
        });
        return;
      }
    }

    spawnArticleProjectile(bossAimTarget);
  };

  const updateProjectiles = (delta: number): void => {
    for (let index = activeProjectiles.length - 1; index >= 0; index -= 1) {
      const projectile = activeProjectiles[index]!;
      projectile.age += delta;
      const travelT = THREE.MathUtils.clamp(projectile.age / projectile.duration, 0, 1);
      projectile.sprite.position.lerpVectors(projectile.start, projectile.end, travelT);
      projectile.sprite.material.rotation += delta * projectile.spinSpeed;
      projectile.sprite.material.opacity = 0.95 * (1 - Math.max(0, travelT - 0.72) / 0.28);

      if (travelT >= 1) {
        projectile.sprite.visible = false;
        projectile.flash.visible = true;
        const flashT = THREE.MathUtils.clamp(
          (projectile.age - projectile.duration) / projectile.flashDuration,
          0,
          1,
        );
        projectile.flash.material.opacity = 0.85 * (1 - flashT);
        const flashScale = 1.1 + flashT * 1.7;
        projectile.flash.scale.set(flashScale, flashScale, 1);

        if (flashT >= 1) {
          projectile.sprite.material.dispose();
          projectile.flash.material.dispose();
          projectile.sprite.removeFromParent();
          projectile.flash.removeFromParent();
          activeProjectiles.splice(index, 1);
        }
      }
    }
  };

  const spawnCheckpointRelic = (guardIndex: number): void => {
    const relic = checkpointRelics.find((candidate) => candidate.guardIndex === guardIndex);
    const guard = guards[guardIndex];
    const guardVisual = worldConfig.guards[guardIndex];
    if (!relic || !guard || !guardVisual || relic.available || relic.collected) {
      return;
    }

    relic.segmentIndex = guardPathSegmentIndexes[guardIndex] ?? relic.segmentIndex;
    relic.pickupProgress = getPositionProgressOnSegment(relic.segmentIndex, guard.mesh.position);
    const spriteY = guard.mesh.position.y + Math.max(2.35, guardVisual.targetHeight * 0.82);
    relic.worldSprite.position.set(guard.mesh.position.x, spriteY, guard.mesh.position.z);
    relic.worldSprite.userData.baseY = spriteY;
    relic.worldSprite.visible = true;
    relic.available = true;
  };

  const collectCheckpointRelic = (relic: CheckpointRelicState): void => {
    if (!relic.available || relic.collected) {
      return;
    }

    relic.collected = true;
    relic.available = false;
    relic.worldSprite.visible = false;
    inventoryBadges.get(relic.objective.id)?.classList.add('is-collected');
    audio.playHook(AUDIO_HOOKS.shared.collection);

    if (relic.guardIndex === 0) {
      beginLootAdvance('checkpoint-one-reward', 'checkpoint-two');
      return;
    }

    beginLootAdvance('checkpoint-two-reward', 'shootout');
  };

  const updateCheckpointRelics = (now: number): void => {
    checkpointRelics.forEach((relic) => {
      if (!relic.available || relic.collected) {
        return;
      }

      const baseY =
        typeof relic.worldSprite.userData.baseY === 'number' ? relic.worldSprite.userData.baseY : relic.worldSprite.position.y;
      relic.worldSprite.position.y = baseY + Math.sin(now / 360) * 0.12;
      const material = relic.worldSprite.material;
      material.opacity = 0.82 + Math.sin(now / 240) * 0.14;

      if (phase !== 'checkpoint-one-reward' && phase !== 'checkpoint-two-reward') {
        return;
      }

      relicPickupScratch.set(relic.worldSprite.position.x, camera.position.y, relic.worldSprite.position.z);
      const pickupRadius = worldConfig.interactions.pickupDepth + worldConfig.interactions.lootAdvanceDepth;
      const closeEnoughToPickup = camera.position.distanceTo(relicPickupScratch) <= pickupRadius;
      const crossedPickupLine = pathSegmentIndex === relic.segmentIndex && pathProgress >= relic.pickupProgress - 0.2;

      if (crossedPickupLine || closeEnoughToPickup) {
        collectCheckpointRelic(relic);
      }
    });
  };

  const neutralizeGuard = (guard: GuardState, guardIndex: number): number => {
    guard.neutralized = true;
    const duration = Math.max(guard.actor?.play('dead') ?? 0.75, 2.6);
    guard.invincibleUntil = performance.now() + duration * 1000;
    const objectiveId = checkpointRelics.find((relic) => relic.guardIndex === guardIndex)?.objective.id;
    if (objectiveId) {
      completeMissionObjective(objectiveId);
    }
    return duration;
  };

  const getActiveCheckpointGuard = (): GuardState | null => {
    if (phase === 'checkpoint-one') {
      return guards[0] ?? null;
    }

    if (phase === 'checkpoint-two') {
      return guards[1] ?? null;
    }

    return null;
  };

  const getCheckpointForwardLockProgress = (): number | null => {
    const activeGuard = getActiveCheckpointGuard();
    if (!activeGuard || activeGuard.neutralized) {
      return null;
    }

    const guardIndex = guards.indexOf(activeGuard);
    if (pathSegmentIndex !== guardPathSegmentIndexes[guardIndex]) {
      return null;
    }

    return Math.max(
      getPositionProgressOnSegment(pathSegmentIndex, activeGuard.mesh.position) -
        worldConfig.interactions.checkpointForwardLockDepth,
      0,
    );
  };

  const getBossForwardLockProgress = (): number | null => {
    if (phase !== 'shootout' || pathSegmentIndex !== bossPathSegmentIndex || shotsLanded >= shootout.requiredHits) {
      return null;
    }

    return Math.max(
      getPositionProgressOnSegment(pathSegmentIndex, boss.position) - worldConfig.interactions.takedownForwardLockDepth,
      0,
    );
  };

  const isCheckpointForwardLocked = (): boolean => {
    const forwardLockProgress = getCheckpointForwardLockProgress();
    return forwardLockProgress !== null && pathProgress >= forwardLockProgress - 0.01;
  };

  const isShootoutForwardLocked = (): boolean => {
    const bossLockProgress = getBossForwardLockProgress();
    return bossLockProgress !== null && pathProgress >= bossLockProgress - 0.01;
  };

  const isCheckpointShotAligned = (guard: GuardState | null): boolean => {
    if (!guard || !guard.actor || guard.neutralized || performance.now() < guard.invincibleUntil) {
      return false;
    }

    updateShotRay();
    guard.aimTarget.updateMatrixWorld(true);
    return shotRaycaster.intersectObject(guard.aimTarget, true).length > 0;
  };

  const isCrosshairOnCheckpointGuard = (guard: GuardState | null): boolean => {
    if (!guard || !guard.actor || guard.neutralized || !guard.mesh.visible) {
      return false;
    }

    updateShotRay();
    guard.aimTarget.updateMatrixWorld(true);
    return shotRaycaster.intersectObject(guard.aimTarget, true).length > 0;
  };

  const getCurrentCrosshairTargetLabel = (): string => {
    if (phase === 'checkpoint-one' && isCrosshairOnCheckpointGuard(guards[0] ?? null)) {
      return mission.objectives[0]?.targetLabel ?? worldConfig.guards[0]?.label ?? '';
    }

    if (phase === 'checkpoint-two' && isCrosshairOnCheckpointGuard(guards[1] ?? null)) {
      return mission.objectives[1]?.targetLabel ?? worldConfig.guards[1]?.label ?? '';
    }

    if (phase === 'shootout' && shotsLanded < shootout.requiredHits && isCrosshairOnBossCore()) {
      return mission.objectives[2]?.targetLabel ?? worldConfig.boss.label;
    }

    return '';
  };

  const isInsideWalkableCorridor = (position: THREE.Vector3): boolean =>
    corridorAreas.some(
      (area) =>
        position.x >= area.minX &&
        position.x <= area.maxX &&
        position.z >= area.minZ &&
        position.z <= area.maxZ,
    );

  const getCameraForward = (): THREE.Vector3 => {
    camera.getWorldDirection(cameraMoveDirection);
    cameraMoveDirection.y = 0;
    if (cameraMoveDirection.lengthSq() < 0.001) {
      return getPathForward(pathSegmentIndex, cameraMoveDirection);
    }
    return cameraMoveDirection.normalize();
  };

  const movePlayer = (distance: number, strafe = 0): void => {
    const checkpointLockProgress = getCheckpointForwardLockProgress();
    const bossLockProgress = getBossForwardLockProgress();
    const forwardLockProgress =
      checkpointLockProgress === null
        ? bossLockProgress
        : bossLockProgress === null
          ? checkpointLockProgress
          : Math.min(checkpointLockProgress, bossLockProgress);

    const direction = getCameraForward();
    if (strafe !== 0) {
      direction.set(-direction.z, 0, direction.x).multiplyScalar(strafe);
    }
    candidateCameraPosition.copy(camera.position).addScaledVector(direction, distance);
    candidateCameraPosition.y = worldConfig.hero.startPosition.y;

    if (!isInsideWalkableCorridor(candidateCameraPosition)) {
      return;
    }

    const nextSegmentIndex =
      corridorAreas.find(
        (area) =>
          candidateCameraPosition.x >= area.minX &&
          candidateCameraPosition.x <= area.maxX &&
          candidateCameraPosition.z >= area.minZ &&
          candidateCameraPosition.z <= area.maxZ,
      )?.segmentIndex ?? pathSegmentIndex;
    const nextProgress = getPositionProgressOnSegment(nextSegmentIndex, candidateCameraPosition);
    const forwardMotion = nextSegmentIndex === pathSegmentIndex && nextProgress > pathProgress;

    if (distance > 0 && forwardMotion && forwardLockProgress !== null && nextProgress >= forwardLockProgress) {
      const lockCenter = getCenterAtPathProgress(pathSegmentIndex, forwardLockProgress, centerScratch);
      const right = getPathRight(pathSegmentIndex, segmentScratch);
      const lateralOffset = camera.position.clone().sub(lockCenter).dot(right);
      camera.position.copy(lockCenter).addScaledVector(right, THREE.MathUtils.clamp(lateralOffset, -laneLimit, laneLimit));
      updatePathStateFromCamera();
      return;
    }

    camera.position.copy(candidateCameraPosition);
    updatePathStateFromCamera();
  };

  const beginLootAdvance = (
    rewardPhase: 'checkpoint-one-reward' | 'checkpoint-two-reward',
    nextPhase: 'checkpoint-two' | 'shootout',
  ): void => {
    if (rewardPhase === 'checkpoint-one-reward') {
      credentialed = true;
      updateHandsCredentials();
      ensureGuardLoaded(1);
      phase = nextPhase;
      guardTwo.visible = true;
      playPhaseAudio(AUDIO_HOOKS.actThree.checkpointTwoStart);
      setPrompt(prompts.checkpointTwo.intro);
      return;
    }

    phase = nextPhase;
    boss.visible = true;
    playPhaseAudio(AUDIO_HOOKS.actThree.shootoutStart);
    setPrompt(prompts.shootout.intro());
    ensureBossLoaded();
  };

  const beginCheckpointRewardPhase = (guardIndex: number): void => {
    movementBlockedUntil = 0;
    if (guardIndex === 0) {
      phase = 'checkpoint-one-reward';
      spawnCheckpointRelic(0);
      setPrompt(prompts.checkpointOneReward);
      return;
    }

    phase = 'checkpoint-two-reward';
    spawnCheckpointRelic(1);
    setPrompt(prompts.checkpointTwoReward);
  };

  const tryCheckpointShot = (): void => {
    if (!startupReady) {
      if (startupPromptVisible) {
        syncStartupModal();
      }
      return;
    }

    if (phase === 'checkpoint-one') {
      if (performance.now() < guards[0]!.invincibleUntil) {
        setPrompt(prompts.checkpointOne.directHit(guards[0]!.hitsLanded));
        return;
      }

      if (!isCheckpointShotAligned(guards[0] ?? null)) {
        setPrompt(prompts.checkpointOne.failed);
        return;
      }

      audio.playHook(AUDIO_HOOKS.actThree.hit);
      guards[0]!.hitsLanded += 1;
      if (guards[0]!.hitsLanded < checkpointRequiredHits) {
        const duration = Math.max(guards[0]!.actor?.play('hit') ?? 0.75, 1.35);
        guards[0]!.invincibleUntil = performance.now() + duration * 1000;
        scheduler.schedule(() => {
          if (!guards[0]!.neutralized) {
            guards[0]!.actor?.play('idle');
          }
        }, duration * 1000);
        setPrompt(prompts.checkpointOne.directHit(guards[0]!.hitsLanded));
        return;
      }

      const deathDuration = neutralizeGuard(guards[0]!, 0);
      movementBlockedUntil = performance.now() + deathDuration * 1000;
      scheduler.schedule(() => {
        if (phase === 'checkpoint-one' && guards[0]!.neutralized) {
          beginCheckpointRewardPhase(0);
        }
      }, deathDuration * 1000);
      return;
    }

    if (phase === 'checkpoint-two') {
      if (performance.now() < guards[1]!.invincibleUntil) {
        setPrompt(prompts.checkpointTwo.directHit(guards[1]!.hitsLanded));
        return;
      }

      if (!isCheckpointShotAligned(guards[1] ?? null)) {
        setPrompt(prompts.checkpointTwo.failed);
        return;
      }

      audio.playHook(AUDIO_HOOKS.actThree.hit);
      guards[1]!.hitsLanded += 1;
      if (guards[1]!.hitsLanded < checkpointRequiredHits) {
        const duration = Math.max(guards[1]!.actor?.play('hit') ?? 0.75, 1.35);
        guards[1]!.invincibleUntil = performance.now() + duration * 1000;
        scheduler.schedule(() => {
          if (!guards[1]!.neutralized) {
            guards[1]!.actor?.play('idle');
          }
        }, duration * 1000);
        setPrompt(prompts.checkpointTwo.directHit(guards[1]!.hitsLanded));
        return;
      }

      const deathDuration = neutralizeGuard(guards[1]!, 1);
      movementBlockedUntil = performance.now() + deathDuration * 1000;
      scheduler.schedule(() => {
        if (phase === 'checkpoint-two' && guards[1]!.neutralized) {
          beginCheckpointRewardPhase(1);
        }
      }, deathDuration * 1000);
    }
  };

  const isCrosshairOnBossCore = (): boolean => {
    if (!boss.visible) {
      return false;
    }

    updateShotRay();
    bossAimTarget.updateMatrixWorld(true);
    return shotRaycaster.intersectObject(bossAimTarget, true).length > 0;
  };

  const tryShoot = (): void => {
    if (!startupReady) {
      if (startupPromptVisible) {
        syncStartupModal();
      }
      return;
    }

    if (phase === 'checkpoint-one' || phase === 'checkpoint-two') {
      spawnArticleProjectile(getActiveCheckpointGuard()?.aimTarget ?? null);
      tryCheckpointShot();
      return;
    }

    if (phase !== 'shootout') {
      return;
    }

    if (performance.now() < bossInvincibleUntil) {
      spawnArticleProjectile(bossAimTarget);
      setPrompt(prompts.shootout.directHit(shotsLanded));
      return;
    }

    if (!isCrosshairOnBossCore()) {
      spawnArticleProjectile(bossAimTarget);
      setPrompt(prompts.shootout.waitForLockOn(shotsLanded));
      return;
    }

    const nextHit = shotsLanded + 1;
    audio.playHook(AUDIO_HOOKS.actThree.hit);
    spawnBossRegisteredProjectile(nextHit);
    shotsLanded = nextHit;
    if (shotsLanded >= shootout.requiredHits) {
      phase = 'complete';
      completeMissionObjective('lea');
      playPhaseAudio(AUDIO_HOOKS.actThree.shootoutVictory);
      const deathDuration = playBossDeath();
      bossInvincibleUntil = performance.now() + deathDuration * 1000;
      setPrompt(prompts.shootout.bossDown(scene.outro));
      scheduler.schedule(showActThreeReward, deathDuration * 1000);
      return;
    }

    const duration = playBossHitForHits(shotsLanded);
    bossInvincibleUntil = performance.now() + duration * 1000;
    const nextIdleHits = shotsLanded;
    scheduler.schedule(() => {
      if (phase === 'shootout') {
        playBossIdleAfterHit(nextIdleHits);
      }
    }, duration * 1000);
    setPrompt(prompts.shootout.directHit(shotsLanded));
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'KeyA') {
      event.preventDefault();
      strafeLeftHeld = true;
    }
    if (event.code === 'KeyD') {
      event.preventDefault();
      strafeRightHeld = true;
    }
    if (event.code === 'ArrowUp' || event.code === 'KeyW') {
      event.preventDefault();
      moveForwardHeld = true;
    }
    if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      event.preventDefault();
      moveBackwardHeld = true;
    }
    if (event.code === 'Space' && !event.repeat) {
      event.preventDefault();
      if (!startupReady && startupPromptDismissible) {
        advanceStartupModal();
        return;
      }
      tryShoot();
    }
    if (event.code === 'KeyX' && !event.repeat && !startupReady && startupPromptDismissible) {
      event.preventDefault();
      advanceStartupModal();
    }
  };

  const handleKeyUp = (event: KeyboardEvent): void => {
    if (event.code === 'KeyA') {
      strafeLeftHeld = false;
    }
    if (event.code === 'KeyD') {
      strafeRightHeld = false;
    }
    if (event.code === 'ArrowUp' || event.code === 'KeyW') {
      moveForwardHeld = false;
    }
    if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      moveBackwardHeld = false;
    }
  };

  const resetMovementState = (): void => {
    moveForwardHeld = false;
    moveBackwardHeld = false;
    strafeLeftHeld = false;
    strafeRightHeld = false;
  };

  const handleStageClick = (): void => {
    if (actThreeRewardVisible) {
      collectActThreeReward();
      return;
    }

    if (!startupReady && startupPromptDismissible) {
      advanceStartupModal();
      return;
    }

    if (!startupReady) {
      if (startupPromptVisible) {
        syncStartupModal();
      }
      return;
    }

    if (!controls.isLocked) {
      controls.lock();
    }
  };

  const applyGamepadLook = (state: ReturnType<GamepadInputManager['getState']>, delta: number): void => {
    if (!startupReady || phase === 'complete') {
      return;
    }

    if (Math.abs(state.lookX) < 0.01 && Math.abs(state.lookY) < 0.01) {
      return;
    }

    gamepadLookActive = true;
    camera.rotation.order = 'YXZ';
    camera.rotation.y -= state.lookX * worldConfig.camera.pointerSpeed * ACT_THREE_GAMEPAD_LOOK_SPEED * delta;
    camera.rotation.x = THREE.MathUtils.clamp(
      camera.rotation.x - state.lookY * worldConfig.camera.pointerSpeed * ACT_THREE_GAMEPAD_LOOK_SPEED * delta,
      worldConfig.camera.minPitch,
      worldConfig.camera.maxPitch,
    );
  };

  const animate = (now: number): void => {
    const delta = Math.min((now - previousTime) / 1000, 0.05);
    previousTime = now;
    const gamepadState = input.getState();
    const gamepadForwardHeld = gamepadState.moveY < -0.45;
    const gamepadBackwardHeld = gamepadState.moveY > 0.45;
    const gamepadStrafeLeftHeld = gamepadState.moveX < -0.45;
    const gamepadStrafeRightHeld = gamepadState.moveX > 0.45;

    const forwardHeld = moveForwardHeld || gamepadForwardHeld;
    const backwardHeld = moveBackwardHeld || gamepadBackwardHeld;
    const leftHeld = strafeLeftHeld || gamepadStrafeLeftHeld;
    const rightHeld = strafeRightHeld || gamepadStrafeRightHeld;
    const movementEnabled = startupReady && phase !== 'complete' && now >= movementBlockedUntil;

    applyGamepadLook(gamepadState, delta);

    if (movementEnabled && forwardHeld) {
      movePlayer(delta * worldConfig.motion.forwardSpeed);
    }

    if (movementEnabled && backwardHeld && !isCheckpointForwardLocked() && !isShootoutForwardLocked()) {
      movePlayer(-delta * worldConfig.motion.backwardSpeed);
    }

    if (movementEnabled && leftHeld) {
      movePlayer(delta * worldConfig.motion.backwardSpeed, -1);
    }

    if (movementEnabled && rightHeld) {
      movePlayer(delta * worldConfig.motion.backwardSpeed, 1);
    }

    updatePathStateFromCamera();
    faceRouteDirection();
    updateCheckpointRelics(now);

    guards.forEach((guard) => {
      if (guard.mesh.visible && (!guard.neutralized || performance.now() < guard.invincibleUntil)) {
        guard.actor?.update(delta);
      }
    });
    if (boss.visible) {
      bossActor?.update(delta);
    }
    updateProjectiles(delta);
    handsRecoil = Math.max(0, handsRecoil - delta * 7.5);
    particles.rotation.y += delta * 0.08;
    if (hands) {
      const movementBob =
        startupReady && phase !== 'complete' && (forwardHeld || backwardHeld || leftHeld || rightHeld)
          ? Math.sin((now / 1000) * worldConfig.hands.bobSpeed) * worldConfig.hands.bobAmplitudeY
          : 0;
      applyHandsTuning(movementBob, 0, handsRecoil);
    }

    if (!startupReady) {
      if (startupPromptVisible) {
        syncStartupModal();
      }
      setTargetEnemyLabel('');
      syncInternalEncounterState();
      renderer.render(world, camera);
      frameId = requestAnimationFrame(animate);
      return;
    }

    if (phase === 'checkpoint-one') {
      setPrompt(
        isCheckpointShotAligned(guards[0] ?? null)
          ? prompts.checkpointOne.ready
          : isCheckpointForwardLocked()
            ? prompts.checkpointOne.locked
            : prompts.checkpointOne.travel,
      );
    }

    if (phase === 'checkpoint-one-reward') {
      setPrompt(prompts.checkpointOneReward);
    }

    if (phase === 'checkpoint-two') {
      setPrompt(
        isCheckpointShotAligned(guards[1] ?? null)
          ? prompts.checkpointTwo.ready
          : isCheckpointForwardLocked()
            ? prompts.checkpointTwo.locked
            : prompts.checkpointTwo.travel,
      );
    }

    if (phase === 'checkpoint-two-reward') {
      setPrompt(prompts.checkpointTwoReward);
    }

    if (phase === 'shootout') {
      setPrompt(
        performance.now() < bossInvincibleUntil
          ? prompts.shootout.directHit(shotsLanded)
          : isCrosshairOnBossCore()
            ? prompts.shootout.vulnerable(shotsLanded)
            : prompts.shootout.waitForLockOn(shotsLanded),
      );
    }

    setTargetEnemyLabel(getCurrentCrosshairTargetLabel());
    syncInternalEncounterState();
    renderer.render(world, camera);
    frameId = requestAnimationFrame(animate);
  };

  resize();
  updatePointerLockHint();
  if (handsTunerEnabled) {
    mountHandsTuner();
  }
  if (hands) {
    camera.add(hands);
    updateHandsCredentials();
    applyHandsTuning();
  }
  setStartupModalState(true, true);
  setPrompt(STARTUP_KILL_PROMPT);
  playPhaseAudio(AUDIO_HOOKS.actThree.intro);
  updatePointerLockHint();

  const startStartupPreload = async (): Promise<void> => {
    const handsPromise = loadActThreeFirstPersonHands(worldConfig.hands);
    const actorPromises = Promise.all([ensureGuardLoaded(0), ensureGuardLoaded(1), ensureBossLoaded()]);
    const loadedHands = await handsPromise;
    if (disposed) {
      return;
    }

    if (hands) {
      camera.remove(hands);
    }
    hands = loadedHands;
    camera.add(loadedHands);
    updateHandsCredentials();
    applyHandsTuning();

    await actorPromises;
    if (disposed) {
      return;
    }

    prewarmEncounterVisibility();
    startupAssetsReady = true;
    syncStartupModal();
  };

  void startStartupPreload();
  renderer.domElement.addEventListener('click', handleStageClick);
  startupDismissButton.addEventListener('click', advanceStartupModal);
  controls.addEventListener('lock', updatePointerLockHint);
  controls.addEventListener('unlock', updatePointerLockHint);
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', resetMovementState);
  const unsubscribeGamepad = input.subscribe((state) => {
    if (
      Math.abs(state.moveX) > 0.01 ||
      Math.abs(state.moveY) > 0.01 ||
      Math.abs(state.lookX) > 0.01 ||
      Math.abs(state.lookY) > 0.01 ||
      state.confirm ||
      state.cancel ||
      state.shoot
    ) {
      audio.recoverPlayback();
      window.setTimeout(() => audio.recoverPlayback(), 0);
    }

    if (!startupReady && startupPromptDismissible && state.confirmPressed) {
      advanceStartupModal();
      return;
    }
    if (state.confirmPressed) {
      collectActThreeReward();
    }
    if (state.shootPressed) {
      tryShoot();
    }
  });
  frameId = requestAnimationFrame(animate);

  return () => {
    disposed = true;
    cancelAnimationFrame(frameId);
    scheduler.clear();
    resetMovementState();
    renderer.domElement.removeEventListener('click', handleStageClick);
    startupDismissButton.removeEventListener('click', advanceStartupModal);
    controls.removeEventListener('lock', updatePointerLockHint);
    controls.removeEventListener('unlock', updatePointerLockHint);
    if (controls.isLocked) {
      controls.unlock();
    }
    controls.dispose();
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('blur', resetMovementState);
    unsubscribeGamepad();
    guards.forEach((guard) => {
      guard.actor?.dispose();
      guard.actor = null;
    });
    bossActor?.dispose();
    bossActor = null;
    activeProjectiles.forEach((projectile) => {
      projectile.sprite.material.dispose();
      projectile.flash.material.dispose();
      projectile.sprite.removeFromParent();
      projectile.flash.removeFromParent();
    });
    activeProjectiles.length = 0;
    checkpointRelics.forEach((relic) => {
      relic.worldSprite.material.dispose();
      relic.worldSprite.removeFromParent();
      relic.texture.dispose();
    });
    articleProjectileTextures.forEach((article) => article.texture.dispose());
    impactFlashTexture.dispose();
    renderer.dispose();
    target.innerHTML = '';
  };
}
