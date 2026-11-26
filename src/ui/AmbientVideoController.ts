const AMBIENT_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_135039_b04d00db-6ee2-4e2a-a7f5-b2dfd3d24fd2.mp4';

/**
 * Manages the decorative background video lifecycle with strict reduced-motion gating,
 * background-tab suspension, graceful offline fallback, and clean pagehide teardown.
 */
export class AmbientVideoController {
  private readonly layerEl: HTMLElement;
  private readonly videoEl: HTMLVideoElement;
  private readonly reducedMotionQuery: MediaQueryList | null;
  private readonly onVisibilityChangeBound: () => void;
  private readonly onMediaChangeBound: () => void;
  private readonly onCanPlayBound: () => void;
  private readonly onErrorBound: () => void;

  private srcAssigned = false;
  private destroyed = false;

  public constructor(layerEl: HTMLElement, videoEl: HTMLVideoElement) {
    this.layerEl = layerEl;
    this.videoEl = videoEl;

    this.videoEl.muted = true;
    this.videoEl.defaultMuted = true;
    this.videoEl.loop = true;
    this.videoEl.playsInline = true;

    const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
    this.reducedMotionQuery = hasMatchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    this.onCanPlayBound = () => {
      if (this.destroyed || !this.shouldPlay()) return;
      this.layerEl.setAttribute('data-video-state', 'ready');
    };

    this.onErrorBound = () => {
      if (this.destroyed) return;
      this.layerEl.setAttribute('data-video-state', 'error');
    };

    this.onVisibilityChangeBound = () => {
      this.syncPlayback();
    };

    this.onMediaChangeBound = () => {
      this.syncPlayback();
    };

    this.videoEl.addEventListener('canplay', this.onCanPlayBound);
    this.videoEl.addEventListener('error', this.onErrorBound);
    document.addEventListener('visibilitychange', this.onVisibilityChangeBound);
    this.reducedMotionQuery?.addEventListener('change', this.onMediaChangeBound);

    this.syncPlayback();
  }

  private isReducedMotion(): boolean {
    return this.reducedMotionQuery?.matches ?? false;
  }

  private shouldPlay(): boolean {
    return !this.isReducedMotion() && document.visibilityState !== 'hidden';
  }

  private syncPlayback(): void {
    if (this.destroyed) return;

    if (!this.shouldPlay()) {
      this.videoEl.pause();
      if (this.isReducedMotion()) {
        this.layerEl.setAttribute('data-video-state', 'reduced-motion');
      }
      return;
    }

    if (!this.srcAssigned) {
      this.srcAssigned = true;
      this.layerEl.setAttribute('data-video-state', 'loading');
      this.videoEl.src = AMBIENT_VIDEO_URL;
    } else if (this.videoEl.readyState >= 2) {
      this.layerEl.setAttribute('data-video-state', 'ready');
    }

    void this.videoEl.play().catch(() => {
      // Autoplay rejection (e.g., strict browser policy or blocked media) keeps CSS fallback cleanly.
    });
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.videoEl.removeEventListener('canplay', this.onCanPlayBound);
    this.videoEl.removeEventListener('error', this.onErrorBound);
    document.removeEventListener('visibilitychange', this.onVisibilityChangeBound);
    this.reducedMotionQuery?.removeEventListener('change', this.onMediaChangeBound);

    this.videoEl.pause();
    this.videoEl.removeAttribute('src');
    this.videoEl.load();
    this.srcAssigned = false;
    this.layerEl.setAttribute('data-video-state', 'paused');
  }
}
