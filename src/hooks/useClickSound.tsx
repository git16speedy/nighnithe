import { useCallback } from 'react';

// Função para tocar o som de clique
const playClickSound = () => {
  try {
    const audio = new Audio('/click.mp3');
    audio.volume = 0.5; // Volume um pouco mais baixo para não ser intrusivo
    audio.play().catch(e => console.warn("Audio playback failed:", e));
  } catch (e) {
    console.error("Error playing click sound:", e);
  }
};

export function useClickSound() {
  const playClick = useCallback(() => {
    playClickSound();
  }, []);

  return { playClick };
}