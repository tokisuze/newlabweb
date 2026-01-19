import React, { useState, useEffect, useRef } from 'react';
import { Box } from '../UI/Box';
import { Typewriter } from '../UI/Typewriter';
import { BattleState, PlayerStats } from '../../types';
import { MONSTER_ASSETS, FIGHT_TARGET_SVG, SOUL_HEART_SVG } from '../../constants';
import { playSound } from '../../utils/audio';

interface BattleEngineProps {
  onWin: () => void;
  onLose: () => void;
  playerStats: PlayerStats;
  updateStats: (stats: Partial<PlayerStats>) => void;
}

const checkCollision = (soulRect: any, pRect: any) => {
  return !(soulRect.right < pRect.left || 
           soulRect.left > pRect.right || 
           soulRect.bottom < pRect.top || 
           soulRect.top > pRect.bottom);
};

export const BattleEngine: React.FC<BattleEngineProps> = ({ onWin, onLose, playerStats, updateStats }) => {
  const [state, setState] = useState<BattleState>(BattleState.MENU);
  
  // Navigation State
  // selectedBtn: 0=FIGHT, 1=ACT, 2=ITEM, 3=MERCY
  const [selectedBtn, setSelectedBtn] = useState<number>(0); 
  // subMenuIndex: Used for vertical lists inside FIGHT/ACT/ITEM/MERCY
  const [subMenuIndex, setSubMenuIndex] = useState<number>(0);
  const [menuLevel, setMenuLevel] = useState<number>(0); // 0=Main Buttons, 1=Submenu (Targets/Choices)

  // Battle Logic State
  const [flavorText, setFlavorText] = useState("* Фроггит не понимает, зачем он здесь.");
  const [monsterHp, setMonsterHp] = useState(30); // Lower HP for standard enemy
  const [dialogueText, setDialogueText] = useState("");
  const [isSpareable, setIsSpareable] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  
  // Dynamic Battle Box dimensions
  const [boxDims, setBoxDims] = useState({ w: 570, h: 140 });

  // Bullet Hell State
  const [soulPos, setSoulPos] = useState({ x: 285, y: 70 }); 
  const [projectiles, setProjectiles] = useState<{x: number, y: number, vx: number, vy: number, w: number, h: number, id: number}[]>([]);
  const [invulnerable, setInvulnerable] = useState(0);
  const animationFrameRef = useRef<number>(0);

  // Attack Bar State
  const [attackBarPos, setAttackBarPos] = useState(0);
  const [isAttacking, setIsAttacking] = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const [damageNumber, setDamageNumber] = useState<number | null>(null);

  // Constants
  const SOUL_SIZE = 16;
  const SPEED = 4; // Soul speed
  const ATTACK_WIDTH = 560;

  // Box resizing effect
  useEffect(() => {
    if (state === BattleState.DEFEND) {
        setBoxDims({ w: 240, h: 240 });
        // Also set here to ensure consistency if state changes from elsewhere
        setSoulPos({ x: 120 - 8, y: 120 - 8 }); 
    } else {
        setBoxDims({ w: 570, h: 140 });
    }
  }, [state]);

  const handleDefendStart = () => {
    // Set state to DEFEND
    setState(BattleState.DEFEND);
    setProjectiles([]);
    setTurnCount(prev => prev + 1);
    // Pre-emptively set soul pos to center (120-8) to avoid 1-frame glitch where soul is outside box
    setSoulPos({ x: 112, y: 112 });
    
    let frame = 0;
    const spawnProjectiles = () => {
        const currentW = 240;
        const currentH = 240;
        
        // Attack Patterns
        if (frame % 45 === 0) { // Slower spawn rate
             // Pattern A: Flies form bottom moving up
             const xPos = Math.random() * (currentW - 20);
             setProjectiles(prev => [...prev, {
                 x: xPos, y: currentH, 
                 vx: (Math.random() - 0.5) * 1, // Slight drift
                 vy: -2.5, // Slower speed
                 w: 6, h: 6, id: Math.random()
             }]);
        }
        
        if (frame % 60 === 0 && Math.random() > 0.5) {
             // Pattern B: Side walls
             setProjectiles(prev => [...prev, {
                 x: 0, y: Math.random() * (currentH - 40), 
                 vx: 2, vy: 0, 
                 w: 8, h: 8, id: Math.random()
             }]);
        }

        // Update positions
        setProjectiles(prev => prev.map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy
        })).filter(p => p.y > -20 && p.y < currentH + 20 && p.x > -20 && p.x < currentW + 20));

        frame++;
        if (frame < 250) { // Duration of attack ~4 seconds
            animationFrameRef.current = requestAnimationFrame(spawnProjectiles);
        } else {
            setState(BattleState.MENU);
            setMenuLevel(0);
            setSubMenuIndex(0);
            setFlavorText(isSpareable ? "* Фроггит не хочет с вами драться." : "* Фроггит готовится к чему-то.");
        }
    };
    
    setTimeout(spawnProjectiles, 500);
  };

  // Main Input Loop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. MAIN MENU NAVIGATION
      if (state === BattleState.MENU && menuLevel === 0) {
        if (e.key === 'ArrowLeft') { 
            setSelectedBtn(prev => Math.max(0, prev - 1)); 
            playSound('select'); 
        }
        if (e.key === 'ArrowRight') { 
            setSelectedBtn(prev => Math.min(3, prev + 1)); 
            playSound('select'); 
        }
        if (e.key === 'z' || e.key === 'Enter') {
             playSound('select');
             setMenuLevel(1);
             setSubMenuIndex(0);
             
             // Immediate logic for simple menus
             if (selectedBtn === 2 && playerStats.items.length === 0) {
                 // No items
                 setMenuLevel(1); // will show "No items"
             }
        }
      } 
      // 2. SUB MENUS
      else if (state === BattleState.MENU && menuLevel === 1) {
        if (e.key === 'x') {
            setMenuLevel(0);
            return;
        }

        // FIGHT MENU (0)
        if (selectedBtn === 0) {
            if (e.key === 'z' || e.key === 'Enter') {
                playSound('select');
                setState(BattleState.TARGET);
                setAttackBarPos(0);
                setIsAttacking(true);
            }
        }
        // ACT MENU (1)
        else if (selectedBtn === 1) {
            // Options: 0: Check, 1: Compliment, 2: Threaten
            if (e.key === 'ArrowUp') { setSubMenuIndex(prev => Math.max(0, prev - 1)); playSound('select'); }
            if (e.key === 'ArrowDown') { setSubMenuIndex(prev => Math.min(2, prev + 1)); playSound('select'); }
            
            if (e.key === 'z' || e.key === 'Enter') {
                playSound('select');
                if (subMenuIndex === 0) { // Check
                    setDialogueText("* ФРОГГИТ — АТК 4 ЗАЩ 5\n* Жизнь трудна для этого врага.");
                } else if (subMenuIndex === 1) { // Compliment
                    setDialogueText("* Фроггит не понял, что вы сказали,\n  но был польщён.");
                    setIsSpareable(true);
                } else if (subMenuIndex === 2) { // Threaten
                    setDialogueText("* Фроггит выглядит испуганным.");
                    // Maybe make attack harder next turn?
                }
                setState(BattleState.ACTION);
            }
        }
        // ITEM MENU (2)
        else if (selectedBtn === 2) {
             if (playerStats.items.length > 0) {
                 if (e.key === 'z' || e.key === 'Enter') {
                     // Consume item
                     updateStats({ hp: Math.min(playerStats.maxHp, playerStats.hp + 10), items: [] }); // Simple logic: consume all/first
                     playSound('heal');
                     setDialogueText("* Вы съели Ирис. пирог.\n* Ваши ОЗ восстановлены.");
                     setState(BattleState.ACTION);
                 }
             }
        }
        // MERCY MENU (3)
        else if (selectedBtn === 3) {
            // Options: 0: Spare, 1: Flee
            if (e.key === 'ArrowUp') { setSubMenuIndex(prev => Math.max(0, prev - 1)); playSound('select'); }
            if (e.key === 'ArrowDown') { setSubMenuIndex(prev => Math.min(1, prev + 1)); playSound('select'); }

            if (e.key === 'z' || e.key === 'Enter') {
                playSound('select');
                if (subMenuIndex === 0) { // Spare
                    if (isSpareable || monsterHp < 5) {
                        onWin();
                    } else {
                        setDialogueText("* Вы пощадили Фроггита.\n* Но его имя пока не жёлтое.");
                        setState(BattleState.ACTION);
                    }
                } else { // Flee
                    onWin(); // Just let them win/escape for now
                    // setDialogueText("* Сбежать не удалось.");
                    // setState(BattleState.ACTION);
                }
            }
        }
      }
      // 3. TARGET MINIGAME
      else if (state === BattleState.TARGET && isAttacking) {
         if (e.key === 'z' || e.key === 'Enter') {
             setIsAttacking(false);
             const center = ATTACK_WIDTH / 2;
             const diff = Math.abs(attackBarPos - center);
             const precision = 1 - (diff / (ATTACK_WIDTH / 2)); // 1.0 is perfect, 0.0 is miss
             
             let damage = 0;
             if (precision > 0) damage = Math.floor(15 * precision + 5);

             setDamageNumber(damage);
             setState(BattleState.RESULT);
             playSound('damage');
             
             setTimeout(() => {
                 setShowSlash(true);
                 setTimeout(() => {
                     setShowSlash(false);
                     setMonsterHp(prev => prev - damage);
                     setTimeout(() => {
                         if (monsterHp - damage <= 0) onWin();
                         else {
                             setDamageNumber(null);
                             handleDefendStart();
                         }
                     }, 1000);
                 }, 500);
             }, 200);
         }
      } 
      // 4. ACTION TEXT READING
      else if (state === BattleState.ACTION) {
         if (e.key === 'z' || e.key === 'Enter') {
             handleDefendStart();
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, menuLevel, selectedBtn, subMenuIndex, attackBarPos, isAttacking, isSpareable]);

  // Attack Animation
  useEffect(() => {
    if (state === BattleState.TARGET && isAttacking) {
        let startTime = performance.now();
        const duration = 1500;
        
        const animate = (time: number) => {
            if (!isAttacking) return;
            const elapsed = time - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                // Missed automatically
                setIsAttacking(false);
                setDamageNumber(0);
                setState(BattleState.RESULT);
                setTimeout(() => {
                    setDamageNumber(null);
                    handleDefendStart();
                }, 1000);
            } else {
                setAttackBarPos(progress * ATTACK_WIDTH);
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }
  }, [state, isAttacking]);

  // Bullet Hell Loop
  useEffect(() => {
      if (state !== BattleState.DEFEND) return;

      const keysPressed: Record<string, boolean> = {};
      const handleDown = (e: KeyboardEvent) => keysPressed[e.key] = true;
      const handleUp = (e: KeyboardEvent) => keysPressed[e.key] = false;
      window.addEventListener('keydown', handleDown);
      window.addEventListener('keyup', handleUp);

      const loop = () => {
          setSoulPos(prev => {
              let nx = prev.x;
              let ny = prev.y;
              if (keysPressed['ArrowUp']) ny -= SPEED;
              if (keysPressed['ArrowDown']) ny += SPEED;
              if (keysPressed['ArrowLeft']) nx -= SPEED;
              if (keysPressed['ArrowRight']) nx += SPEED;

              // Bounds
              nx = Math.max(0, Math.min(240 - SOUL_SIZE, nx));
              ny = Math.max(0, Math.min(240 - SOUL_SIZE, ny));
              
              return { x: nx, y: ny };
          });
          
          if (state === BattleState.DEFEND) {
             requestAnimationFrame(loop);
          }
      };
      
      const frameId = requestAnimationFrame(loop);
      return () => {
          window.removeEventListener('keydown', handleDown);
          window.removeEventListener('keyup', handleUp);
          cancelAnimationFrame(frameId);
      };
  }, [state]);

  // Collision
  useEffect(() => {
      if (state !== BattleState.DEFEND || invulnerable > 0) return;
      
      // Smaller hitbox (center 6x6 pixels of the 16x16 sprite)
      const soulRect = { 
          left: soulPos.x + 5, 
          right: soulPos.x + 11, 
          top: soulPos.y + 5, 
          bottom: soulPos.y + 11 
      };
      
      for (const p of projectiles) {
          const pRect = { left: p.x, right: p.x + p.w, top: p.y, bottom: p.y + p.h };
          if (checkCollision(soulRect, pRect)) {
              updateStats({ hp: Math.max(0, playerStats.hp - 3) }); // Reduced damage to 3
              playSound('damage');
              setInvulnerable(60); 
              document.body.classList.add('shake');
              setTimeout(() => document.body.classList.remove('shake'), 500);
              if (playerStats.hp - 3 <= 0) onLose();
              break; 
          }
      }
  }, [soulPos, projectiles, invulnerable, playerStats.hp, onLose, updateStats, state]);

  // Invulnerability
  useEffect(() => {
      if (invulnerable > 0) {
          const id = setTimeout(() => setInvulnerable(prev => prev - 1), 16);
          return () => clearTimeout(id);
      }
  }, [invulnerable]);


  const renderSoul = (x: number, y: number) => (
      <div 
        className={`absolute w-4 h-4 transition-opacity ${invulnerable > 0 && Math.floor(invulnerable / 5) % 2 === 0 ? 'opacity-50' : 'opacity-100'}`}
        style={{ left: x, top: y }}
      >
        {SOUL_HEART_SVG}
      </div>
  );

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 max-w-[640px] mx-auto">
       {/* Monster Area */}
       <div className="flex-1 flex flex-col items-center justify-center relative min-h-[200px]">
           <div className="mb-8 relative">
             <div className={`${state === BattleState.RESULT && showSlash ? 'animate-pulse' : ''} ${state === BattleState.DEFEAT ? 'opacity-50 grayscale' : ''}`}>
                {MONSTER_ASSETS.FROGGIT}
             </div>
             
             {/* Speech Bubble */}
             {state === BattleState.MENU && Math.random() > 0.3 && (
                 <div className="absolute right-[-100px] top-0 border-2 border-black bg-white text-black p-2 rounded-xl font-dialogue text-lg w-[120px] leading-none">
                     <div className="absolute top-4 -left-2 w-3 h-3 bg-white border-l-2 border-b-2 border-black transform rotate-45"></div>
                     {isSpareable ? "Ква ква." : "Ква."}
                 </div>
             )}

             {showSlash && (
                 <div className="absolute inset-0 flex items-center justify-center z-20">
                     <div className="w-32 h-32 animate-pulse">
                         <svg viewBox="0 0 100 100" className="w-full h-full">
                             <path d="M10,10 L90,90" stroke="red" strokeWidth="8" />
                         </svg>
                     </div>
                 </div>
             )}
             {damageNumber !== null && !showSlash && (
                 <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-4xl font-8bit text-red-600 animate-bounce">
                     {damageNumber === 0 ? 'MISS' : damageNumber}
                 </div>
             )}
             <div className="mt-4 flex justify-center w-full">
                <div className="w-32 h-4 bg-gray-800 border border-gray-500">
                    <div className="h-full bg-[#00FF00]" style={{ width: `${Math.max(0, (monsterHp/30)*100)}%` }}></div>
                </div>
             </div>
           </div>
       </div>

       {/* Battle Box / UI - Centered */}
       <div className="relative flex items-center justify-center h-[260px]">
          <div 
             className="transition-all duration-300 ease-in-out relative overflow-hidden"
             style={{ width: boxDims.w, height: boxDims.h }}
          >
              <Box className="w-full h-full">
                <div className="p-4 font-dialogue text-3xl h-full relative">
                    
                    {/* MAIN MENU TEXT */}
                    {state === BattleState.MENU && menuLevel === 0 && <Typewriter text={flavorText} />}
                    
                    {/* FIGHT SELECTION */}
                    {state === BattleState.MENU && menuLevel === 1 && selectedBtn === 0 && (
                        <div className="flex flex-col gap-2 cursor-pointer">
                            <div className="flex items-center relative">
                                {renderSoul(0,6)} 
                                <span className={`ml-6 ${isSpareable ? 'text-yellow-400' : ''}`}>* Фроггит</span>
                            </div>
                        </div>
                    )}

                    {/* ACT SELECTION */}
                    {state === BattleState.MENU && menuLevel === 1 && selectedBtn === 1 && (
                        <div className="flex flex-col gap-2 cursor-pointer">
                            <div className="flex items-center relative">
                                {subMenuIndex === 0 && renderSoul(0,6)} <span className="ml-6">* Оценить</span>
                            </div>
                            <div className="flex items-center relative">
                                {subMenuIndex === 1 && renderSoul(0,6)} <span className="ml-6">* Комплимент</span>
                            </div>
                            <div className="flex items-center relative">
                                {subMenuIndex === 2 && renderSoul(0,6)} <span className="ml-6">* Угрожать</span>
                            </div>
                        </div>
                    )}
                    
                    {/* ITEM SELECTION */}
                    {state === BattleState.MENU && menuLevel === 1 && selectedBtn === 2 && (
                         <div className="flex flex-col gap-2 cursor-pointer">
                             {playerStats.items.length > 0 ? (
                                 <div className="flex items-center relative">
                                     {renderSoul(0,6)} <span className="ml-6">* {playerStats.items[0]}</span>
                                 </div>
                             ) : (
                                 <div className="ml-6 text-gray-500 relative">* Пусто</div>
                             )}
                         </div>
                    )}

                    {/* MERCY SELECTION */}
                    {state === BattleState.MENU && menuLevel === 1 && selectedBtn === 3 && (
                        <div className="flex flex-col gap-2 cursor-pointer">
                            <div className="flex items-center relative">
                                {subMenuIndex === 0 && renderSoul(0,6)} <span className={`ml-6 ${isSpareable ? 'text-yellow-400' : ''}`}>* Пощадить</span>
                            </div>
                            <div className="flex items-center relative">
                                {subMenuIndex === 1 && renderSoul(0,6)} <span className="ml-6">* Сбежать</span>
                            </div>
                        </div>
                    )}
                    
                    {/* ACTION DIALOGUE */}
                    {state === BattleState.ACTION && <Typewriter text={dialogueText} />}

                    {/* ATTACK TARGET */}
                    {(state === BattleState.TARGET || state === BattleState.RESULT) && (
                        <div className="w-full h-full flex items-center justify-center bg-black relative">
                            <div className="absolute inset-0 p-2">{FIGHT_TARGET_SVG}</div>
                            <div 
                                className={`absolute top-2 bottom-2 w-4 bg-white shadow-[0_0_5px_white] transition-opacity ${!isAttacking ? 'animate-ping' : ''}`}
                                style={{ left: attackBarPos }}
                            ></div>
                        </div>
                    )}

                    {/* DEFEND (BULLET HELL) */}
                    {state === BattleState.DEFEND && (
                        <div className="relative w-full h-full bg-black overflow-hidden">
                            {renderSoul(soulPos.x, soulPos.y)}
                            {projectiles.map(p => (
                                <div key={p.id} className="absolute bg-white" style={{ left: p.x, top: p.y, width: p.w, height: p.h }}></div>
                            ))}
                        </div>
                    )}
                </div>
              </Box>
          </div>
       </div>

       {/* Stats Line */}
       <div className="mt-2 flex items-center text-white font-8bit text-sm gap-4 uppercase">
           <span>{playerStats.name}</span>
           <span>LV {playerStats.lv}</span>
           <div className="flex items-center gap-1">
               <span className="text-xs">HP</span>
               <div className="w-20 h-4 bg-[#FF0000]">
                   <div className="h-full bg-[#FFFF00]" style={{ width: `${(playerStats.hp / playerStats.maxHp) * 100}%` }}></div>
               </div>
               <span>{playerStats.hp} / {playerStats.maxHp}</span>
           </div>
       </div>

       {/* Action Buttons */}
       {state === BattleState.MENU && menuLevel === 0 && (
           <div className="mt-2 flex justify-between h-[50px] font-8bit text-[#FF7F00]">
               {['БИТВА', 'ДЕЙСТВИЕ', 'ВЕЩЬ', 'ПОЩАДА'].map((label, idx) => (
                   <div key={label} className={`border-2 flex items-center justify-center w-[23%] ${selectedBtn === idx ? 'border-[#FFFF00] text-[#FFFF00]' : 'border-[#FF7F00]'}`}>
                       {selectedBtn === idx && <div className="mr-2 relative top-[2px] w-4 h-4">{SOUL_HEART_SVG}</div>}
                       <span className="text-xl relative top-[2px]">{label}</span>
                   </div>
               ))}
           </div>
       )}
       {(state !== BattleState.MENU || menuLevel !== 0) && <div className="mt-2 h-[50px]"></div>}
    </div>
  );
};