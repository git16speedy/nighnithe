import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RealTimeClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  const formattedTime = format(currentTime, 'HH:mm:ss', { locale: ptBR });

  return (
    <div className="flex items-center justify-center px-3 py-1 bg-black rounded-md shadow-lg">
      <span className="font-mono text-2xl font-bold text-red-500">
        {formattedTime}
      </span>
    </div>
  );
}