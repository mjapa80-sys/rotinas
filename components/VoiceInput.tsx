"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any;

export default function VoiceInput({ onTranscript, className = "" }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(
    () => typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );
  const recognitionRef = useRef<AnyRecognition>(null);

  const start = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.webkitSpeechRecognition ?? w.SpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "ja-JP";
    recognition.continuous = false;
    recognition.interimResults = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results as ArrayLike<SpeechRecognitionResult>)
        .map((r) => r[0].transcript)
        .join("");
      onTranscript(transcript);
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [onTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
        listening
          ? "bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse"
          : "bg-gray-100 text-gray-500 hover:bg-primary-100 hover:text-primary-600"
      } ${className}`}
      title={listening ? "タップして停止" : "音声入力"}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
}
