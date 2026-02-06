import React, { useState, useMemo } from 'react';
import { FileText, Table as TableIcon, BarChart2, Users, Trophy, Activity, Filter, Layers, Globe, CheckCircle, CircleDashed, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ResultsView = ({ data, mapping, settings, onBack }) => {
  const [activePanel, setActivePanel] = useState('ALL');
  const [filterText, setFilterText] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const panels = useMemo(() => data.stats.map(s => s.panelId), [data.stats]);

  // Calculate aggregated stats for "ALL" view
  const overallStats = useMemo(() => {
    const teamCount = data.rows.length;
    const selectedCount = data.rows.filter(r => r._selected).length;
    const scores = data.rows.map(r => r._finalScore);
    const meanFinalScore = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);

    // Calculate global average of raw team averages
    const rawAvgs = data.rows.map(r => r._teamAvg);
    const meanTeamAvg = rawAvgs.reduce((a, b) => a + b, 0) / (rawAvgs.length || 1);

    return {
      panelId: 'ALL',
      teamCount,
      selectedCount,
      meanFinalScore,
      meanTeamAvg,
      judgeStats: {}
    };
  }, [data.rows]);

  const currentStats = activePanel === 'ALL'
    ? overallStats
    : data.stats.find(s => s.panelId === activePanel);

  // Identify judges relevant to this view
  const activeJudgeCols = useMemo(() => {
    if (activePanel === 'ALL') {
      return mapping.judgeCols;
    }
    const s = data.stats.find(s => s.panelId === activePanel);
    if (!s) return [];
    return mapping.judgeCols.filter(col => !!s.judgeStats[col]);
  }, [activePanel, data.stats, mapping.judgeCols]);

  const currentRows = useMemo(() => {
    let rows = activePanel === 'ALL'
      ? [...data.rows]
      : data.rows.filter(r => r._panel === activePanel);

    // 1. Sort by Final Score Descending (Best first)
    rows.sort((a, b) => b._finalScore - a._finalScore);

    // 2. Filter
    if (showSelectedOnly) {
      rows = rows.filter(r => r._selected);
    }

    if (filterText) {
      const lower = filterText.toLowerCase();
      rows = rows.filter(r =>
        r._teamName.toLowerCase().includes(lower) ||
        r._teamId.toLowerCase().includes(lower)
      );
    }

    return rows;
  }, [data.rows, activePanel, filterText, showSelectedOnly]);


  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = data.stats.map(s => ({
      Panel: s.panelId,
      Teams: s.teamCount,
      Selected: s.selectedCount,
      'Avg Team Score': s.meanTeamAvg.toFixed(2),
      'Avg Final Score': s.meanFinalScore.toFixed(3)
    }));
    summaryData.unshift({
      Panel: "ALL (Combined)",
      Teams: overallStats.teamCount,
      Selected: overallStats.selectedCount,
      'Avg Team Score': overallStats.meanTeamAvg.toFixed(2),
      'Avg Final Score': overallStats.meanFinalScore.toFixed(3)
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // All Data Sheet
    const allRowsSorted = [...data.rows].sort((a, b) => b._finalScore - a._finalScore);
    const allRowsClean = allRowsSorted.map((r, i) => {
      const out = {
        GlobalRank: r._globalRank,
        Panel: r._panel,
        PanelRank: r._rank,
        Selected: r._selected,
        TeamID: r._teamId,
        TeamName: r._teamName,
        FinalScore: r._finalScore,
        TeamAverage: r._teamAvg
      };
      mapping.judgeCols.forEach(j => {
        out[`Z_${j}`] = typeof r[`Z_${j}`] === 'number' ? r[`Z_${j}`].toFixed(3) : '';
      });
      return out;
    });
    const wsAll = XLSX.utils.json_to_sheet(allRowsClean);
    XLSX.utils.book_append_sheet(wb, wsAll, "All Teams");

    // Per Panel Sheets
    data.stats.forEach(panelStat => {
      const panel = panelStat.panelId;
      const pRows = data.rows.filter(r => r._panel === panel).sort((a, b) => a._rank - b._rank);
      const panelActiveJudges = mapping.judgeCols.filter(col => !!panelStat.judgeStats[col]);

      const cleanRows = pRows.map(r => {
        const out = {
          Rank: r._rank,
          GlobalRank: r._globalRank,
          Selected: r._selected,
          Panel: r._panel,
          TeamID: r._teamId,
          TeamName: r._teamName,
          FinalScore: r._finalScore,
          TeamAverage: r._teamAvg
        };
        panelActiveJudges.forEach(j => {
          out[`Z_${j}`] = typeof r[`Z_${j}`] === 'number' ? r[`Z_${j}`].toFixed(3) : '';
        });
        panelActiveJudges.forEach(j => {
          out[`Raw_${j}`] = r[j];
        });
        return out;
      });
      const ws = XLSX.utils.json_to_sheet(cleanRows);
      XLSX.utils.book_append_sheet(wb, ws, `Panel ${panel}`);
    });

    XLSX.writeFile(wb, "PanelScout_Results.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text("PanelScout Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    let yPos = 35;

    // Iterate panels
    data.stats.forEach((panelStat) => {
      const panel = panelStat.panelId;
      const pRows = data.rows.filter(r => r._panel === panel).sort((a, b) => a._rank - b._rank);
      const pRowsToShow = pRows.slice(0, 20);

      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(`Panel: ${panel}`, 14, yPos);
      yPos += 8;

      const tableBody = pRowsToShow.map(r => [
        r._rank,
        r._teamName,
        r._finalScore.toFixed(2),
        r._selected ? "Yes" : "No"
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Rank', 'Team', 'Score', 'Status']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
        styles: { fontSize: 9 },
      });

      // @ts-ignore
      yPos = doc.lastAutoTable.finalY + 15;
    });

    doc.save("PanelScout_Summary.pdf");
  };

  const chartData = useMemo(() => {
    return currentRows.map(r => ({
      name: r._teamId,
      score: r._finalScore,
      selected: r._selected
    }));
  }, [currentRows]);

  if (!currentStats) return <div>No data</div>;

  const isAllView = activePanel === 'ALL';

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Header Toolbar */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center sticky top-0 z-10 shadow-sm gap-4">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <button
            onClick={onBack}
            className="text-sm font-medium text-zinc-500 hover:text-blue-600 transition-colors flex items-center"
          >
            &larr; <span className="ml-1">Reset</span>
          </button>
          <div className="h-6 w-px bg-zinc-200 mx-2 hidden sm:block"></div>

          <div className="relative group">
            <select
              className="appearance-none pl-10 pr-10 py-2 bg-white border border-zinc-300 rounded-lg text-sm font-semibold text-zinc-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm min-w-[240px] cursor-pointer hover:border-blue-300 transition-colors"
              value={activePanel}
              onChange={(e) => setActivePanel(e.target.value)}
            >
              <option value="ALL">All Panels (Common View)</option>
              <optgroup label="Individual Panels">
                {panels.map(p => <option key={p} value={p}>{p}</option>)}
              </optgroup>
            </select>
            <Layers className="absolute left-3 top-2.5 w-4 h-4 text-blue-500 pointer-events-none group-hover:text-blue-600" />
            <div className="absolute right-3 top-3 pointer-events-none">
              <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 w-full sm:w-auto justify-end">
          <button onClick={exportPDF} className="flex items-center px-4 py-2 bg-white border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm transition-all">
            <FileText className="w-4 h-4 mr-2 text-rose-500" /> PDF
          </button>
          <button onClick={exportExcel} className="flex items-center px-4 py-2 bg-white border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm transition-all">
            <TableIcon className="w-4 h-4 mr-2 text-emerald-600" /> Excel
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.06)] border border-zinc-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">Total Teams</p>
              <p className="text-3xl font-bold text-zinc-900 mt-1">{currentStats.teamCount}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.06)] border border-zinc-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">Selected Teams</p>
              <div className="flex items-baseline mt-1 space-x-2">
                <p className="text-3xl font-bold text-teal-600">{currentStats.selectedCount}</p>
                <span className="text-xs font-medium bg-zinc-100 px-2 py-0.5 rounded text-zinc-600">≤ Rank {settings.cutoff}</span>
              </div>
            </div>
            <div className="bg-teal-50 p-3 rounded-full">
              <Trophy className="w-6 h-6 text-teal-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.06)] border border-zinc-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">Avg Raw Score</p>
              <p className="text-3xl font-bold text-zinc-900 mt-1">{currentStats.meanTeamAvg.toFixed(2)}</p>
            </div>
            <div className="bg-violet-50 p-3 rounded-full">
              <Activity className="w-6 h-6 text-violet-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.06)] border border-zinc-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">Active Judges</p>
              <p className="text-3xl font-bold text-zinc-900 mt-1">{activeJudgeCols.length}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-full">
              <Filter className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Charts & Table Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Main Table */}
          <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-zinc-200 flex flex-col h-[650px]">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50 rounded-t-xl">
              <h3 className="font-bold text-zinc-800 text-lg flex items-center">
                {isAllView && <Globe className="w-5 h-5 mr-2 text-blue-500" />}
                {isAllView ? 'Global Rankings (All Panels)' : 'Panel Rankings'}
              </h3>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowSelectedOnly(!showSelectedOnly)}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showSelectedOnly
                      ? 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm'
                      : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50'
                    }`}
                >
                  {showSelectedOnly ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1.5" /> Selected Only
                    </>
                  ) : (
                    <>
                      <CircleDashed className="w-4 h-4 mr-1.5" /> Show All
                    </>
                  )}
                </button>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Filter by Name/ID..."
                    className="pl-9 pr-4 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-56 transition-all"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                  <Filter className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    {isAllView && (
                      <th className="px-4 py-3.5 text-left font-bold text-zinc-600 uppercase tracking-wider bg-zinc-50 border-b border-zinc-200 w-16">
                        # Rank
                      </th>
                    )}
                    <th className="px-4 py-3.5 text-left font-semibold text-zinc-500 uppercase tracking-wider w-24 bg-zinc-50 border-b border-zinc-200">
                      {isAllView ? 'P-Rank' : 'Rank'}
                    </th>
                    {isAllView && (
                      <th className="px-4 py-3.5 text-left font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-50 border-b border-zinc-200">
                        Panel
                      </th>
                    )}
                    <th className="px-4 py-3.5 text-left font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-50 border-b border-zinc-200">
                      Team
                    </th>
                    <th className="px-4 py-3.5 text-right font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-50 border-b border-zinc-200">
                      Final Score
                    </th>
                    {/* Render active judge columns for Z-scores */}
                    {activeJudgeCols.map(col => (
                      <th key={`z-${col}`} className="px-2 py-3.5 text-center font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-50 text-xs w-20 truncate border-b border-zinc-200" title={`Z-Score: ${col}`}>
                        {col.length > 8 ? col.substring(0, 6) + '...' : col}
                      </th>
                    ))}
                    <th className="px-4 py-3.5 text-center font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-50 border-b border-zinc-200">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-zinc-100">
                  {currentRows.map((row) => (
                    <tr key={row._teamId} className={`hover:bg-zinc-50 transition-colors ${row._selected ? "bg-teal-50/10" : ""}`}>
                      {isAllView && (
                        <td className="px-4 py-3 whitespace-nowrap font-black text-zinc-800 border-r border-zinc-100">
                          {row._globalRank}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-zinc-500">
                        #{row._rank}
                      </td>
                      {isAllView && (
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-zinc-500">
                          {row._panel}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-zinc-900">{row._teamName}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-0.5">{row._teamId}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-blue-600 text-base">
                        {row._finalScore.toFixed(3)}
                      </td>
                      {activeJudgeCols.map(col => (
                        <td key={`z-${col}`} className="px-2 py-3 whitespace-nowrap text-center text-xs text-zinc-400 font-mono">
                          {typeof row[`Z_${col}`] === 'number' ?
                            <span className={row[`Z_${col}`] > 0 ? "text-zinc-700" : "text-zinc-400"}>
                              {row[`Z_${col}`].toFixed(2)}
                            </span>
                            : <span className="text-zinc-200">-</span>
                          }
                        </td>
                      ))}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {row._selected ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                            Selected
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            Unselected
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {currentRows.length === 0 && (
                    <tr>
                      <td colSpan={15} className="px-4 py-12 text-center text-zinc-400">
                        {showSelectedOnly ? "No selected teams found." : "No teams found matching filter."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side Charts / Stats */}
          <div className="space-y-6">
            {/* Score Distribution */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-zinc-200 h-96 flex flex-col">
              <h3 className="text-base font-bold text-zinc-800 mb-6 flex items-center">
                <BarChart2 className="w-5 h-5 mr-2 text-blue-500" />
                {isAllView ? 'Global Score Distribution' : 'Panel Score Distribution'}
              </h3>
              <div className="flex-1 w-full -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="horizontal" margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis dataKey="name" hide />
                    <YAxis stroke="#a1a1aa" fontSize={12} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelStyle={{ color: '#18181b', fontWeight: 'bold' }}
                      itemStyle={{ color: '#2563EB' }}
                      formatter={(val) => [val.toFixed(3), 'Score']}
                    />
                    <ReferenceLine y={0} stroke="#d4d4d8" />
                    <Bar dataKey="score" fill="url(#colorScore)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Judge Stats - Only show if not ALL */}
            {!isAllView && (
              <div className="bg-white p-5 rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col max-h-[400px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-zinc-800">Panel Judge Stats</h3>
                  <span className="text-xs text-zinc-400 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100 flex items-center">
                    <Info className="w-3 h-3 mr-1" /> Mean & Pop. SD
                  </span>
                </div>
                <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
                  <table className="min-w-full text-xs">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-zinc-100 text-zinc-400">
                        <th className="text-left py-2 font-semibold uppercase tracking-wider pl-2">Judge</th>
                        <th className="text-right py-2 font-semibold uppercase tracking-wider">Mean</th>
                        <th className="text-right py-2 font-semibold uppercase tracking-wider pr-2">SD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {Object.entries(currentStats.judgeStats)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([judge, stat]) => (
                          <tr key={judge} className="hover:bg-zinc-50 transition-colors">
                            <td className="py-2.5 text-zinc-700 font-medium truncate max-w-[140px] pl-2" title={judge}>{judge}</td>
                            <td className="py-2.5 text-right text-zinc-600 font-mono">{stat.mean.toFixed(2)}</td>
                            <td className="py-2.5 text-right text-zinc-600 font-mono pr-2">{stat.sd.toFixed(3)}</td>
                          </tr>
                        ))}
                      {Object.keys(currentStats.judgeStats).length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-zinc-400">No judge statistics available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {isAllView && (
              <div className="bg-zinc-900 p-6 rounded-xl shadow-lg text-white">
                <h3 className="text-lg font-bold mb-2 flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-blue-400" /> Global Overview
                </h3>
                <p className="text-zinc-400 text-sm mb-4">
                  This view aggregates all teams across {panels.length} panels, re-ranking them by their standardized scores.
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <span className="text-zinc-400 text-sm">Panels</span>
                    <span className="font-bold">{panels.length}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <span className="text-zinc-400 text-sm">Cutoff Rank</span>
                    <span className="font-bold text-teal-400">{settings.cutoff}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Selection Rate</span>
                    <span className="font-bold">
                      {((overallStats.selectedCount / overallStats.teamCount) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResultsView;