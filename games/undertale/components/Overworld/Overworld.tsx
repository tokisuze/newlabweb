import React, { useState, useEffect, useRef } from 'react';
import { PlayerSprite } from './PlayerSprite';
import { Direction, Position, Rect } from '../../types';
import { ROOMS } from '../../constants';
import { Box } from '../UI/Box';
import { Typewriter } from '../UI/Typewriter';
import { playSound } from '../../utils/audio';

interface OverworldProps {
  currentRoomId: string;
  onChangeRoom: (roomId: string, startX: number, startY: number) => void;
  onEncounter: () => void;
  onSave: () => void;
  puzzleFlags: Record<string, boolean>;
  onPuzzleUpdate: (flag: string, val: boolean) => void;
  initialPos?: Position;
}

export const Overworld: React.FC<OverworldProps> = ({ 
  currentRoomId, 
  onChangeRoom, 
  onEncounter, 
  onSave, 
  puzzleFlags, 
  onPuzzleUpdate,
  initialPos 
}) => {
  const room = ROOMS[currentRoomId];
  const [pos, setPos] = useState<Position>(initialPos || { x: 300, y: 200 });
  const [direction, setDirection] = useState<Direction>(Direction.DOWN);
  const [isMoving, setIsMoving] = useState(false);
  const [dialogue, setDialogue] = useState<string[] | null>(null);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [shake, setShake] = useState(false);

  const keysPressed = useRef<Record<string, boolean>>({});
  const lastTime = useRef<number>(0);

  // Helper to check walls taking puzzle flags into account
  const getActiveWalls = (): Rect[] => {
      let active = [...room.walls];
      if (room.conditionalWalls) {
          room.conditionalWalls.forEach(cw => {
              if (puzzleFlags[cw.flag]) {
                  // If flag is true, wall removed
              } else {
                  active.push(cw.wall);
              }
          });
      }
      return active;
  };

  const activeWalls = getActiveWalls();

  // Check collision with walls or interactables
  const canMove = (newX: number, newY: number): boolean => {
    // 1. Room boundaries
    if (newX < 0 || newX > room.width - 28) return false;
    if (newY < 0 || newY > room.height - 40) return false;

    // 2. Obstacles (walls)
    const playerBox = { x: newX, y: newY + 20, w: 28, h: 20 };
    
    for (const wall of activeWalls) {
        if (
            playerBox.x < wall.x + wall.w &&
            playerBox.x + playerBox.w > wall.x &&
            playerBox.y < wall.y + wall.h &&
            playerBox.y + playerBox.h > wall.y
        ) {
            return false;
        }
    }
    return true;
  };

  const checkInteraction = () => {
      let checkX = pos.x + 14;
      let checkY = pos.y + 20;
      const range = 30;

      if (direction === Direction.UP) checkY -= range;
      if (direction === Direction.DOWN) checkY += range;
      if (direction === Direction.LEFT) checkX -= range;
      if (direction === Direction.RIGHT) checkX += range;

      for (const item of room.interactables) {
          if (checkX >= item.x && checkX <= item.x + item.w && checkY >= item.y && checkY <= item.y + item.h) {
              
              if (item.type === 'switch') {
                   const isOn = puzzleFlags[item.id];
                   if (isOn) {
                       playSound('text');
                       setDialogue(["* (Переключатель уже нажат.)"]);
                   } else {
                       onPuzzleUpdate(item.id, true);
                       playSound('select');
                       setDialogue(["* Щёлк!", "* (Вы нажали переключатель.)"]);
                       setShake(true); 
                       setTimeout(() => setShake(false), 200);
                   }
                   return;
              }

              if (item.type === 'dummy') {
                  onEncounter(); 
                  return;
              }

              if (item.id === 'save') {
                  onSave();
                  return; 
              }

              if (item.text) {
                playSound('text');
                setDialogue(item.text);
                setDialogueIndex(0);
              }
              return;
          }
      }
  };

  useEffect(() => {
    if (initialPos) setPos(initialPos);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
      
      if (dialogue) {
          if (e.key === 'z' || e.key === 'Enter') {
              if (dialogueIndex < dialogue.length - 1) {
                  setDialogueIndex(prev => prev + 1);
                  playSound('text');
              } else {
                  setDialogue(null);
              }
          }
          return;
      }

      if (e.key === 'z' || e.key === 'Enter') {
          checkInteraction();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationFrameId: number;

    const loop = (time: number) => {
      if (dialogue) {
          setIsMoving(false);
          animationFrameId = requestAnimationFrame(loop);
          return;
      }

      const delta = time - lastTime.current; 
      lastTime.current = time;
      
      let dx = 0;
      let dy = 0;
      const speed = 3;

      if (keysPressed.current['ArrowUp']) { dy -= speed; setDirection(Direction.UP); }
      else if (keysPressed.current['ArrowDown']) { dy += speed; setDirection(Direction.DOWN); }
      else if (keysPressed.current['ArrowLeft']) { dx -= speed; setDirection(Direction.LEFT); }
      else if (keysPressed.current['ArrowRight']) { dx += speed; setDirection(Direction.RIGHT); }

      setIsMoving(dx !== 0 || dy !== 0);

      if (dx !== 0 || dy !== 0) {
          if (canMove(pos.x + dx, pos.y)) {
              setPos(prev => ({ ...prev, x: prev.x + dx }));
          }
          if (canMove(pos.x, pos.y + dy)) {
              setPos(prev => ({ ...prev, y: prev.y + dy }));
          }

          if (Math.random() < room.encounterRate) {
              keysPressed.current = {}; 
              playSound('encounter');
              onEncounter();
              return; 
          }

          const pBox = { x: pos.x + dx, y: pos.y + dy, w: 28, h: 40 };
          for (const exit of room.exits) {
              if (
                pBox.x < exit.x + exit.w &&
                pBox.x + pBox.w > exit.x &&
                pBox.y < exit.y + exit.h &&
                pBox.y + pBox.h > exit.y
              ) {
                  onChangeRoom(exit.targetRoomId, exit.targetX, exit.targetY);
                  return;
              }
          }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  });

  return (
    <div className={`relative overflow-hidden bg-black mx-auto border-4 border-white ${shake ? 'shake' : ''}`} style={{ width: 640, height: 480 }}>
      {/* Background = Wall Color */}
      <div className="absolute inset-0 bg-[#300030]">
          {/* Pattern for walls */}
          <div className="w-full h-full opacity-30" style={{ backgroundImage: 'linear-gradient(#200020 2px, transparent 2px), linear-gradient(90deg, #200020 2px, transparent 2px)', backgroundSize: '40px 40px' }}></div>
      </div>
      
      {/* Walkable Floor drawn as SVG */}
      <svg width="640" height="480" className="absolute top-0 left-0">
         <path d={room.floorPath} fill="#D8BFD8" stroke="#500050" strokeWidth="4" />
      </svg>
      
      {/* Render Interactables */}
      {room.interactables.map((item, i) => (
             <div key={i} className="absolute" style={{ left: item.x, top: item.y, width: item.w, height: item.h }}>
                 {item.id === 'save' && (
                     <div className="w-full h-full flex items-center justify-center animate-pulse">
                         <div className="text-yellow-300 text-2xl">★</div>
                     </div>
                 )}
                 {item.id === 'flowers' && (
                     <div className="w-full h-full bg-yellow-600 rounded-full opacity-50"></div>
                 )}
                 {item.type === 'switch' && (
                     <div className={`w-8 h-10 border-2 ${puzzleFlags[item.id] ? 'bg-green-700 border-green-500' : 'bg-gray-700 border-gray-500'} mx-auto mt-2`}>
                        <div className={`w-2 h-4 bg-black mx-auto ${puzzleFlags[item.id] ? 'mt-4' : 'mt-1'}`}></div>
                     </div>
                 )}
                 {item.type === 'dummy' && (
                     <div className="w-full h-full bg-[#eee] rounded-t-lg border-2 border-black flex flex-col items-center">
                         <div className="w-1 h-2 bg-black mt-2"></div>
                         <div className="w-1 h-2 bg-black mt-2"></div>
                         <div className="w-full h-1/2 bg-[#ddd] mt-auto"></div>
                     </div>
                 )}
                 {item.id === 'spikes' && !puzzleFlags['switch_1'] && (
                     <div className="w-full h-full flex gap-1 overflow-hidden">
                         {[...Array(5)].map((_, i) => <div key={i} className="w-4 h-8 bg-gray-400" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>)}
                     </div>
                 )}
             </div>
      ))}

      {/* Player */}
      <div className="absolute transition-transform will-change-transform" style={{ left: pos.x, top: pos.y }}>
             <PlayerSprite direction={direction} isMoving={isMoving} />
      </div>

      {/* Dialogue Overlay */}
      {dialogue && (
             <div className="absolute bottom-4 left-4 right-4 h-[150px]">
                 <Box>
                    <div className="p-6 font-dialogue text-3xl">
                        <Typewriter text={dialogue[dialogueIndex]} key={dialogueIndex} speed={40} />
                        <div className="absolute bottom-2 right-4 text-sm animate-bounce text-yellow-500">[Z] Next</div>
                    </div>
                 </Box>
             </div>
      )}
    </div>
  );
};