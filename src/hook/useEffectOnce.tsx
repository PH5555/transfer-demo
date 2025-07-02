import { useEffect, useRef } from "react";

export function useEffectOnce(effect: any) {
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    const cleanup = effect();
    return cleanup;
  }, []);
}