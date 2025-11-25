/**
 * A simple debounce function.
 * @param func The function to debounce.
 * @param delay The debounce delay in milliseconds.
 * @returns A debounced version of the function.
 */
export function debounce<F extends (...args: any[]) => any>(func: F, delay: number): (...args: Parameters<F>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}
