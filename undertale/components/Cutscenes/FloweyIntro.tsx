import React, { useState, useEffect, useRef } from 'react';
import { Box } from '../UI/Box';
import { Typewriter } from '../UI/Typewriter';
import { FLOWEY_ASSETS, SOUL_HEART_SVG } from '../../constants';
import { playSound } from '../../utils/audio';

interface FloweyIntroProps {
  onComplete: () => void;
}

export const FloweyIntro: React.FC<FloweyIntroProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'APPEAR' | 'DIALOGUE' | 'BATTLE' | 'BETRAYAL' | 'RESCUE'>('APPEAR');
  const [dialogueIndex, setDialogueIndex] = useState(0);
  // Soul position relative to the Battle Box center (0,0 is center)
  const [soulPos, setSoulPos] = useState({ x: 0, y: 0 });
  const [hp, setHp] = useState(20);
  const [pellets, setPellets] = useState<{x: number, y: number, angle: number}[]>([]);
  const [flash, setFlash] = useState(false);
  const [showSoul, setShowSoul] = useState(false);
  const [boxVisible, setBoxVisible] = useState(false);

  // Script
  const introDialogue = [
    "Приветик!",
    "Я ФЛАУИ.",
    "ЦВЕТОЧЕК по имени ФЛАУИ!",
    "Хмм...",
    "Ты новенький в ПОДЗЕМЕЛЬЕ, да?",
    "Божечки, ты, должно быть, так запутан.",
    "Кто-то должен научить тебя, как тут всё устроено!",
    "Похоже, это придётся сделать мне.",
    "Я готов?"
  ];

  const battleDialogue = [
    "Видишь это сердце? Это твоя ДУША.",
    "Твоя ДУША поначалу слабая...",
    "Но ты можешь сделать её сильнее, если наберешь много УР.",
    "Что такое УР? Это Уровень Радости, конечно!",
    "Ты же хочешь немного Радости, правда?",
    "Не волнуйся, я поделюсь с тобой!",
    "Внизу любовь передаётся через...",
    "Маленькие белые...",
    "\"дружелюбные лепестки\".",
    "Ты готов?",
    "Двигайся! Лови их все!"
  ];

  const betrayalDialogue = [
     "ТЫ ИДИОТ.",
     "В этом мире...",
     "УБЕЙ или БУДЬ УБИТЫМ.",
     "Почему КТО-ТО должен упускать такую возможность?",
     "УМРИ."
  ];

  // Key handling
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'z' || e.key === 'Enter') {
            if (phase === 'DIALOGUE') {
                playSound('select');
                if (dialogueIndex < introDialogue.length - 1) {
                    setDialogueIndex(prev => prev + 1);
                } else {
                    setPhase('BATTLE');
                    setDialogueIndex(0);
                    setShowSoul(true);
                    setBoxVisible(true);
                }
            } else if (phase === 'BATTLE' && pellets.length === 0) {
                 playSound('select');
                 if (dialogueIndex < battleDialogue.length - 1) {
                     setDialogueIndex(prev => prev + 1);
                 } else {
                     // Spawn Pellets
                     spawnPellets();
                 }
            } else if (phase === 'BETRAYAL') {
                playSound('select');
                if (dialogueIndex < betrayalDialogue.length - 1) {
                    setDialogueIndex(prev => prev + 1);
                } else {
                    // Circle trap
                    startCircleTrap();
                }
            }
        }
    };

    // Soul Movement
    const moveSoul = (e: KeyboardEvent) => {
        if (!boxVisible) return;
        const SPEED = 4;
        const BOX_LIMIT = 60; // Box is roughly 140px wide, so limit is ~60 from center
        
        setSoulPos(prev => {
            let {x, y} = prev;
            if (e.key === 'ArrowUp') y -= SPEED;
            if (e.key === 'ArrowDown') y += SPEED;
            if (e.key === 'ArrowLeft') x -= SPEED;
            if (e.key === 'ArrowRight') x += SPEED;
            
            // Clamp
            x = Math.max(-BOX_LIMIT, Math.min(BOX_LIMIT, x));
            y = Math.max(-BOX_LIMIT, Math.min(BOX_LIMIT, y));
            
            return {x, y};
        });
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keydown', moveSoul);
    return () => {
        window.removeEventListener('keydown', handleKey);
        window.removeEventListener('keydown', moveSoul);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, dialogueIndex, pellets.length, boxVisible]);

  const spawnPellets = () => {
      const newPellets = [];
      // Arc above Flowey
      // Flowey center is roughly 320, 150
      // Arc radius ~80
      for(let i=0; i<5; i++) {
          const angle = Math.PI + (i * Math.PI / 4); // Arc above
          // Visual positions relative to Flowey
          newPellets.push({
              x: 0 + Math.cos(angle) * 60, // Relative to flowey center x
              y: -50 + Math.sin(angle) * 40, // Relative to flowey top
              angle: 0
          });
      }
      setPellets(newPellets);
  };

  const startCircleTrap = () => {
      const newPellets = [];
      for(let i=0; i<24; i++) {
          const angle = (i / 24) * Math.PI * 2;
          newPellets.push({
              x: Math.cos(angle) * 120, // Relative to Soul (center of box)
              y: Math.sin(angle) * 120,
              angle: 0 
          });
      }
      setPellets(newPellets);
      
      // Toriel rescue timer
      setTimeout(() => {
          setPellets([]);
          setFlash(true); 
          playSound('heal'); // Placeholder for fireball sound
          setTimeout(() => {
              setPhase('RESCUE');
              setTimeout(onComplete, 3000); 
          }, 1000);
      }, 4000);
  };

  // Game Loop for Pellets
  useEffect(() => {
      if (pellets.length === 0) return;

      const interval = setInterval(() => {
          setPellets(prev => {
              return prev.map(p => {
                 if (phase === 'BATTLE') {
                    // Move towards Soul (0,0 in box coordinate space)
                    // But first they are above Flowey.
                    // Let's translate visual coordinates.
                    // Flowey is at Screen Y=100. Box Center is at Screen Y=320.
                    // Diff Y = 220.
                    
                    // Simple logic: Move downwards/towards center
                    const speed = 1.5;
                    // Target is (0, 100) relative to start? 
                    // Let's just make them fall down.
                    return { ...p, y: p.y + speed, x: p.x * 0.99 };
                 } else {
                     // Circle closing in logic (Betrayal)
                     // These are relative to Soul center
                     const dist = Math.sqrt(p.x*p.x + p.y*p.y);
                     if (dist > 15) {
                         const angle = Math.atan2(p.y, p.x);
                         return { 
                             ...p,
                             x: p.x - Math.cos(angle) * 0.5, 
                             y: p.y - Math.sin(angle) * 0.5 
                         };
                     }
                     return p;
                 }
              });
          });

          // Collision
          // Soul is at soulPos (relative to box center)
          // Pellets in BATTLE are relative to Flowey Center? 
          // We need coordinate unification.
          // Let's assume pellet coordinates for collision:
          // BATTLE: P_Screen_Y = 150 + p.y. Box_Center_Screen_Y = 320.
          // Collision Y relative to box center = (150 + p.y) - 320 = p.y - 170.
          // P_Screen_X = 320 + p.x. Box_Center_Screen_X = 320.
          // Collision X relative to box center = p.x.
          
          // BETRAYAL: p coordinates are already relative to box center.

          let hit = false;
          const soulRadius = 6;
          
          pellets.forEach(p => {
              let px = p.x;
              let py = p.y;
              
              if (phase === 'BATTLE') {
                  py = p.y - 170; // Adjust offset as per above logic
              }

              const dx = px - soulPos.x;
              const dy = py - soulPos.y;
              if (Math.sqrt(dx*dx + dy*dy) < soulRadius + 4) {
                  hit = true;
              }
          });

          if (hit && hp > 1) {
              setHp(1);
              playSound('damage');
              setPellets([]);
              setPhase('BETRAYAL');
              setDialogueIndex(0);
          }
      }, 20);

      return () => clearInterval(interval);
  }, [pellets, soulPos, hp, phase]);


  if (phase === 'APPEAR') {
      setTimeout(() => setPhase('DIALOGUE'), 1000);
      return <div className="w-full h-full bg-black"></div>;
  }

  // --- RENDERING ---

  return (
    <div className="w-full h-full bg-black relative overflow-hidden flex flex-col items-center">
        {/* Flash Overlay */}
        {flash && <div className="absolute inset-0 bg-white z-50 animate-pulse duration-75"></div>}

        {/* --- TOP SECTION: FLOWEY --- */}
        {/* Z-Index raised to 30 to ensure pellets/bubble render above the Battle Box (Z-20) */}
        <div className="absolute top-[80px] w-full flex justify-center z-30">
            <div className="relative">
                {phase === 'BETRAYAL' ? FLOWEY_ASSETS.EVIL : FLOWEY_ASSETS.FRIENDLY}
                
                {/* Speech Bubble (Only when box is visible/battle mode) */}
                {/* Width increased, font size reduced to lg, leading tightened for better fit */}
                {boxVisible && pellets.length === 0 && phase !== 'BETRAYAL' && phase !== 'RESCUE' && (
                    <div className="absolute left-[100%] top-0 ml-4 bg-white text-black p-4 rounded-xl font-dialogue text-lg leading-none w-[200px] border-2 border-gray-400">
                        <div className="absolute top-6 -left-3 w-4 h-4 bg-white border-l-2 border-b-2 border-gray-400 transform rotate-45"></div>
                        <Typewriter text={battleDialogue[dialogueIndex]} speed={30} onComplete={() => {}} />
                    </div>
                )}
                 {/* Betrayal Speech Bubble */}
                 {phase === 'BETRAYAL' && pellets.length === 0 && (
                    <div className="absolute left-[100%] top-0 ml-4 bg-white text-black p-4 rounded-xl font-dialogue text-lg leading-none w-[200px] border-2 border-gray-400">
                        <div className="absolute top-6 -left-3 w-4 h-4 bg-white border-l-2 border-b-2 border-gray-400 transform rotate-45"></div>
                        <Typewriter text={betrayalDialogue[dialogueIndex]} speed={50} />
                    </div>
                )}

                {/* Pellets Rendering (Battle Phase - Arc) */}
                {phase === 'BATTLE' && pellets.map((p, i) => (
                    <div key={i} className="absolute w-3 h-3 bg-white rounded-full animate-spin" 
                         style={{ left: 50 + p.x - 6, top: 50 + p.y - 6 }}></div> // 50 is half flowey width roughly
                ))}
            </div>
        </div>

        {/* --- BOTTOM SECTION: DIALOGUE BOX (PRE-BATTLE) --- */}
        {!boxVisible && phase !== 'RESCUE' && (
             <div className="absolute bottom-4 left-10 right-10 h-[150px]">
                 <Box>
                    <div className="p-4 font-dialogue text-3xl">
                        <div className="flex items-start">
                             <span className="mr-4">*</span>
                             <Typewriter text={introDialogue[dialogueIndex]} key={dialogueIndex} onComplete={() => {}} />
                        </div>
                        <div className="absolute bottom-2 right-4 text-sm animate-bounce text-yellow-500">[Z]</div>
                    </div>
                 </Box>
             </div>
        )}

        {/* --- MIDDLE SECTION: BATTLE BOX --- */}
        {boxVisible && (
            <div className="absolute top-[280px] w-[140px] h-[140px] border-4 border-white bg-black z-20 overflow-hidden">
                {/* Soul */}
                {showSoul && (
                    <div 
                        className="absolute w-4 h-4 text-red-600" 
                        style={{ 
                            left: 70 + soulPos.x - 8, // Center (70) + offset - halfWidth
                            top: 70 + soulPos.y - 8 
                        }}
                    >
                        {SOUL_HEART_SVG}
                    </div>
                )}
                
                {/* Pellets Rendering (Betrayal Phase - Ring inside box) */}
                {phase === 'BETRAYAL' && pellets.map((p, i) => (
                    <div key={i} className="absolute w-3 h-3 bg-white rounded-full" 
                         style={{ left: 70 + p.x - 6, top: 70 + p.y - 6 }}></div>
                ))}
            </div>
        )}

        {/* --- HUD --- */}
        {boxVisible && (
            <div className="absolute bottom-[20px] w-full flex justify-center font-8bit text-white text-xl gap-8 z-20">
                 <span>Фриск</span>
                 <span>LV 1</span>
                 <div className="flex items-center gap-2">
                     <span className="text-sm">HP</span>
                     <div className="w-[100px] h-[20px] bg-red-600">
                         <div className="h-full bg-yellow-400" style={{ width: `${(hp/20)*100}%` }}></div>
                     </div>
                     <span>{hp} / 20</span>
                 </div>
            </div>
        )}
    </div>
  );
};