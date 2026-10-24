import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface AndroidFrameProps {
  children: React.ReactNode;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({ children }) => {
  const { theme } = useTheme();

  return (
    <div
      className={`min-h-screen w-full flex justify-center transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-slate-950 text-slate-100'
          : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Centered Android container with smooth borders and clean elevation */}
      <div
        className={`w-full max-w-md min-h-screen flex flex-col relative shadow-2xl transition-colors ${
          theme === 'dark'
            ? 'bg-slate-950 border-x border-slate-800/60'
            : 'bg-white border-x border-slate-200'
        }`}
      >
        {children}
      </div>
    </div>
  );
};
