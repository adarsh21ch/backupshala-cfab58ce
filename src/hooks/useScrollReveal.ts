import { useEffect, useRef } from 'react';

/**
 * Adds `in-view` class to the element when it enters the viewport.
 * Pair with the `.reveal` utility in index.css for a fade-up effect.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = { threshold: 0.12, rootMargin: '0px 0px -10% 0px' },
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          obs.unobserve(entry.target);
        }
      });
    }, options);

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return ref;
}
