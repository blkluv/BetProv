import React, { useRef, useEffect } from 'react';

function Dice({ isRolling, diceResult }) {
  const diceRef = useRef(null);

  useEffect(() => {
    if (isRolling && diceRef.current) {
      diceRef.current.style.animation = 'rolling 2s';
      setTimeout(() => {
        if (diceRef.current) {
          diceRef.current.style.animation = '';
        }
      }, 2000);
    }
  }, [isRolling]);

  return (
    <div 
      ref={diceRef}
      className={`dice mb-8 ${isRolling ? 'rolling' : ''}`}
    >
      {diceResult ? (
        <div className={`dice-face dice-${diceResult}`}>
          {[...Array(diceResult)].map((_, i) => (
            <div key={i} className="dot"></div>
          ))}
        </div>
      ) : (
        <div className="dice-face dice-6">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      )}
    </div>
  );
}

export default Dice;