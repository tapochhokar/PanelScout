# PanelScout

PanelScout is a tool for standardizing and ranking teams across multiple judging panels. It uses Z-score normalization to adjust for variations in leniency or strictness between different judges or panels.

## How It Works

The scoring algorithm ensures fairness when different groups of teams (panels) are evaluated by different sets of judges.

### 1. Panel Grouping
Teams are grouped into "Panels". A panel is a set of teams judged by the same group of judges.
- **Explicit**: You can provide a "Panel" column in your CSV.
- **Auto-detected**: If no panel column is provided, the system groups teams based on the set of judges that scored them (e.g., all teams scored by Judge A, B, and C form one panel).

### 2. Standardization (Z-Scores)
Raw scores from judges are converted into Z-scores to normalize them. This allows us to compare "apples to oranges" by calculating how many standard deviations a score is from that specific judge's mean.

For each Judge ($j$) within a specific Panel:
1.  **Calculate Mean ($\mu$)**: The average score given by this judge to all teams in this panel.
2.  **Calculate Standard Deviation ($\sigma$)**: The population standard deviation of the scores.
3.  **Calculate Z-Score ($z$)**:
    $$z = \frac{(x - \mu)}{\sigma}$$
    Where $x$ is the raw score given to a specific team.

If a judge's standard deviation is 0 (all scores are identical), the Z-score is set to 0.

### 3. Final Scoring
A team's **Final Score** is the sum of all their Z-scores from all judges.
$$\text{Final Score} = \sum z_{judge}$$

*Note: Since teams in the same panel are judged by the same number of judges, summing Z-scores is mathematically equivalent to averaging them for ranking purposes within the panel.*

### 4. Ranking
- **Panel Rank**: Teams are ranked within their panel based on their Final Score (highest to lowest).
- **Global Rank**: All teams from all panels are combined, sorted by their Final Score, and assigned a Global Rank. This allows for fair comparison across different panels.

### 5. Selection
Teams are marked as "Selected" if their Global Rank is less than or equal to the configurable **Cutoff** (default: top 42).
