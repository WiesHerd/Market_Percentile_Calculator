import { Transition } from '@headlessui/react';

// Constants for consistent styling
const STYLES = {
  overlay: {
    base: "absolute inset-0 bg-white/90 backdrop-blur-[2px] z-50",
    transition: "transition-all duration-500"
  },
  inline: {
    base: "min-h-[200px]",
    transition: "transition-all duration-500"
  }
} as const;

interface LoadingScreenProps {
  containerClassName?: string;
  message?: string;
  isOverlay?: boolean;
}

export function LoadingScreen({ 
  containerClassName = "",
  message = "Loading...",
  isOverlay = false
}: LoadingScreenProps) {
  const baseClasses = "flex items-center justify-center";
  const modeClasses = isOverlay ? STYLES.overlay.base : STYLES.inline.base;
  const combinedClasses = `${baseClasses} ${modeClasses} ${containerClassName}`.trim();

  return (
    <Transition
      show={true}
      enter="transition-all duration-500 ease-in-out"
      enterFrom="opacity-0 scale-95"
      enterTo="opacity-100 scale-100"
      leave="transition-all duration-300 ease-in-out"
      leaveFrom="opacity-100 scale-100"
      leaveTo="opacity-0 scale-95"
    >
      <div className={combinedClasses}>
        <div className="flex flex-col items-center">
          {message && (
            <p className="text-sm font-medium text-gray-600">{message}</p>
          )}
        </div>
      </div>
    </Transition>
  );
} 