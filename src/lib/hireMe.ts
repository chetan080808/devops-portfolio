/** `sudo hire-me` easter egg: the terminal fires it, the Contact section's whale layer plays it. */
const listeners = new Set<() => void>();

export const hireMe = {
  trigger() {
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
};
