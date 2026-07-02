# Act 2 Model Schema

Act 2 uses one GLB file per animation cue. Bindings live in [`src/game/actTwoModelSchema.ts`](../src/game/actTwoModelSchema.ts). Runtime playback lives in [`src/game/actTwoPartyVisual.ts`](../src/game/actTwoPartyVisual.ts) and [`src/game/actTwoEnemyVisual.ts`](../src/game/actTwoEnemyVisual.ts).

## Party Slots

Party actors:

- `boss-prime`
- `planner-mage`

Slots:

| Slot | Required | Behavior |
| --- | --- | --- |
| `exploration-idle` | yes | Field idle loop |
| `exploration-move` | yes | Field movement loop |
| `battle-start` | yes | One-shot battle entrance |
| `battle-idle` | yes | Battle idle loop |
| `battle-guard` | yes | One-shot guard cue |
| `battle-hit` | yes | Runtime cue mapped to this actor’s own guard file |
| `battle-attack` | yes | One-shot attack cue |
| `battle-skill` | yes | One-shot ability cue |
| `battle-victory` | yes | One-shot victory cue |

## Enemy Slots

Enemy actors:

- `taxi-migrant`
- `anton-distorton`
- `vadim-heavydim`
- `giant-khinkali`

Slots:

| Slot | Required | Behavior |
| --- | --- | --- |
| `battle-idle` | yes | Battle idle loop |
| `battle-hit` | yes | One-shot damage reaction |
| `battle-defeat` | yes | One-shot defeat cue, clamped on final pose |

## Live Party Bindings

### Boss Prime

| Slot | File |
| --- | --- |
| `exploration-idle` | `/models/act-2/player/boss-prime-pc-idle.glb` |
| `exploration-move` | `/models/act-2/player/boss-prime-pc-walk.glb` |
| `battle-start` | `/models/act-2/player/boss-prime-pc-battle-start.glb` |
| `battle-idle` | `/models/act-2/player/boss-prime-pc-idle.glb` |
| `battle-guard` | `/models/act-2/player/boss-prime-pc-battle-guard.glb` |
| `battle-hit` | `/models/act-2/player/boss-prime-pc-battle-guard.glb` |
| `battle-attack` | `/models/act-2/player/boss-prime-pc-battle-attack.glb` |
| `battle-skill` | `/models/act-2/player/boss-prime-pc-battle-skill.glb` |
| `battle-victory` | `/models/act-2/player/boss-prime-pc-battle-victory.glb` |

### Planner Mage

| Slot | File |
| --- | --- |
| `exploration-idle` | `/models/act-2/party/planner-mage/exploration-idle.glb` |
| `exploration-move` | `/models/act-2/party/planner-mage/exploration-move.glb` |
| `battle-start` | `/models/act-2/party/planner-mage/battle-start.glb` |
| `battle-idle` | `/models/act-2/party/planner-mage/battle-idle.glb` |
| `battle-guard` | `/models/act-2/party/planner-mage/battle-guard.glb` |
| `battle-hit` | `/models/act-2/party/planner-mage/battle-guard.glb` |
| `battle-attack` | `/models/act-2/party/planner-mage/battle-attack.glb` |
| `battle-skill` | `/models/act-2/party/planner-mage/battle-skill.glb` |
| `battle-victory` | `/models/act-2/party/planner-mage/partner-victory.glb` |

## Live Enemy Bindings

| Actor | Idle | Hit | Defeat |
| --- | --- | --- | --- |
| `taxi-migrant` | `/models/act-2/enemies/taxi-migrant/battle-idle.glb` | `/models/act-2/enemies/taxi-migrant/battle-hit.glb` | `/models/act-2/enemies/taxi-migrant/battle-defeat.glb` |
| `anton-distorton` | `/models/act-2/enemies/anton-distorton/battle-idle.glb` | `/models/act-2/enemies/anton-distorton/battle-hit.glb` | `/models/act-2/enemies/anton-distorton/battle-defeat.glb` |
| `vadim-heavydim` | `/models/act-2/enemies/vadim-heavydim/battle-idle.glb` | `/models/act-2/enemies/vadim-heavydim/battle-hit.glb` | `/models/act-2/enemies/vadim-heavydim/battle-defeat.glb` |
| `giant-khinkali` | `/models/act-2/enemies/giant-khinkali/battle-idle.glb` | `/models/act-2/enemies/giant-khinkali/battle-hit.glb` | `/models/act-2/enemies/giant-khinkali/battle-defeat.glb` |

## Runtime Timing

- Enemy hit and defeat reactions are synchronized with party attack/skill impact windows.
- Enemy HP changes during the hit/defeat reaction.
- Party being-hit reactions play when enemies deal damage.
- Party `battle-hit` uses the struck actor’s own guard cue by design.
- Victory waits for living party victory cues before the route advances.
