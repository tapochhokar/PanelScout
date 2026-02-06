
import React, { useCallback } from 'react';
import Papa from 'papaparse';
import { UploadCloud } from 'lucide-react';

const UploadView = ({ onDataLoaded }) => {
  const handleFile = useCallback((file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const headers = results.meta.fields || Object.keys(results.data[0]);
          onDataLoaded(results.data, headers);
        }
      },
      error: (error) => {
        console.error("CSV Parse Error", error);
        alert("Error parsing CSV file.");
      }
    });
  }, [onDataLoaded]);

  const onDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.06)] border border-zinc-200">
      <div
        className="w-full max-w-xl p-12 border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50 hover:bg-blue-50/50 hover:border-blue-400 transition-all cursor-pointer flex flex-col items-center gap-4 group"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform duration-200">
          <UploadCloud className="w-10 h-10 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-zinc-900">Upload your CSV file</h3>
          <p className="text-sm text-zinc-500 mt-1">Drag and drop or click to browse</p>
        </div>
        <p className="text-xs text-zinc-400 mt-2">Expects columns for Team and Judge Scores</p>
      </div>
      <input
        id="fileInput"
        type="file"
        accept=".csv"
        className="hidden"
        onChange={onInputChange}
      />

      <div className="mt-8 text-left max-w-md w-full text-sm text-zinc-600 bg-zinc-50 p-5 rounded-lg border border-zinc-200">
        <p className="font-semibold mb-2 text-zinc-900">Required Columns (flexible naming):</p>
        <ul className="list-disc pl-5 space-y-1.5 text-zinc-500">
          <li>Team ID / Team Name</li>
          <li>Judge Scores (numeric)</li>
          <li><span className="text-zinc-400">Optional:</span> Panel / Group (if missing, panels are detected automatically by judge grouping)</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadView;
