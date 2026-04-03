import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDuration } from '@/lib/videoTypes';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BackupshalaVideoPlayerProps {
  assetId?: string;
  bsvCode?: string;
  moduleId?: string;
  courseId?: string;
  isPublicWatch?: boolean;
  onProgress?: (data: { currentTime: number; duration: number; percentage: number; maxWatchedPercentage: number }) => void;
  onComplete?: () => void;
  onReady?: (duration: number) => void;
  autoPlay?: boolean;
}

const BackupshalaVideoPlayer = ({
  assetId, bsvCode, moduleId, courseId, isPublicWatch = false,
  onProgress, onComplete, onReady, autoPlay = false,
}: BackupshalaVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const controlsTimeout = useRef<number>();
  const trackingInterval = useRef<number>();

  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

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
  const [videoTitle, setVideoTitle] = useState('');

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
          body: JSON.stringify({ asset_id: assetId, bsv_code: bsvCode, module_id: moduleId, course_id: courseId, is_public_watch: isPublicWatch }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setPlaybackUrl(data.playback_url);
        setVideoTitle(data.title || '');
        if (data.duration_seconds) setDuration(data.duration_seconds);
      } catch (err: any) {
        setError(err.message || 'Failed to load video');
      }
      setIsLoading(false);
    };
    fetchUrl();
  }, [assetId, bsvCode, moduleId, courseId, isPublicWatch]);

  // Fetch existing watch progress for resume
  useEffect(() => {
    if (isPublicWatch || !moduleId) return;
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
  }, [moduleId, isPublicWatch]);

  // Progress tracking interval (every 10s)
  useEffect(() => {
    if (isPublicWatch || !moduleId || !assetId) return;
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
  }, [isPublicWatch, moduleId, assetId, courseId, onComplete]);

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
    const pct = v.duration ? (v.currentTime / v.duration) * 100 : 0;
    onProgress?.({ currentTime: v.currentTime, duration: v.duration, percentage: pct, maxWatchedPercentage });
  }, [onProgress, maxWatchedPercentage]);

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

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const targetTime = clickX * v.duration;

    if (isPublicWatch || targetTime <= maxWatchedSeconds) {
      v.currentTime = targetTime;
    } else {
      toast.error("Watch ahead to unlock — you can rewatch but not skip forward");
    }
  };

  const resetControlsTimer = () => {
    setShowControls(true);
    clearTimeout(controlsTimeout.current);
    controlsTimeout.current = window.setTimeout(() => { if (isPlaying) setShowControls(false); }, 3000);
  };

  const handleResume = (fromStart: boolean) => {
    setShowResumePrompt(false);
    const v = videoRef.current;
    if (v) { v.currentTime = fromStart ? 0 : resumePosition; v.play(); setIsPlaying(true); }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case ' ': e.preventDefault(); togglePlay(); break;
        case 'm': case 'M': toggleMute(); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 'ArrowUp': e.preventDefault(); if (videoRef.current) { videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1); setVolume(videoRef.current.volume); } break;
        case 'ArrowDown': e.preventDefault(); if (videoRef.current) { videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1); setVolume(videoRef.current.volume); } break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlaying]);

  // Auto-dismiss resume prompt
  useEffect(() => {
    if (!showResumePrompt) return;
    const t = setTimeout(() => handleResume(false), 8000);
    return () => clearTimeout(t);
  }, [showResumePrompt]);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const maxWatchedPct = duration > 0 ? (maxWatchedSeconds / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

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
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onEnded={() => setIsPlaying(false)}
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
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center cursor-pointer">
              <Play className="h-8 w-8 text-white ml-1" />
            </div>
          </div>
        )}

        {/* Watermark */}
        <div className="absolute bottom-[60px] right-3 opacity-40 pointer-events-none select-none z-10 text-white text-[13px] font-bold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Backupshala
        </div>

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
            {!isPublicWatch && <div className="absolute inset-y-0 left-0 bg-primary/40 rounded" style={{ width: `${maxWatchedPct}%` }} />}
            <div className="absolute inset-y-0 left-0 bg-primary rounded" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <span className="text-xs text-white/80 font-mono min-w-[80px]">
              {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
            </span>
            <div className="flex-1" />
            <button onClick={toggleMute} className="text-white hover:text-primary transition-colors">
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors">
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mark as Complete button (course mode only) */}
      {!isPublicWatch && moduleId && (
        <div className="w-full">
          {isCompleted ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <span className="text-sm font-medium text-primary">✓ Module Complete!</span>
            </div>
          ) : (
            <Button
              disabled={maxWatchedPercentage < 80}
              onClick={() => { if (maxWatchedPercentage >= 80) onComplete?.(); }}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              {maxWatchedPercentage >= 80
                ? '✅ Mark as Complete'
                : `Watch ${80}% to unlock — you're at ${Math.floor(maxWatchedPercentage)}%`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default BackupshalaVideoPlayer;
