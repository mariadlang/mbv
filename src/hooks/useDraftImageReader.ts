"use client";

import { useEffect, useRef, useState } from "react";

/** A file belongs to the current editor, never to a later draft or unmounted view. */
export function useDraftImageReader() {
  const active = useRef<FileReader | null>(null);
  const [reading, setReading] = useState(false);
  useEffect(() => () => { const reader = active.current; active.current = null; reader?.abort(); }, []);
  const cancel = () => { const reader = active.current; active.current = null; reader?.abort(); setReading(false); };
  const read = (file: File, onReady: (value: string) => void, onError: () => void) => {
    cancel();
    const reader = new FileReader();
    active.current = reader;
    setReading(true);
    reader.onload = () => { if (active.current !== reader) return; active.current = null; setReading(false); onReady(String(reader.result)); };
    reader.onerror = () => { if (active.current !== reader) return; active.current = null; setReading(false); onError(); };
    reader.readAsDataURL(file);
  };
  return { reading, read, cancel };
}
