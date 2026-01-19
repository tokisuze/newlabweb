import React, { useState, useEffect, useRef } from 'react';

interface TypewriterProps {
  text: string;
  speed?: number; // ms per char
  onComplete?: () => void;
  className?: string;
}

export const Typewriter: React.FC<TypewriterProps> = ({ text, speed = 30, onComplete, className }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    indexRef.current = 0;
    
    if (timerRef.current) clearInterval(timerRef.current);

    // Skip empty text
    if (!text) return;

    timerRef.current = window.setInterval(() => {
      setDisplayedText((prev) => {
        const nextChar = text.charAt(indexRef.current);
        if (indexRef.current >= text.length - 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsComplete(true);
            if (onComplete) onComplete();
            return text;
        }
        indexRef.current++;
        return prev + nextChar;
      });
    }, speed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Allow clicking to skip
  const skip = () => {
     if (isComplete) return;
     if (timerRef.current) clearInterval(timerRef.current);
     setDisplayedText(text);
     setIsComplete(true);
     if (onComplete) onComplete();
  };

  return (
    <div className={`font-dialogue text-3xl leading-none tracking-widest ${className}`} onClick={skip}>
      {displayedText}
      {!isComplete && <span className="animate-pulse">_</span>}
    </div>
  );
};