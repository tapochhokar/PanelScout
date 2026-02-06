// Helper: Excel equivalent of STDEV.P
const calculatePopulationSD = (values, mean) => {
  if (values.length === 0) return 0;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

// Helper: Round to specific decimals
const roundTo = (num, decimals) => {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
};

// Helper: Ranking like Excel (method='min' in python scipy, or standard competition ranking 1224)
const calculateRanks = (rows) => {
  // Sort descending by final score
  const sorted = [...rows].sort((a, b) => b._finalScore - a._finalScore);

  // Assign ranks
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]._finalScore === sorted[i - 1]._finalScore) {
      sorted[i]._rank = sorted[i - 1]._rank;
    } else {
      sorted[i]._rank = i + 1;
    }
  }
  return sorted;
};

export const processData = (
  data,
  mapping,
  settings
) => {

  // 1. Group by Panel
  const panels = {};

  // 1a. Auto-detect panels if no column specified
  if (!mapping.panelCol) {
    const signatures = new Map(); // signature -> panelID
    let panelCounter = 1;

    data.forEach(row => {
      // Find which judges have data for this row
      const presentJudges = mapping.judgeCols.filter(jCol => {
        const val = row[jCol];
        return val !== null && val !== '' && val !== undefined && !isNaN(parseFloat(String(val)));
      }).sort();

      if (presentJudges.length === 0) {
        // Rows with no scores go to Unassigned
        if (!panels['Unassigned']) panels['Unassigned'] = [];
        panels['Unassigned'].push(row);
        return;
      }

      const sig = presentJudges.join('|');
      if (!signatures.has(sig)) {
        signatures.set(sig, `Panel ${panelCounter}`);
        panelCounter++;
      }

      const panelId = signatures.get(sig);
      if (!panels[panelId]) panels[panelId] = [];
      panels[panelId].push(row);
    });
  } else {
    // 1b. Use explicit panel column
    data.forEach(row => {
      const panelVal = String(row[mapping.panelCol] || 'Unassigned');
      if (!panels[panelVal]) panels[panelVal] = [];
      panels[panelVal].push(row);
    });
  }

  let allProcessedRows = [];
  const panelJudgeStats = {};

  // 2. Process each panel independently for Z-scores and Panel Ranks
  Object.keys(panels).forEach(panelId => {
    const panelRows = panels[panelId];
    const judgeStats = {};

    // 2a. Calculate Judge Stats (Mean & SD)
    mapping.judgeCols.forEach(jCol => {
      // Extract numeric values, ignoring blanks/non-numeric
      const values = panelRows
        .map(r => parseFloat(String(r[jCol])))
        .filter(v => !isNaN(v));

      const mean = values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : 0;

      const sd = calculatePopulationSD(values, mean);

      // Only add stats if this judge actually has data in this panel
      if (values.length > 0) {
        judgeStats[jCol] = { mean, sd };
      }
    });

    panelJudgeStats[panelId] = judgeStats;

    // 2b. Calculate Row Scores (Z-scores, Sums)
    let processedPanelRows = panelRows.map(row => {
      const newRow = { ...row };
      newRow._panel = panelId;
      newRow._teamId = String(row[mapping.teamIdCol] || '');
      newRow._teamName = String(row[mapping.teamNameCol] || '');

      let zSum = 0;
      let rawSum = 0;
      let rawCount = 0;

      mapping.judgeCols.forEach(jCol => {
        // Only process if this judge exists for this panel
        if (judgeStats[jCol]) {
          const rawVal = parseFloat(String(row[jCol]));
          const { mean, sd } = judgeStats[jCol];

          let zScore = 0;

          if (!isNaN(rawVal)) {
            rawSum += rawVal;
            rawCount++;

            if (sd !== 0) {
              zScore = (rawVal - mean) / sd;
            } else {
              zScore = 0;
            }
          }

          newRow[`Z_${jCol}`] = zScore;
          zSum += zScore;
        } else {
          newRow[`Z_${jCol}`] = null;
        }
      });

      newRow._teamAvg = rawCount > 0 ? roundTo(rawSum / rawCount, settings.roundingDecimals) : 0;
      newRow._finalScore = zSum; // Sum of Z-scores
      return newRow;
    });

    // 2c. Compute Ranks for this panel (Panel Rank)
    processedPanelRows = calculateRanks(processedPanelRows);

    allProcessedRows = [...allProcessedRows, ...processedPanelRows];
  });

  // 3. Compute Global Ranks and Selection
  // Sort all rows by Final Score Descending
  allProcessedRows.sort((a, b) => b._finalScore - a._finalScore);

  // Assign Global Rank
  allProcessedRows.forEach((row, index) => {
    // Handle ties
    if (index > 0 && row._finalScore === allProcessedRows[index - 1]._finalScore) {
      row._globalRank = allProcessedRows[index - 1]._globalRank;
    } else {
      row._globalRank = index + 1;
    }

    // Global Selection: Selected if Global Rank <= Cutoff
    row._selected = (row._globalRank || (index + 1)) <= settings.cutoff;
  });

  // 4. Build Panel Stats (aggregating selected counts after global selection)
  const allPanelStats = [];

  Object.keys(panelJudgeStats).forEach(panelId => {
    const pRows = allProcessedRows.filter(r => r._panel === panelId);

    const finalScores = pRows.map(r => r._finalScore);
    const panelMeanScore = finalScores.length > 0
      ? finalScores.reduce((a, b) => a + b, 0) / finalScores.length
      : 0;

    const rawAvgs = pRows.map(r => r._teamAvg);
    const meanTeamAvg = rawAvgs.length > 0
      ? rawAvgs.reduce((a, b) => a + b, 0) / rawAvgs.length
      : 0;

    allPanelStats.push({
      panelId,
      teamCount: pRows.length,
      selectedCount: pRows.filter(r => r._selected).length,
      meanFinalScore: panelMeanScore,
      meanTeamAvg: meanTeamAvg,
      judgeStats: panelJudgeStats[panelId]
    });
  });

  return { rows: allProcessedRows, stats: allPanelStats };
};
