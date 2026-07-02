import './style.css';
import { gameContent } from './content';
import { EraRoastDirector } from './game/director';

const root = document.querySelector<HTMLElement>('#app');
const params = new URLSearchParams(window.location.search);
const startSceneId = params.get('scene') ?? undefined;
const autoplay = ['1', 'true', 'yes'].includes((params.get('autoplay') ?? '').toLowerCase());

if (!root) {
  throw new Error('Missing #app root element.');
}

const director = new EraRoastDirector(root, gameContent, {
  startSceneId,
  autoplay,
});
director.render();
