
import React from 'react';
import { X } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose, settings, onUpdate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-zinc-200 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-5 border-b border-zinc-100 bg-zinc-50/50">
          <h3 className="text-lg font-bold text-zinc-900">Scoring Settings</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-2">Rank Cutoff</label>
            <input
              type="number"
              className="w-full bg-white border border-zinc-300 rounded-lg p-2.5 text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              value={settings.cutoff}
              onChange={(e) => onUpdate({ ...settings, cutoff: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-zinc-500 mt-2 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-teal-500 mr-1.5"></span>
              Teams with Rank ≤ {settings.cutoff} will be marked as selected.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-2">Rounding Decimals (Team Avg)</label>
            <input
              type="number"
              className="w-full bg-white border border-zinc-300 rounded-lg p-2.5 text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              value={settings.roundingDecimals}
              onChange={(e) => onUpdate({ ...settings, roundingDecimals: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-2">Missing Value Strategy</label>
            <select
              className="w-full bg-white border border-zinc-300 rounded-lg p-2.5 text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none"
              value={settings.missingValueStrategy}
              onChange={(e) => onUpdate({ ...settings, missingValueStrategy: e.target.value })}
            >
              <option value="ignore">Ignore (Standardized value = 0)</option>
              {/* <option value="zero">Treat as 0 (Raw value = 0)</option> */}
            </select>
          </div>
        </div>

        <div className="p-4 bg-zinc-50 border-t border-zinc-100 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
