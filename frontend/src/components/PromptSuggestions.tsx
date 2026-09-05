'use client';

import React from 'react';
import { Triangle, Activity, Shapes, Network } from 'lucide-react';

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void;
  theme: 'dark' | 'light';
}

const TEMPLATES = [
  {
    icon: Triangle,
    title: 'Pythagorean Theorem',
    prompt: 'Explain the Pythagorean theorem visually with a right-angled triangle and squares expanding on each side.',
    category: 'Geometry',
  },
  {
    icon: Activity,
    title: 'Sine Wave & Tangent',
    prompt: 'Show a sine wave graph with a moving point and dynamic tangent line tracking the derivative value.',
    category: 'Calculus',
  },
  {
    icon: Shapes,
    title: 'Geometric Morphing',
    prompt: 'Show geometric shapes (circle, square, triangle, star) smoothly morphing into each other with area equations.',
    category: 'Transformations',
  },
  {
    icon: Network,
    title: 'Neural Network Pass',
    prompt: 'Create a 3-layer neural network visualization showing animated activation pulses flowing through the weights.',
    category: 'Machine Learning',
  },
];

export const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({ onSelect, theme }) => {
  const isDark = theme === 'dark';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3 pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {TEMPLATES.map((t, idx) => {
          const Icon = t.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelect(t.prompt)}
              className={`group flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all claude-shadow ${
                isDark
                  ? 'border-[#27272a] bg-[#141416]/80 hover:border-[#3f3f46] hover:bg-[#1a1a1d]'
                  : 'border-[#e6e4dc] bg-white hover:border-[#dcd9ce] hover:bg-[#faf9f6]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div className="flex items-center gap-2">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-md transition ${
                    isDark
                      ? 'bg-[#d97736]/10 text-[#d97736] group-hover:bg-[#d97736]/20'
                      : 'bg-[#d97736]/10 text-[#d97736] group-hover:bg-[#d97736]/20'
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className={`text-xs font-semibold transition ${
                    isDark
                      ? 'text-zinc-200 group-hover:text-white'
                      : 'text-stone-800 group-hover:text-stone-950'
                  }`}>
                    {t.title}
                  </span>
                </div>
                <span className={`text-[10px] font-medium ${
                  isDark ? 'text-zinc-500' : 'text-stone-400'
                }`}>
                  {t.category}
                </span>
              </div>
              <p className={`text-[11px] line-clamp-2 leading-relaxed ${
                isDark ? 'text-zinc-400' : 'text-stone-600'
              }`}>
                {t.prompt}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
