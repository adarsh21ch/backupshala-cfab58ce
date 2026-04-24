import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDuration } from '@/lib/videoTypes';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2, AlertCircle, RotateCcw, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

type WatermarkPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
type WatermarkSize = 'small' | 'medium' | 'large';

interface BackupshalaVideoPlayerProps {
  assetId?: string;
  bsvCode?: string;
  moduleId?: string;
  courseId?: string;
  isPublicWatch?: boolean;
  /** Preview mode: skip ALL progress fetch + save (logged-out friendly) */
  isPreview?: boolean;
  /** Player setting overrides (resolved from module > course > platform settings) */
  allowSeek?: boolean;
  allowSpeedChange?: boolean;
  minWatchPercent?: number;
  showWatermark?: boolean;
  watermarkText?: string;
  watermarkPosition?: WatermarkPosition;
  watermarkOpacity?: number; // 0-100
  watermarkSize?: WatermarkSize;
  onProgress?: (data: { currentTime: number; duration: number; percentage: number; maxWatchedPercentage: number }) => void;
  onComplete?: () => void;
  onReady?: (duration: number) => void;
  onEnded?: () => void;
  autoPlay?: boolean;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const sizeClassMap: Record<WatermarkSize, string> = {
  small: 'text-[10px]',
  medium: 'text-[13px]',
  large: 'text-base',
};

const positionClassMap: Record<WatermarkPosition, string> = {
  'bottom-right': 'bottom-[60px] right-3',
  'bottom-left': 'bottom-[60px] left-3',
  'top-right': 'top-3 right-3',
  'top-left': 'top-3 left-3',
};

const BackupshalaVideoPlayer = ({
  assetId, bsvCode, moduleId, courseId, isPublicWatch = false,
  isPreview = false,
  allowSeek = false,
  allowSpeedChange = false,
  minWatchPercent = 80,
  showWatermark = true,
  watermarkText = 'Backupshala',
  watermarkPosition = 'bottom-right',
  watermarkOpacity = 60,
  watermarkSize = 'medium',
  onProgress, onComplete, onReady, onEnded, autoPlay = false,
}: BackupshalaVideoPlayerProps) => {
  const { user, profile } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const controlsTimeout = useRef<number>();
  const trackingInterval = useRef<number>();
  const seekToastRef = useRef<number>(0);

  // Treat preview as a public, no-tracking session
  const skipProgress = isPreview || isPublicWatch;

  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    const stored = Number(window.localStorage.getItem('bs_video_speed'));
    return SPEED_OPTIONS.includes(stored) ? stored : 1;
  });

  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [maxWatchedSeconds, setMaxWatchedSeconds] = useState(0);
  const [maxWatchedPercentage, setMaxWatchedPercentage] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumePosition, setResumePosition] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Fetch playback URL
  useEffect(() => {
    const fetchUrl = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/r2-get-playback-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ asset_id: assetId, bsv_code: bsvCode, module_id: moduleId, course_id: courseId, is_public_watch: isPublicWatch || isPreview }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setPlaybackUrl(data.playback_url);
        if (data.duration_seconds) setDuration(data.duration_seconds);
      } catch (err: any) {
        setError(err.message || 'Failed to load video');
      }
      setIsLoading(false);
    };
    fetchUrl();
  }, [assetId, bsvCode, moduleId, courseId, isPublicWatch, isPreview]);

  // Fetch existing watch progress for resume (skip in preview/public)
  useEffect(() => {
    if (skipProgress || !moduleId) return;
    const fetchProgress = async () => {
      const { data } = await (supabase as any).from('video_watch_progress')
        .select('*').eq('module_id', moduleId).maybeSingle();
      if (data) {
        setMaxWatchedSeconds(data.max_watched_seconds || 0);
        setMaxWatchedPercentage(Number(data.max_watched_percentage || 0));
        setIsCompleted(data.is_completed || false);
        if (data.last_position_seconds > 30) {
          setResumePosition(data.last_position_seconds);
          setShowResumePrompt(true);
        }
      }
    };
    fetchProgress();
  }, [moduleId, skipProgress]);

  // Progress tracking interval (every 10s) — skip in preview/public
  useEffect(() => {
    if (skipProgress || !moduleId || !assetId) return;
    trackingInterval.current = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || v.paused || !v.duration) return;
      const pct = (v.currentTime / v.duration) * 100;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        fetch(`https://${projectId}.supabase.co/functions/v1/update-watch-progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({
            video_asset_id: assetId, module_id: moduleId, course_id: courseId,
            current_position_seconds: Math.floor(v.currentTime), current_percentage: pct, is_playing: true,
          }),
        }).then(r => r.json()).then(d => {
          if (d.max_watched_percentage != null) setMaxWatchedPercentage(d.max_watched_percentage);
          if (d.max_watched_seconds != null) setMaxWatchedSeconds(d.max_watched_seconds);
          if (d.is_completed) { setIsCompleted(true); onComplete?.(); }
        }).catch(() => {});
      });
    }, 10000);
    return () => clearInterval(trackingInterval.current);
  }, [skipProgress, moduleId, assetId, courseId, onComplete]);

  // Apply playback rate when speed or video changes
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed, playbackUrl]);

  // Show seek-blocked toast (throttled to 2s)
  const showSeekBlockedToast = useCallback(() => {
    const now = Date.now();
    if (now - seekToastRef.current < 2000) return;
    seekToastRef.current = now;
    toast.error('Forward skipping is disabled for this module');
  }, []);

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));

    // Continuous seek enforcement: snap back if user jumps past max watched
    if (!skipProgress && !allowSeek && v.currentTime > maxWatchedSeconds + 0.75 && maxWatchedSeconds > 0) {
      v.currentTime = maxWatchedSeconds;
      showSeekBlockedToast();
      return;
    }

    const pct = v.duration ? (v.currentTime / v.duration) * 100 : 0;
    onProgress?.({ currentTime: v.currentTime, duration: v.duration, percentage: pct, maxWatchedPercentage });
  }, [onProgress, maxWatchedPercentage, allowSeek, skipProgress, maxWatchedSeconds, showSeekBlockedToast]);

  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (v) { setDuration(v.duration); onReady?.(v.duration); }
  }, [onReady]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); } else { v.pause(); setIsPlaying(false); }
    resetControlsTimer();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) { document.exitFullscreen(); setIsFullscreen(false); }
    else { containerRef.current.requestFullscreen(); setIsFullscreen(true); }
  };

  const changeSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('bs_video_speed', String(newSpeed));
    }
    if (videoRef.current) videoRef.current.playbackRate = newSpeed;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const targetTime = clickX * v.duration;

    if (skipProgress || allowSeek || targetTime <= maxWatchedSeconds) {
      v.currentTime = targetTime;
    } else {
      showSeekBlockedToast();
    }
  };

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimeout.current);
    controlsTimeout.current = window.setTimeout(() => { if (isPlaying) setShowControls(false); }, 3000);
  }, [isPlaying]);

  const handleResume = (fromStart: boolean) => {
    setShowResumePrompt(false);
    const v = videoRef.current;
    if (v) { v.currentTime = fromStart ? 0 : resumePosition; v.play(); setIsPlaying(true); }
  };

  // Keyboard shortcuts (with seek prevention)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const v = videoRef.current;
      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault(); togglePlay(); break;
        case 'm':
        case 'M':
          toggleMute(); break;
        case 'f':
        case 'F':
          toggleFullscreen(); break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          if (!v) return;
          if (skipProgress || allowSeek) {
            e.preventDefault();
            v.currentTime = Math.min(v.currentTime + 10, v.duration || 0);
          } else {
            e.preventDefault();
            e.stopPropagation();
            showSeekBlockedToast();
          }
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          if (!v) return;
          e.preventDefault();
          v.currentTime = Math.max(v.currentTime - 10, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (v) { v.volume = Math.min(1, v.volume + 0.1); setVolume(v.volume); }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (v) { v.volume = Math.max(0, v.volume - 0.1); setVolume(v.volume); }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlaying, allowSeek, skipProgress, showSeekBlockedToast]);

  // Auto-dismiss resume prompt
  useEffect(() => {
    if (!showResumePrompt) return;
    const t = setTimeout(() => handleResume(false), 8000);
    return () => clearTimeout(t);
  }, [showResumePrompt]);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const maxWatchedPct = duration > 0 ? (maxWatchedSeconds / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const completionThreshold = Math.max(1, Math.min(100, minWatchPercent));

  if (isLoading) return (
    <div className="aspect-video bg-black rounded-xl flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-10 w-10 text-primary animate-spin" />
      <p className="text-sm text-white/60">Loading video…</p>
    </div>
  );

  if (error) return (
    <div className="aspect-video bg-black rounded-xl flex flex-col items-center justify-center gap-3">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="text-sm text-white/80">{error}</p>
      <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
        <RotateCcw className="h-4 w-4 mr-1" /> Try Again
      </Button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative aspect-video bg-black rounded-xl overflow-hidden select-none group"
        onMouseMove={resetControlsTimer}
        onTouchStart={resetControlsTimer}
        onClick={togglePlay}
        onContextMenu={e => e.preventDefault()}
      >
        {playbackUrl && (
          <video
            ref={videoRef}
            src={playbackUrl}
            className="w-full h-full object-contain"
            playsInline
            autoPlay={autoPlay && !showResumePrompt}
            controlsList="nodownload noplaybackrate noremoteplayback"
            disablePictureInPicture
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onEnded={() => { setIsPlaying(false); onEnded?.(); }}
          />
        )}

        {/* Buffering spinner */}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="h-12 w-12 text-white animate-spin" />
          </div>
        )}

        {/* Center play button when paused */}
        {!isPlaying && !isBuffering && !showResumePrompt && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
              <Play className="h-8 w-8 text-primary-foreground ml-1" />
            </div>
          </div>
        )}

        {/* Watermark — configurable */}
        {showWatermark && (
          <div
            className={`absolute pointer-events-none select-none z-10 text-white font-bold ${positionClassMap[watermarkPosition]} ${sizeClassMap[watermarkSize]}`}
            style={{
              opacity: Math.max(5, Math.min(100, watermarkOpacity)) / 100,
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {watermarkText}
          </div>
        )}

        {/* Resume prompt */}
        {showResumePrompt && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20" onClick={e => e.stopPropagation()}>
            <div className="bg-card rounded-xl p-6 max-w-sm text-center space-y-4">
              <p className="text-sm font-medium">Continue where you left off?</p>
              <p className="text-xs text-muted-foreground">You watched up to {formatDuration(resumePosition)}</p>
              <div className="flex gap-3 justify-center">
                <Button size="sm" onClick={() => handleResume(false)} className="bg-primary hover:bg-primary/90">Resume from {formatDuration(resumePosition)}</Button>
                <Button size="sm" variant="outline" onClick={() => handleResume(true)}>Start Over</Button>
              </div>
            </div>
          </div>
        )}

        {/* Controls overlay */}
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity p-3 pt-8 ${showControls ? 'opacity-100' : 'opacity-0'}`} onClick={e => e.stopPropagation()}>
          {/* Progress bar */}
          <div ref={progressRef} className="w-full h-2 bg-white/20 rounded cursor-pointer mb-2 relative" onClick={handleProgressClick}>
            <div className="absolute inset-y-0 left-0 bg-white/15 rounded" style={{ width: `${bufferedPct}%` }} />
            {!skipProgress && !allowSeek && <div className="absolute inset-y-0 left-0 bg-primary/40 rounded" style={{ width: `${maxWatchedPct}%` }} />}
            <div className="absolute inset-y-0 left-0 bg-primary rounded" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="text-white hover:text-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <span className="text-xs text-white/80 font-mono min-w-[80px]">
              {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
            </span>
            <div className="flex-1" />
            <button onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'} className="text-white hover:text-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            {allowSpeedChange && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    aria-label="Playback speed"
                    className="text-white hover:text-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center gap-1 text-xs font-semibold"
                  >
                    <Gauge className="h-4 w-4" />
                    <span>{speed}x</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" className="w-28 p-1" align="end">
                  <div className="flex flex-col">
                    {SPEED_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={`text-left px-3 py-1.5 text-xs rounded hover:bg-secondary ${s === speed ? 'bg-secondary font-semibold text-primary' : ''}`}
                      >
                        {s === 1 ? 'Normal' : `${s}x`}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <button onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} className="text-white hover:text-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mark as Complete button (course mode only — never in preview/public) */}
      {!skipProgress && moduleId && (
        <div className="w-full">
          {isCompleted ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <span className="text-sm font-medium text-primary">✓ Module Complete!</span>
            </div>
          ) : (
            <Button
              disabled={maxWatchedPercentage < completionThreshold}
              onClick={() => { if (maxWatchedPercentage >= completionThreshold) onComplete?.(); }}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              {maxWatchedPercentage >= completionThreshold
                ? '✅ Mark as Complete'
                : `Watch ${completionThreshold}% to unlock — you're at ${Math.floor(maxWatchedPercentage)}%`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default BackupshalaVideoPlayer;
