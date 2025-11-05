import { useEffect, useState } from 'react';

interface AnimatedCharactersProps {
  isPasswordFocused: boolean;
}

export default function AnimatedCharacters({ isPasswordFocused }: AnimatedCharactersProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Calcular la rotación de los ojos basada en la posición del mouse
  const calculateEyePosition = (elementId: string) => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    
    const element = document.getElementById(elementId);
    if (!element) return { x: 0, y: 0 };

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = mousePosition.x - centerX;
    const deltaY = mousePosition.y - centerY;

    const angle = Math.atan2(deltaY, deltaX);
    const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY) / 50, 8);

    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance
    };
  };

  const eye1 = calculateEyePosition('character-1');
  const eye2 = calculateEyePosition('character-2');
  const eye3 = calculateEyePosition('character-3');

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center overflow-hidden">
      {/* Montañas de fondo */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1200 400" className="w-full">
          <path
            d="M0,300 L200,150 L400,250 L600,100 L800,200 L1000,150 L1200,250 L1200,400 L0,400 Z"
            fill="rgba(255,255,255,0.1)"
          />
          <path
            d="M0,350 L150,250 L350,300 L550,200 L750,280 L950,240 L1200,300 L1200,400 L0,400 Z"
            fill="rgba(255,255,255,0.15)"
          />
        </svg>
      </div>

      {/* Personajes */}
      <div className="relative z-10 flex gap-12 items-end">
        {/* Personaje 1 - Montaña */}
        <div id="character-1" className="relative">
          <svg width="150" height="180" viewBox="0 0 150 180" className="drop-shadow-2xl">
            {/* Cuerpo - Montaña */}
            <path
              d="M75,20 L130,140 L20,140 Z"
              fill="#60a5fa"
              stroke="#3b82f6"
              strokeWidth="3"
            />
            
            {/* Boca sonriente */}
            <path
              d="M55,100 Q75,115 95,100"
              fill="none"
              stroke="#1e40af"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Ojos */}
            <g className="transition-all duration-200">
              {isPasswordFocused ? (
                // Ojos cerrados
                <>
                  <line x1="55" y1="70" x2="70" y2="70" stroke="#1e40af" strokeWidth="4" strokeLinecap="round" />
                  <line x1="80" y1="70" x2="95" y2="70" stroke="#1e40af" strokeWidth="4" strokeLinecap="round" />
                </>
              ) : (
                // Ojos abiertos que siguen el mouse
                <>
                  <circle cx="62" cy="70" r="12" fill="white" />
                  <circle 
                    cx={62 + eye1.x} 
                    cy={70 + eye1.y} 
                    r="6" 
                    fill="#1e40af"
                    className="transition-all duration-100"
                  />
                  
                  <circle cx="88" cy="70" r="12" fill="white" />
                  <circle 
                    cx={88 + eye1.x} 
                    cy={70 + eye1.y} 
                    r="6" 
                    fill="#1e40af"
                    className="transition-all duration-100"
                  />
                </>
              )}
            </g>
          </svg>
        </div>

        {/* Personaje 2 - Figura redonda */}
        <div id="character-2" className="relative">
          <svg width="140" height="160" viewBox="0 0 140 160" className="drop-shadow-2xl">
            {/* Cuerpo - Círculo */}
            <circle cx="70" cy="90" r="60" fill="#34d399" stroke="#10b981" strokeWidth="3" />
            
            {/* Boca sonriente */}
            <path
              d="M50,100 Q70,115 90,100"
              fill="none"
              stroke="#065f46"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Ojos */}
            <g className="transition-all duration-200">
              {isPasswordFocused ? (
                // Ojos cerrados
                <>
                  <line x1="50" y1="75" x2="65" y2="75" stroke="#065f46" strokeWidth="4" strokeLinecap="round" />
                  <line x1="75" y1="75" x2="90" y2="75" stroke="#065f46" strokeWidth="4" strokeLinecap="round" />
                </>
              ) : (
                // Ojos abiertos
                <>
                  <circle cx="57" cy="75" r="10" fill="white" />
                  <circle 
                    cx={57 + eye2.x} 
                    cy={75 + eye2.y} 
                    r="5" 
                    fill="#065f46"
                    className="transition-all duration-100"
                  />
                  
                  <circle cx="83" cy="75" r="10" fill="white" />
                  <circle 
                    cx={83 + eye2.x} 
                    cy={75 + eye2.y} 
                    r="5" 
                    fill="#065f46"
                    className="transition-all duration-100"
                  />
                </>
              )}
            </g>
          </svg>
        </div>

        {/* Personaje 3 - Nube */}
        <div id="character-3" className="relative">
          <svg width="160" height="140" viewBox="0 0 160 140" className="drop-shadow-2xl">
            {/* Cuerpo - Nube */}
            <path
              d="M40,80 Q40,60 60,60 Q70,45 90,45 Q110,45 120,60 Q140,60 140,80 Q140,100 120,100 L60,100 Q40,100 40,80 Z"
              fill="#f59e0b"
              stroke="#d97706"
              strokeWidth="3"
            />
            
            {/* Boca sonriente */}
            <path
              d="M65,85 Q90,100 115,85"
              fill="none"
              stroke="#92400e"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Ojos */}
            <g className="transition-all duration-200">
              {isPasswordFocused ? (
                // Ojos cerrados
                <>
                  <line x1="65" y1="70" x2="80" y2="70" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
                  <line x1="100" y1="70" x2="115" y2="70" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
                </>
              ) : (
                // Ojos abiertos
                <>
                  <circle cx="72" cy="70" r="11" fill="white" />
                  <circle 
                    cx={72 + eye3.x} 
                    cy={70 + eye3.y} 
                    r="5" 
                    fill="#92400e"
                    className="transition-all duration-100"
                  />
                  
                  <circle cx="108" cy="70" r="11" fill="white" />
                  <circle 
                    cx={108 + eye3.x} 
                    cy={70 + eye3.y} 
                    r="5" 
                    fill="#92400e"
                    className="transition-all duration-100"
                  />
                </>
              )}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
