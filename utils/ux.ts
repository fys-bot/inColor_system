
/**
 * @file UX Interaction Utility (utils/ux.ts)
 * @description Centralised control for Haptics, Audio, and Interaction styles.
 * Implements the "World-Class Experience" standards for feedback.
 */

// Haptic patterns for different interaction weights
type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection';

export const triggerHaptic = (type: HapticType = 'light') => {
  // Guard clause for server-side rendering or unsupported environments
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(10); // Crisp click
        break;
      case 'medium':
        navigator.vibrate(20); // Soft bump
        break;
      case 'heavy':
        navigator.vibrate(40); // Hard impact
        break;
      case 'success':
        navigator.vibrate([10, 30, 20]); // Da-da-dum
        break;
      case 'error':
        navigator.vibrate([50, 30, 50]); // Buzz-buzz
        break;
      case 'selection':
        navigator.vibrate(5); // Very subtle tick for scrolling/sliders
        break;
    }
  } catch (e) {
    // Ignore haptic errors on unsupported devices
  }
};

/**
 * Standard classes for interactive elements to ensure consistent "Game Feel".
 * - transform: Enables GPU acceleration
 * - active:scale-95: The "Press" feel
 * - transition-all: Smooth morphing
 */
export const btnClickable = "transform transition-all duration-200 active:scale-95 ease-out cursor-pointer select-none";
export const cardHover = "transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10";
