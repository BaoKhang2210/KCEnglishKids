import React, { useState, useEffect } from 'react';
import { Delete } from 'lucide-react';
import { sfx } from '../../utils/audio';

interface PinPadProps {
  onComplete: (pin: string) => void;
  error?: string | null;
  loading?: boolean;
}

export const PinPad: React.FC<PinPadProps> = ({ onComplete, error, loading }) => {
  const [pin, setPin] = useState<string>('');

  const handleDigit = (digit: string) => {
    if (pin.length < 4 && !loading) {
      sfx.playPop();
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        onComplete(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0 && !loading) {
      sfx.playPop();
      setPin(pin.slice(0, -1));
    }
  };

  // Clear pin on external error
  useEffect(() => {
    if (error) {
      sfx.playGentleWrong();
      const timer = setTimeout(() => {
        setPin('');
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="flex flex-col items-center w-full max-w-sm sm:max-w-md mx-auto">
      {/* 4-digit Bubble Indicators */}
      <div className={`flex items-center gap-5 my-6 ${error ? 'animate-gentle-wobble' : ''}`}>
        {[0, 1, 2, 3].map(idx => (
          <div
            key={idx}
            className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full border-4 transition-all duration-200 ${
              pin.length > idx
                ? 'bg-amber-400 border-amber-500 scale-110 shadow-lg'
                : 'bg-white border-slate-300'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-rose-500 font-black text-sm sm:text-base mb-3 text-center animate-pop-in">
          {error}
        </p>
      )}

      {/* Keypad Grid */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full">
        {digits.map(d => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            disabled={loading}
            className="btn-kid bg-white hover:bg-amber-50 active:bg-amber-100 text-slate-800 font-black text-3xl sm:text-4xl h-18 sm:h-22 rounded-3xl border-3 border-amber-200 flex items-center justify-center cursor-pointer transition-all shadow-md active:scale-95"
          >
            {d}
          </button>
        ))}

        <div className="flex items-center justify-center"></div>

        <button
          onClick={() => handleDigit('0')}
          disabled={loading}
          className="btn-kid bg-white hover:bg-amber-50 active:bg-amber-100 text-slate-800 font-black text-3xl sm:text-4xl h-18 sm:h-22 rounded-3xl border-3 border-amber-200 flex items-center justify-center cursor-pointer transition-all shadow-md active:scale-95"
        >
          0
        </button>

        <button
          onClick={handleDelete}
          disabled={loading || pin.length === 0}
          className="btn-kid bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 font-black text-3xl sm:text-4xl h-18 sm:h-22 rounded-3xl border-3 border-rose-200 flex items-center justify-center cursor-pointer transition-all shadow-md active:scale-95 disabled:opacity-40"
        >
          <Delete className="w-8 h-8 sm:w-9 sm:h-9" />
        </button>
      </div>
    </div>
  );
};
