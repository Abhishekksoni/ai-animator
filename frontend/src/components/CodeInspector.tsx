'use client';

import React, { useState } from 'react';
import { Copy, Check, Download, AlertTriangle, Code, Terminal } from 'lucide-react';
import { Scene } from '../types';

interface CodeInspectorProps {
  scene: Scene | null;
}

export const CodeInspector: React.FC<CodeInspectorProps> = ({ scene }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'logs'>('code');

  const code = scene?.code || '# No code generated yet';
  const errorTrace = scene?.error_trace;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scene_v${scene?.version || 1}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const codeLines = code.split('\n');

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
              activeTab === 'code'
                ? 'bg-slate-800 text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            <span>scene.py</span>
          </button>

          {errorTrace && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                activeTab === 'logs'
                  ? 'bg-red-950/50 text-red-400 border border-red-800/50 font-semibold'
                  : 'text-red-400/80 hover:text-red-300'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Diagnostics</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            title="Copy code"
            className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            title="Download scene.py"
            className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">.py</span>
          </button>
        </div>
      </div>

      {/* Code / Logs View */}
      <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 custom-scrollbar select-text">
        {activeTab === 'code' ? (
          <table className="w-full border-collapse">
            <tbody>
              {codeLines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-900/60 leading-5">
                  <td className="w-10 select-none pr-4 text-right text-slate-600 font-mono text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="whitespace-pre font-mono">
                    <span className={
                      line.trim().startsWith('#')
                        ? 'text-slate-500 italic'
                        : line.includes('class ') || line.includes('def ') || line.includes('import ')
                        ? 'text-purple-400 font-semibold'
                        : line.includes('self.play') || line.includes('Create') || line.includes('Transform')
                        ? 'text-cyan-400'
                        : line.includes('"') || line.includes("'")
                        ? 'text-amber-300'
                        : 'text-slate-200'
                    }>
                      {line}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-400 font-semibold">
              <Terminal className="h-4 w-4" />
              <span>Traceback & Engine Diagnostics</span>
            </div>
            <pre className="rounded-xl bg-red-950/20 border border-red-900/30 p-3 text-red-300 whitespace-pre-wrap text-[11px] leading-relaxed">
              {errorTrace}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
