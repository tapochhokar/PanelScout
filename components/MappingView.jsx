
import React, { useState, useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react';

const MappingView = ({ headers, sampleData, onConfirm, onBack }) => {
  const [mapping, setMapping] = useState({
    panelCol: '',
    teamIdCol: '',
    teamNameCol: '',
    judgeCols: []
  });

  // Heuristics to auto-detect columns
  useEffect(() => {
    const newMapping = {
      // If no column looks like "Panel", default to empty string (Auto-detect)
      panelCol: headers.find(h => /panel|group|batch/i.test(h)) || '',
      teamIdCol: headers.find(h => /id|code|ref/i.test(h)) || headers[0] || '',
      teamNameCol: headers.find(h => /name|team|project/i.test(h)) || headers[1] || '',
      judgeCols: headers.filter(h => {
        // Detect if looks like a judge column (numeric in sample, or named Judge/J)
        const isNamedJudge = /judge|score|j\d+/i.test(h);
        // Check first 5 rows for numeric content
        const isNumeric = sampleData.slice(0, 5).every(row => {
          const val = row[h];
          return val === '' || val === null || !isNaN(parseFloat(String(val)));
        });
        return isNamedJudge || (isNumeric && !/panel|id|name/i.test(h));
      })
    };
    setMapping(newMapping);
  }, [headers, sampleData]);

  const toggleJudgeCol = (col) => {
    setMapping(prev => ({
      ...prev,
      judgeCols: prev.judgeCols.includes(col)
        ? prev.judgeCols.filter(c => c !== col)
        : [...prev.judgeCols, col]
    }));
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-8 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.06)] border border-zinc-200">
      <h2 className="text-2xl font-bold text-zinc-900 mb-6">Map Columns</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="p-5 border border-dashed border-blue-200 rounded-lg bg-blue-50/30">
            <label className="block text-sm font-semibold text-zinc-800 mb-2">Panel / Group Column</label>
            <select
              className="w-full bg-white border border-zinc-300 rounded-lg p-2.5 text-zinc-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              value={mapping.panelCol}
              onChange={(e) => setMapping({ ...mapping, panelCol: e.target.value })}
            >
              <option value="">(Auto-detect based on Judges)</option>
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              If left empty, we'll automatically group teams into panels based on which judges scored them.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-2">Team ID Column</label>
            <select
              className="w-full bg-white border border-zinc-300 rounded-lg p-2.5 text-zinc-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              value={mapping.teamIdCol}
              onChange={(e) => setMapping({ ...mapping, teamIdCol: e.target.value })}
            >
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-2">Team Name Column</label>
            <select
              className="w-full bg-white border border-zinc-300 rounded-lg p-2.5 text-zinc-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              value={mapping.teamNameCol}
              onChange={(e) => setMapping({ ...mapping, teamNameCol: e.target.value })}
            >
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col h-full">
          <label className="block text-sm font-semibold text-zinc-700 mb-2">Select Judge Score Columns</label>
          <div className="flex-1 border border-zinc-200 rounded-lg overflow-y-auto bg-zinc-50 p-3 space-y-2 max-h-[400px]">
            {headers.map(header => {
              const isSelected = mapping.judgeCols.includes(header);
              return (
                <div
                  key={header}
                  onClick={() => toggleJudgeCol(header)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${isSelected
                      ? 'bg-blue-50 text-blue-900 border-blue-200 shadow-sm'
                      : 'bg-white hover:bg-zinc-100 text-zinc-600 border-transparent'
                    }`}
                >
                  <span className="text-sm font-medium">{header}</span>
                  {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-zinc-500 mt-3 text-right">
            Selected: <span className="font-semibold text-blue-600">{mapping.judgeCols.length}</span> columns
          </p>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-zinc-100 flex justify-between items-center">
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => onConfirm(mapping)}
          disabled={mapping.judgeCols.length === 0}
          className="flex items-center px-8 py-2.5 text-sm font-bold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 shadow-lg shadow-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          Process Data <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
};

export default MappingView;
