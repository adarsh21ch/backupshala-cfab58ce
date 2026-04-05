import { useRef, useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioNotePlayerProps {
  label: string;
  audioUrl: string;
  duration: number;
  creatorName?: string;
  position: 'before' | 'after';
  onFinished?: () => void;
}

const AudioNotePlayer = ({ label, audioUrl, duration, creatorName, position, onFinished }: AudioNotePlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [canSkip, setCanSkip] = useState(position === 'after');

  useEffect(() => {
    if (position === 'before') {
      const timer = setTimeout(() => setCanSkip(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [position]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCanSkip(true);
    onFinished?.();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="rounded-xl border border-accent/20 bg-gradient-to-r from-card to-accent/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🎙️</span>
        <span className="text-sm font-semibold">{label}</span>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>
        <div className="flex-1 space-y-1">
          <input
            type="range"
            min={0}
            max={audioDuration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full accent-accent h-1"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(audioDuration)}</span>
          </div>
        </div>
      </div>

      {creatorName && (
        <p className="text-xs text-muted-foreground">From {creatorName}</p>
      )}

      {position === 'before' && (
        <p className="text-[11px] text-muted-foreground">
          {canSkip ? 'You can now proceed to the video' : 'Listen to this before watching the video'}
        </p>
      )}
    </div>
  );
};

export default AudioNotePlayer;
