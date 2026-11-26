/**
 * Desktop-only interactive pointer glow controller.
 * Uses CSSOM transform updates only and auto-pauses when settled, hidden, or reduced-motion.
 */
export class AmbientPointerController {
  private readonly pointerEl: HTMLElement;
  private readonly finePointerQuery: MediaQueryList | null;
  private readonly reducedMotionQuery: MediaQueryList | null;
  private readonly onPointerMoveBound: (event: PointerEvent) => void;
  private readonly onDeactivateBound: () => void;
  private readonly onVisibilityChangeBound: () => void;
  private readonly onMediaChangeBound: () => void;

  private listenersAttached = false;
  private hasPosition = false;
  private targetX = 0;
  private targetY = 0;
  private currentX = 0;
  private currentY = 0;
  private lastFrameTime = 0;
  private rafId: number | null = null;

  public constructor(pointerEl: HTMLElement) {
    this.pointerEl = pointerEl;
    const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
    this.finePointerQuery = hasMatchMedia
      ? window.matchMedia('(hover: hover) and (pointer: fine)')
      : null;
    this.reducedMotionQuery = hasMatchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    this.onPointerMoveBound = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      this.targetX = event.clientX;
      this.targetY = event.clientY;

      if (!this.hasPosition) {
        this.hasPosition = true;
        this.currentX = this.targetX;
        this.currentY = this.targetY;
        this.applyTransform(this.currentX, this.currentY);
        this.pointerEl.classList.add('is-active');
        return;
      }

      this.pointerEl.classList.add('is-active');
      this.ensureLoop();
    };

    this.onDeactivateBound = () => {
      this.deactivate();
    };

    this.onVisibilityChangeBound = () => {
      if (document.visibilityState === 'hidden') {
        this.deactivate();
      }
    };

    this.onMediaChangeBound = () => {
      this.syncEligibility();
    };

    this.finePointerQuery?.addEventListener('change', this.onMediaChangeBound);
    this.reducedMotionQuery?.addEventListener('change', this.onMediaChangeBound);
    this.syncEligibility();
  }

  private isEligible(): boolean {
    if (this.finePointerQuery === null || this.reducedMotionQuery === null) {
      return false;
    }
    return this.finePointerQuery.matches && !this.reducedMotionQuery.matches;
  }

  private syncEligibility(): void {
    if (this.isEligible()) {
      this.attachPointerListeners();
    } else {
      this.detachPointerListeners();
      this.deactivate();
    }
  }

  private attachPointerListeners(): void {
    if (this.listenersAttached) return;
    this.listenersAttached = true;
    window.addEventListener('pointermove', this.onPointerMoveBound, { passive: true });
    document.documentElement.addEventListener('mouseleave', this.onDeactivateBound);
    window.addEventListener('blur', this.onDeactivateBound);
    document.addEventListener('visibilitychange', this.onVisibilityChangeBound);
  }

  private detachPointerListeners(): void {
    if (!this.listenersAttached) return;
    this.listenersAttached = false;
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    document.documentElement.removeEventListener('mouseleave', this.onDeactivateBound);
    window.removeEventListener('blur', this.onDeactivateBound);
    document.removeEventListener('visibilitychange', this.onVisibilityChangeBound);
  }

  private cancelLoop(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastFrameTime = 0;
  }

  private deactivate(): void {
    this.cancelLoop();
    this.hasPosition = false;
    this.pointerEl.classList.remove('is-active');
  }

  private applyTransform(x: number, y: number): void {
    this.pointerEl.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }

  private ensureLoop(): void {
    if (this.rafId !== null) return;
    this.lastFrameTime = performance.now();
    this.rafId = window.requestAnimationFrame((now) => this.tick(now));
  }

  private tick(now: number): void {
    this.rafId = null;
    const dtSeconds = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;

    const dx = this.targetX - this.currentX;
    const dy = this.targetY - this.currentY;
    if (Math.hypot(dx, dy) < 0.35) {
      this.currentX = this.targetX;
      this.currentY = this.targetY;
      this.applyTransform(this.currentX, this.currentY);
      this.lastFrameTime = 0;
      return;
    }

    const alpha = 1 - Math.exp(-11 * dtSeconds);
    this.currentX += dx * alpha;
    this.currentY += dy * alpha;
    this.applyTransform(this.currentX, this.currentY);
    this.rafId = window.requestAnimationFrame((nextNow) => this.tick(nextNow));
  }

  public destroy(): void {
    this.detachPointerListeners();
    this.deactivate();
    this.pointerEl.style.transform = '';
    this.finePointerQuery?.removeEventListener('change', this.onMediaChangeBound);
    this.reducedMotionQuery?.removeEventListener('change', this.onMediaChangeBound);
  }
}
