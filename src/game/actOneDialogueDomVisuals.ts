import type { WorldDialogueSequenceDefinition } from '../types';
import { renderEyebrow, renderTextParagraphs } from './domMarkup';

export interface ActOneDialogueOverlayRenderOptions {
  actFour?: boolean;
  bottom: number;
  dialogue: WorldDialogueSequenceDefinition;
  left: number;
  width: number;
}

export function renderActOneDialogueOverlay({
  actFour = false,
  bottom,
  dialogue,
  left,
  width,
}: ActOneDialogueOverlayRenderOptions): string {
  const actFourClass = actFour ? ' act-one-dialogue--act-four' : '';

  return `
    <div class="act-one-dialogue act-one-dialogue--${dialogue.anchor}${actFourClass}" style="left:${left}px; width:${width}px; bottom:${bottom}px;">
      ${renderEyebrow(dialogue.speakerLabel)}
      ${renderTextParagraphs(dialogue.lines)}
      <div class="act-one-dialogue__actions">
        <button class="app-button app-button--bright" data-dialogue-ok type="button">Press X</button>
      </div>
    </div>
  `;
}
