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
      {/* Responsive container: full width on mobile, comfortable max-w-xl on desktop */}
      <div
        className={`w-full max-w-xl min-h-screen flex flex-col relative shadow-2xl transition-colors ${
          theme === 'dark'
            ? 'bg-slate-950 border-x border-slate-800/70'
            : 'bg-white border-x border-slate-200'
        }`}
      >
        {children}
      </div>
    </div>
  );
};
