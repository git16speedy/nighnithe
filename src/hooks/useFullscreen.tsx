import { useState, useCallback, useLayoutEffect } from 'react';

export function useFullscreen(element: React.RefObject<HTMLElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(() => {
    const el = element.current;
    if (!el) return;

    if (el.requestFullscreen) {
      el.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else if ((el as any).mozRequestFullScreen) { /* Firefox */
      (el as any).mozRequestFullScreen();
    } else if ((el as any).webkitRequestFullscreen) { /* Chrome, Safari & Opera */
      (el as any).webkitRequestFullscreen();
    } else if ((el as any).msRequestFullscreen) { /* IE/Edge */
      (el as any).msRequestFullscreen();
    }
  }, [element]);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).mozCancelFullScreen) { /* Firefox */
      (document as any).mozCancelFullScreen();
    } else if ((document as any).webkitExitFullscreen) { /* Chrome, Safari and Opera */
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) { /* IE/Edge */
      (document as any).msExitFullscreen();
    }
  }, []);

  useLayoutEffect(() => {
    const onFullscreenChange = () => {
      const isCurrentlyFullscreen = document.fullscreenElement != null;
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('msfullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('msfullscreenchange', onFullscreenChange);
    };
  }, []);

  return { isFullscreen, enterFullscreen, exitFullscreen };
}
