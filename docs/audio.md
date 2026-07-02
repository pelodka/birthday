# Audio Hooks

The director owns one [`SceneAudioController`](../src/audio/sceneAudio.ts). Act runtimes call hook ids from [`src/audio/hooks.ts`](../src/audio/hooks.ts); act-local audio maps decide which music, voice, or SFX plays.

## Files

- [`src/audio/hooks.ts`](../src/audio/hooks.ts): canonical hook ids.
- [`src/audio/sceneAudio.ts`](../src/audio/sceneAudio.ts): playback manager.
- `src/content/act*/audio.ts`: per-act hook maps.
- [`public/audio`](../public/audio): runtime audio files served as `/audio/...`.

New or replacement audio must follow [Asset Policy](../ASSET_POLICY.md).

## Contract

Runtime code calls:

```ts
audio.playHook(AUDIO_HOOKS.actTwo.encounterStartBoss);
```

The scene audio config maps that hook:

```ts
[AUDIO_HOOKS.actTwo.encounterStartBoss]: {
  music: 'khinkaliEncounter',
  voice: 'bossEncounter',
}
```

Hook entries can:

- start music
- pause music
- stop music
- play voice
- stop voice
- play SFX
- restart voice or SFX

Logical ids with no `src` no-op safely.

## File Map

Shared:

- [`public/audio/shared/sfx/among-us-reveal.mp3`](../public/audio/shared/sfx/among-us-reveal.mp3): location title cards.
- [`public/audio/shared/sfx/arcade-bonus.mp3`](../public/audio/shared/sfx/arcade-bonus.mp3): prize/artifact collection.

Act 1:

- [`public/audio/act-1/music/promise.mp3`](../public/audio/act-1/music/promise.mp3): field.
- [`public/audio/act-1/music/guano-apes-big-in-japan.mp3`](../public/audio/act-1/music/guano-apes-big-in-japan.mp3): first encounter.
- [`public/audio/act-1/music/reis-piter-erevan.mp3`](../public/audio/act-1/music/reis-piter-erevan.mp3): second encounter.
- [`public/audio/act-1/music/ariya-bespechnyj-angel.mp3`](../public/audio/act-1/music/ariya-bespechnyj-angel.mp3): boss.

Act 2:

- [`public/audio/act-2/music/blue-fields.mp3`](../public/audio/act-2/music/blue-fields.mp3): field.
- [`public/audio/act-2/music/nyu-yorkskij-taksist.mp3`](../public/audio/act-2/music/nyu-yorkskij-taksist.mp3): taxi encounter.
- [`public/audio/act-2/music/govnari.mp4`](../public/audio/act-2/music/govnari.mp4): duo encounter.
- [`public/audio/act-2/music/armyane-vsego-mira.mp3`](../public/audio/act-2/music/armyane-vsego-mira.mp3): boss.

Act 3:

- [`public/audio/act-3/music/rot-und-schwarz.mp3`](../public/audio/act-3/music/rot-und-schwarz.mp3): route music.
- [`public/audio/act-3/sfx/sniper-rifle-impulse-shoot.mp3`](../public/audio/act-3/sfx/sniper-rifle-impulse-shoot.mp3): shots.
- [`public/audio/act-3/sfx/ack.mp3`](../public/audio/act-3/sfx/ack.mp3): registered hits.

Act 4:

- [`public/audio/act-4/music/e-dance.mp3`](../public/audio/act-4/music/e-dance.mp3): approach/background.
- [`public/audio/act-4/music/kikile.mp3`](../public/audio/act-4/music/kikile.mp3): Valera/finale.
- [`public/audio/act-4/sfx/naruto-screaming.mp3`](../public/audio/act-4/sfx/naruto-screaming.mp3): showdown start.
- [`public/audio/act-4/music/anime-showdown-loud.mp3`](../public/audio/act-4/music/anime-showdown-loud.mp3): showdown loop.
- [`public/audio/act-4/sfx/studio-audience-awwww.mp3`](../public/audio/act-4/sfx/studio-audience-awwww.mp3): post-showdown handoff.

## Act 4 Hook Names

- `act-4:approach:start`
- `act-4:foot:notice`
- `act-4:reveal:start`
- `act-4:reveal:zoom-out`
- `act-4:reveal:zoom-in`
- `act-4:cards:start`
- `act-4:cards:zero-card-played`
- `act-4:support-card:reveal`
- `act-4:support-card:played`
- `act-4:valera:summon`
- `act-4:valera:idle`
- `act-4:valera:transform`
- `act-4:valera:second-transform`
- `act-4:valera:conjure`
- `act-4:valera:support`
- `act-4:valera:reverse-summon`
- `act-4:artifacts:start`
- `act-4:artifact:consume`
- `act-4:showdown:start`
- `act-4:showdown:music`
- `act-4:win:ready`
- `act-4:win:press`
- `act-4:credits:start`
- `act-4:credits:strike`
- `act-4:ending:start`

## Browser Audio Unlock

Browsers require a trusted user gesture before unmuted playback. The start overlay supplies that gesture during normal play.
