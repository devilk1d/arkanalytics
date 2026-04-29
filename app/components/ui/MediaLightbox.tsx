'use client';

import React from 'react';

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  type: 'image' | 'video';
}

export default function MediaLightbox({ isOpen, onClose, url, type }: MediaLightboxProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div className="absolute top-6 right-6 text-white/50 hover:text-white transition-all cursor-pointer p-2 hover:rotate-90">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
      <div className="max-w-[95%] max-h-[90%] flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
        <div className="relative group">
          {type === 'image' ? (
             <img 
               src={url} 
               className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-[0_0_50px_-12px_rgba(255,255,255,0.3)] border border-white/10" 
               alt="Preview" 
             />
          ) : (
            <video 
              src={url} 
              controls 
              autoPlay 
              className="w-full h-auto max-h-[80vh] rounded-2xl shadow-[0_0_50px_-12px_rgba(255,255,255,0.3)] border border-white/10" 
            />
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-full transition-all border border-white/10 backdrop-blur-md"
          >
            Close
          </button>
          <button 
            onClick={() => window.open(url, '_blank')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-full transition-all shadow-xl"
          >
            Open Original
          </button>
        </div>
      </div>
    </div>
  );
}
