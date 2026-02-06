
import React, { useState, useMemo } from 'react';
import UploadView from './components/UploadView';
import MappingView from './components/MappingView';
import ResultsView from './components/ResultsView';
import SettingsModal from './components/SettingsModal';
import { processData } from './utils/math';
import { Settings as SettingsIcon, Layout } from 'lucide-react';

const App = () => {
  const [step, setStep] = useState('upload');
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [settings, setSettings] = useState({
    cutoff: 42,
    roundingDecimals: 2,
    missingValueStrategy: 'ignore',
    normalizationMethod: 'z-score'
  });

  const processedData = useMemo(() => {
    if (!mapping || rawRows.length === 0) return null;
    return processData(rawRows, mapping, settings);
  }, [rawRows, mapping, settings]);

  const handleDataLoaded = (data, headers) => {
    setRawRows(data);
    setHeaders(headers);
    setStep('mapping');
  };

  const handleMappingConfirmed = (newMapping) => {
    setMapping(newMapping);
    setStep('results');
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 font-sans">
      {/* Global Navbar */}
      <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
            <Layout className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">PanelScout</span>
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
          title="Settings"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </nav>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        {step === 'upload' && (
          <div className="max-w-7xl mx-auto px-4 py-12 h-full w-full flex-1 flex flex-col justify-center">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-extrabold text-zinc-900 tracking-tight sm:text-5xl mb-4">
                Automate Your Panel Scoring
              </h1>
              <p className="max-w-2xl mx-auto text-xl text-zinc-500">
                Upload your judging CSV, map columns, and get instant standardized rankings.
              </p>
            </div>
            <UploadView onDataLoaded={handleDataLoaded} />
          </div>
        )}

        {step === 'mapping' && (
          <div className="max-w-7xl mx-auto px-4 py-8 w-full">
            <MappingView
              headers={headers}
              sampleData={rawRows}
              onConfirm={handleMappingConfirmed}
              onBack={() => setStep('upload')}
            />
          </div>
        )}

        {step === 'results' && processedData && mapping && (
          <div className="h-full flex-1">
            <ResultsView
              data={processedData}
              mapping={mapping}
              settings={settings}
              onBack={() => setStep('upload')}
            />
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdate={setSettings}
      />
    </div>
  );
};

export default App;
