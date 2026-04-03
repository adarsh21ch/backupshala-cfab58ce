import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, CheckCircle } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface VideoPlayerProps {
  videoId: string;
  moduleId?: string;
  courseId?: string;
  isPublic?: boolean;
  allowSeeking?: boolean;
  allowSpeedControl?: boolean;
  onComplete?: () => void;
}

const VideoPlayer = ({ videoId, moduleId, courseId, isPublic = false, allowSeeking = false, allowSpeedControl = false, onComplete }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [watchPercentage, setWatchPercentage] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompleteBanner, setShowCompleteBanner] = useState(false);
  const [resumePosition, setResumePosition] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [signedUrl, setSignedUrl] = useState('');
  const progressIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const maxWatchedRef = useRef(0);

  // Fetch signed URL
  useEffect(() => {
    const fetchUrl = async () => {
      setLoading(true);
      setError('');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isPublic && !session) {
          setError('Please log in to watch this video');
          setLoading(false);
          return;
        }

        const { data, error: fnError } = await supabase.functions.invoke('get-video-stream-url', {
          body: { video_id: videoId, module_id: moduleId, course_id: courseId, is_public: isPublic },
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        setSignedUrl(data.signed_url);
        setDuration(data.duration_seconds || 0);

        // Get resume position
        if (moduleId && session) {
          const { data: progress } = await supabase
            .from('video_watch_progress')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('module_id', moduleId)
            .maybeSingle();
          
          if (progress) {
            setWatchPercentage(progress.watch_percentage || 0);
            setIsCompleted(progress.is_completed || false);
            maxWatchedRef.current = progress.watch_percentage || 0;
            if (progress.last_position_seconds > 0 && !progress.is_completed) {
              setResumePosition(progress.last_position_seconds);
              setShowResumePrompt(true);
            }
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load video');
      }
      setLoading(false);
    };
    fetchUrl();
  }, [videoId, moduleId, courseId, isPublic]);

  // Load video when URL ready
  useEffect(() => {
    if (!signedUrl || !videoRef.current) return;
    const video = videoRef.current;
    
    // Check if HLS
    if (signedUrl.includes('.m3u8')) {
      // For HLS, try native support first
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = signedUrl;
      } else {
        // Fallback: use the URL directly, most modern browsers handle it
        video.src = signedUrl;
      }
    } else {
      video.src = signedUrl;
    }
    video.load();
  }, [signedUrl]);

  // Progress tracking interval
  useEffect(() => {
    if (!playing || isPublic || !moduleId || !courseId) return;

    progressIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || !video.duration) return;

      const pct = Math.round((video.currentTime / video.duration) * 100);
      const newMax = Math.max(maxWatchedRef.current, pct);
      maxWatchedRef.current = newMax;
      setWatchPercentage(newMax);

      try {
        const { data } = await supabase.functions.invoke('update-watch-progress', {
          body: {
            video_id: videoId,
            module_id: moduleId,
            course_id: courseId,
            current_position_seconds: Math.floor(video.currentTime),
            watch_percentage: newMax,
          },
        });
        if (data?.is_completed && !isCompleted) {
          setIsCompleted(true);
          setShowCompleteBanner(true);
        }
      } catch {}
    }, 10000);

    return () => clearInterval(progressIntervalRef.current);
  }, [playing, isPublic, moduleId, courseId, videoId, isCompleted]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setDuration(video.duration || 0);
  };

  const handleVolumeChange = (value: number[]) => {
    const vol = value[0];
    setVolume(vol);
    setMuted(vol === 0);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const handleResume = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = resumePosition;
      videoRef.current.play();
      setPlaying(true);
    }
    setShowResumePrompt(false);
  };

  const handleStartOver = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setPlaying(true);
    }
    setShowResumePrompt(false);
  };

  const handleMarkComplete = async () => {
    if (watchPercentage < 80 && !isCompleted) {
      toast.error('Watch at least 80% of the video to mark it complete');
      return;
    }
    try {
      await supabase.functions.invoke('update-watch-progress', {
        body: {
          video_id: videoId,
          module_id: moduleId,
          course_id: courseId,
          current_position_seconds: Math.floor(videoRef.current?.currentTime || 0),
          watch_percentage: Math.max(maxWatchedRef.current, watchPercentage),
        },
      });
      setIsCompleted(true);
      onComplete?.();
      toast.success('Module marked as complete!');
    } catch {
      toast.error('Failed to mark complete');
    }
  };

  // Block keyboard shortcuts for seeking
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!allowSeeking && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      return;
    }
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
    if (e.key === 'm') { e.preventDefault(); toggleMute(); }
    if (e.key === 'f') { e.preventDefault(); toggleFullscreen(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); handleVolumeChange([Math.min(1, volume + 0.1)]); }
    if (e.key === 'ArrowDown') { e.preventDefault(); handleVolumeChange([Math.max(0, volume - 0.1)]); }
  }, [allowSeeking, volume]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <Skeleton className="w-full aspect-video rounded-xl" />;
  }

  if (error) {
    return (
      <div className="w-full aspect-video rounded-xl bg-secondary flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-destructive font-medium">Video unavailable</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">Please try again or contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        onContextMenu={e => e.preventDefault()}
      >
        <video
          ref={videoRef}
          className="w-full h-full"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onEnded={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          playsInline
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
        />

        {/* Watermark for public */}
        {isPublic && (
          <div className="absolute bottom-12 right-4 text-white/30 text-sm font-heading font-bold pointer-events-none select-none">
            Backupshala
          </div>
        )}

        {/* Resume prompt */}
        {showResumePrompt && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
            <div className="bg-card rounded-xl p-6 space-y-4 max-w-sm">
              <p className="text-sm font-medium">Resume from {formatTime(resumePosition)}?</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleResume} className="bg-primary hover:bg-primary/90">Resume</Button>
                <Button size="sm" variant="outline" onClick={handleStartOver}>Start Over</Button>
              </div>
            </div>
          </div>
        )}

        {/* Controls overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Progress bar */}
          <div className="w-full h-1 bg-white/20 rounded-full mb-2">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <span className="text-white text-xs font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white hover:text-primary transition-colors">
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <Slider
                value={[muted ? 0 : volume]}
                max={1}
                step={0.05}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
              <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors">
                {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Watch progress + complete banner (only for enrolled modules) */}
      {moduleId && !isPublic && (
        <div className="space-y-2">
          {showCompleteBanner && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg p-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">You've watched enough to mark this complete!</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-32 h-1.5 bg-secondary rounded-full">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(watchPercentage, 100)}%` }} />
              </div>
              <span>{Math.round(watchPercentage)}% watched</span>
            </div>
            <Button
              size="sm"
              onClick={handleMarkComplete}
              disabled={isCompleted || watchPercentage < 80}
              className={`text-xs ${isCompleted ? 'bg-primary/20 text-primary' : ''}`}
              title={watchPercentage < 80 ? 'Watch at least 80% of the video to mark it complete' : ''}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {isCompleted ? 'Completed' : 'Mark Complete'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
