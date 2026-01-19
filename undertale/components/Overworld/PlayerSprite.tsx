import React from 'react';
import { Direction } from '../../types';

interface PlayerSpriteProps {
  direction: Direction;
  isMoving: boolean;
}

export const PlayerSprite: React.FC<PlayerSpriteProps> = ({ direction, isMoving }) => {
  // A simple blocky representation since we can't load images
  // In a real app, this would be an <img> tag with pixelated rendering.
  
  const animClass = isMoving ? 'animate-bounce-pixel' : '';
  
  return (
    <div className={`relative w-[28px] h-[40px] ${animClass}`} style={{ imageRendering: 'pixelated' }}>
       {/* Head */}
       <div className="absolute top-0 left-[4px] w-[20px] h-[10px] bg-[#5C3222]"></div>
       {/* Face */}
       <div className="absolute top-[10px] left-[4px] w-[20px] h-[10px] bg-[#FCA]"></div>
       {/* Shirt - Blue with Purple stripes */}
       <div className="absolute top-[20px] left-[2px] w-[24px] h-[14px] bg-[#3C5AA6]">
          <div className="absolute top-[4px] w-full h-[4px] bg-[#C1328E]"></div>
          <div className="absolute top-[10px] w-full h-[4px] bg-[#C1328E]"></div>
       </div>
       {/* Pants */}
       <div className="absolute top-[34px] left-[6px] w-[16px] h-[6px] bg-[#5C3222]"></div>
       
       {/* Directional nuances (very simplified) */}
       {direction === Direction.LEFT && <div className="absolute top-[12px] left-[4px] w-[2px] h-[2px] bg-black"></div>}
       {direction === Direction.RIGHT && <div className="absolute top-[12px] right-[4px] w-[2px] h-[2px] bg-black"></div>}
       {(direction === Direction.DOWN || direction === Direction.UP) && (
           <>
            <div className="absolute top-[13px] left-[6px] w-[4px] h-[2px] bg-black opacity-50"></div>
            <div className="absolute top-[13px] right-[6px] w-[4px] h-[2px] bg-black opacity-50"></div>
           </>
       )}
    </div>
  );
};