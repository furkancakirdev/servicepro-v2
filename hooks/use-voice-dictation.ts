"use client";

import { useEffect, useRef, useState } from "react";

type SpeechRecognitionResultLike = {
  0?: {
    transcript?: string;
  };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function useVoiceDictation({
  lang = "tr-TR",
  onTranscript,
}: {
  lang?: string;
  onTranscript: (transcript: string) => void;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptBaseRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;

    if (!Recognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result?.[0]?.transcript ?? "")
        .join(" ")
        .trim();

      const combinedTranscript = [transcriptBaseRef.current, transcript]
        .filter(Boolean)
        .join(" ")
        .trim();

      onTranscriptRef.current(combinedTranscript);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.onerror = (event) => {
      if (event.error && event.error !== "no-speech") {
        setError("Sesli dikte baslatilamadi.");
      }

      setIsListening(false);
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [lang]);

  function start(baseText: string) {
    if (!recognitionRef.current) {
      setError("Tarayici ses tanima ozelligini desteklemiyor.");
      return false;
    }

    transcriptBaseRef.current = baseText.trim();
    setError(null);

    try {
      recognitionRef.current.lang = lang;
      recognitionRef.current.start();
      setIsListening(true);
      return true;
    } catch {
      setError("Mikrofon baslatilamadi.");
      setIsListening(false);
      return false;
    }
  }

  function stop() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  return {
    isSupported,
    isListening,
    error,
    start,
    stop,
  };
}
