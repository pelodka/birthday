export type GamepadButtonIntent = 'confirm' | 'cancel' | 'shoot';

export interface GamepadInputState {
  connected: boolean;
  id: string | null;
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  confirm: boolean;
  cancel: boolean;
  shoot: boolean;
  confirmPressed: boolean;
  cancelPressed: boolean;
  shootPressed: boolean;
}

type GamepadInputListener = (state: GamepadInputState, previousState: GamepadInputState) => void;

const STICK_DEADZONE = 0.25;
const TRIGGER_THRESHOLD = 0.55;
const POINTER_RESTORE_GRACE_MS = 900;
const POINTER_RESTORE_MOVE_THRESHOLD = 10;

const INITIAL_STATE: GamepadInputState = {
  connected: false,
  id: null,
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  confirm: false,
  cancel: false,
  shoot: false,
  confirmPressed: false,
  cancelPressed: false,
  shootPressed: false,
};

function applyDeadzone(value: number): number {
  if (Math.abs(value) < STICK_DEADZONE) {
    return 0;
  }

  const adjusted = (Math.abs(value) - STICK_DEADZONE) / (1 - STICK_DEADZONE);
  return Math.sign(value) * Math.min(adjusted, 1);
}

function getButtonPressed(gamepad: Gamepad, index: number, threshold = 0.5): boolean {
  const button = gamepad.buttons[index];
  return Boolean(button?.pressed || (button?.value ?? 0) > threshold);
}

function strongestAxis(primary: number, secondary: number): number {
  return Math.abs(primary) >= Math.abs(secondary) ? primary : secondary;
}

export class GamepadInputManager {
  private state: GamepadInputState = INITIAL_STATE;
  private frameId = 0;
  private usingController = false;
  private pointerListenersBound = false;
  private controllerActivatedAt = 0;
  private lastPointerPosition: { x: number; y: number } | null = null;
  private readonly listeners = new Set<GamepadInputListener>();

  start(): void {
    if (this.frameId || !('getGamepads' in navigator)) {
      return;
    }

    this.bindPointerModalityListeners();
    this.frameId = window.requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (!this.frameId) {
      return;
    }

    window.cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.unbindPointerModalityListeners();
    this.usingController = false;
    this.syncControllerCursorClass();
    this.publish(INITIAL_STATE);
  }

  getState(): GamepadInputState {
    return this.state;
  }

  subscribe(listener: GamepadInputListener): () => void {
    this.listeners.add(listener);
    listener(this.state, this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private readonly tick = (): void => {
    const gamepad = this.findController();
    const previousState = this.state;
    const nextState = gamepad ? this.readController(gamepad, previousState) : INITIAL_STATE;

    this.publish(nextState, previousState);
    this.frameId = window.requestAnimationFrame(this.tick);
  };

  private findController(): Gamepad | null {
    const gamepads = navigator.getGamepads();
    const standardController = Array.from(gamepads).find((gamepad) => gamepad?.connected && gamepad.mapping === 'standard');

    return standardController ?? Array.from(gamepads).find((gamepad) => gamepad?.connected) ?? null;
  }

  private readController(gamepad: Gamepad, previousState: GamepadInputState): GamepadInputState {
    const leftX = applyDeadzone(gamepad.axes[0] ?? 0);
    const leftY = applyDeadzone(gamepad.axes[1] ?? 0);
    const rightX = applyDeadzone(gamepad.axes[2] ?? 0);
    const rightY = applyDeadzone(gamepad.axes[3] ?? 0);
    const dpadX = (getButtonPressed(gamepad, 15) ? 1 : 0) - (getButtonPressed(gamepad, 14) ? 1 : 0);
    const dpadY = (getButtonPressed(gamepad, 13) ? 1 : 0) - (getButtonPressed(gamepad, 12) ? 1 : 0);
    const moveX = strongestAxis(dpadX, leftX);
    const moveY = strongestAxis(dpadY, leftY);
    const confirm = getButtonPressed(gamepad, 0);
    const cancel = getButtonPressed(gamepad, 1);
    const shoot = getButtonPressed(gamepad, 7, TRIGGER_THRESHOLD);

    return {
      connected: true,
      id: gamepad.id,
      moveX,
      moveY,
      lookX: rightX,
      lookY: rightY,
      confirm,
      cancel,
      shoot,
      confirmPressed: confirm && !previousState.confirm,
      cancelPressed: cancel && !previousState.cancel,
      shootPressed: shoot && !previousState.shoot,
    };
  }

  private publish(nextState: GamepadInputState, previousState: GamepadInputState = this.state): void {
    this.state = nextState;
    if (!nextState.connected) {
      this.usingController = false;
      this.syncControllerCursorClass();
    } else if (this.hasControllerActivity(nextState)) {
      this.usingController = true;
      this.syncControllerCursorClass();
    }
    this.listeners.forEach((listener) => listener(nextState, previousState));
  }

  private hasControllerActivity(state: GamepadInputState): boolean {
    return (
      Math.abs(state.moveX) > 0.01 ||
      Math.abs(state.moveY) > 0.01 ||
      Math.abs(state.lookX) > 0.01 ||
      Math.abs(state.lookY) > 0.01 ||
      state.confirm ||
      state.cancel ||
      state.shoot
    );
  }

  private bindPointerModalityListeners(): void {
    if (this.pointerListenersBound) {
      return;
    }

    this.pointerListenersBound = true;
    window.addEventListener('pointermove', this.handlePointerInput, { passive: true });
    window.addEventListener('pointerdown', this.handlePointerInput, { passive: true });
    window.addEventListener('mousedown', this.handlePointerInput, { passive: true });
    window.addEventListener('touchstart', this.handlePointerInput, { passive: true });
  }

  private unbindPointerModalityListeners(): void {
    if (!this.pointerListenersBound) {
      return;
    }

    this.pointerListenersBound = false;
    window.removeEventListener('pointermove', this.handlePointerInput);
    window.removeEventListener('pointerdown', this.handlePointerInput);
    window.removeEventListener('mousedown', this.handlePointerInput);
    window.removeEventListener('touchstart', this.handlePointerInput);
    this.lastPointerPosition = null;
  }

  private readonly handlePointerInput = (event: PointerEvent | MouseEvent | TouchEvent): void => {
    if (!this.usingController) {
      if ('clientX' in event) {
        this.lastPointerPosition = { x: event.clientX, y: event.clientY };
      }
      return;
    }

    if (event.type === 'pointermove' || event.type === 'mousemove') {
      if (!('clientX' in event)) {
        return;
      }

      const position = { x: event.clientX, y: event.clientY };
      const previousPosition = this.lastPointerPosition;
      this.lastPointerPosition = position;
      const distance = previousPosition
        ? Math.hypot(position.x - previousPosition.x, position.y - previousPosition.y)
        : 0;
      if (performance.now() - this.controllerActivatedAt < POINTER_RESTORE_GRACE_MS) {
        return;
      }
      if (distance < POINTER_RESTORE_MOVE_THRESHOLD) {
        return;
      }
    }

    this.usingController = false;
    this.syncControllerCursorClass();
  };

  private syncControllerCursorClass(): void {
    if (this.usingController) {
      this.controllerActivatedAt = performance.now();
    }

    document.documentElement.classList.toggle('is-controller-active', this.usingController);
    document.body?.classList.toggle('is-controller-active', this.usingController);
  }
}
