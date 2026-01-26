"use client"
import { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, RotateCw, Volume2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Slider } from "../../ui/slider";


interface AudioPlayerProps {
  content: string;
}

const AudioPlayer = ({ content }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textRef = useRef<string>("");

  // Strip HTML and get plain text
  const getPlainText = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  useEffect(() => {
    textRef.current = getPlainText(content);
    // Estimate duration based on average reading speed (150 words per minute)
    const wordCount = textRef.current.split(/\s+/).length;
    setDuration((wordCount / 150) * 60);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [content]);

  const togglePlay = () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        const utterance = new SpeechSynthesisUtterance(textRef.current);
        utterance.rate = playbackRate;
        utterance.onend = () => setIsPlaying(false);
        utterance.onpause = () => setIsPlaying(false);
        utterance.onresume = () => setIsPlaying(true);
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }
      setIsPlaying(true);
    }
  };

  const skipForward = () => {
    setCurrentTime((prev) => Math.min(prev + 10, duration));
  };

  const skipBackward = () => {
    setCurrentTime((prev) => Math.max(prev - 10, 0));
  };

  const changePlaybackRate = () => {
    const rates = [0.5, 1, 1.5, 2, 2.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    
    if (utteranceRef.current) {
      const wasPlaying = isPlaying;
      window.speechSynthesis.cancel();
      if (wasPlaying) {
        const utterance = new SpeechSynthesisUtterance(textRef.current);
        utterance.rate = nextRate;
        utterance.onend = () => setIsPlaying(false);
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-secondary/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Volume2 className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium">Listen to this article</span>
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={skipBackward}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        
        <Button
          variant="default"
          size="icon"
          className="h-10 w-10 rounded-full bg-accent hover:bg-accent/90"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={skipForward}
        >
          <RotateCw className="w-4 h-4" />
        </Button>

        <div className="flex-1 mx-2">
          <Slider
            value={[currentTime]}
            max={duration}
            step={1}
            className="cursor-pointer"
            onValueChange={(value) => setCurrentTime(value[0])}
          />
        </div>

        <span className="text-xs text-muted-foreground min-w-[60px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs font-medium"
          onClick={changePlaybackRate}
        >
          {playbackRate}x
        </Button>
      </div>
    </div>
  );
};

export default AudioPlayer;
