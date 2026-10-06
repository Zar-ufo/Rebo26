// Programmatic calculation of column statistics for CSV/Excel data
export function calculateColumnStats(rows: Array<Record<string, any>>): any[] {
  if (!rows || rows.length === 0) return [];

  const columns = Object.keys(rows[0]);
  const columnStats: any[] = [];

  for (const col of columns) {
    const rawValues = rows.map(r => r[col]);
    const totalCount = rawValues.length;

    const missingValues = rawValues.filter(val => {
      if (val === null || val === undefined) return true;
      const str = String(val).trim().toLowerCase();
      return str === '' || str === 'null' || str === 'n/a' || str === 'na' || str === 'none' || str === '-';
    });
    const missingCount = missingValues.length;
    const missingPercentage = Number(((missingCount / totalCount) * 100).toFixed(2));

    const validValues = rawValues.filter(val => {
      if (val === null || val === undefined) return false;
      const str = String(val).trim().toLowerCase();
      return str !== '' && str !== 'null' && str !== 'n/a' && str !== 'na' && str !== 'none' && str !== '-';
    });

    const numericValues: number[] = [];
    const categoryCounts: Record<string, number> = {};

    for (const val of validValues) {
      const num = Number(val);
      if (!isNaN(num) && typeof val !== 'boolean') {
        numericValues.push(num);
      } else {
        const catStr = String(val).trim();
        categoryCounts[catStr] = (categoryCounts[catStr] || 0) + 1;
      }
    }

    const validCount = validValues.length;
    const numericPercentage = validCount > 0 ? (numericValues.length / validCount) * 100 : 0;
    const isNumeric = numericPercentage > 50;

    if (isNumeric && numericValues.length > 0) {
      numericValues.sort((a, b) => a - b);
      const min = numericValues[0];
      const max = numericValues[numericValues.length - 1];
      const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
      const mean = Number((sum / numericValues.length).toFixed(4));

      let median = 0;
      const half = Math.floor(numericValues.length / 2);
      if (numericValues.length % 2 !== 0) {
        median = numericValues[half];
      } else {
        median = (numericValues[half - 1] + numericValues[half]) / 2.0;
      }
      median = Number(median.toFixed(4));

      const ranges: Record<string, number> = {};
      numericValues.forEach(n => {
        const bin = Math.floor(n / (max - min || 1) * 5) * (max - min || 1) / 5 + min;
        const binStr = bin.toFixed(2);
        ranges[binStr] = (ranges[binStr] || 0) + 1;
      });

      const percentages: Record<string, number> = {};
      Object.entries(ranges).forEach(([k, v]) => {
        percentages[k] = Number(((v / numericValues.length) * 100).toFixed(2));
      });

      columnStats.push({
        columnName: col,
        type: 'numeric',
        mean,
        median,
        min,
        max,
        percentages,
        frequency: ranges,
        missingCount,
        missingPercentage
      });
    } else {
      const freqMap: Record<string, number> = {};
      validValues.forEach(val => {
        const str = String(val).trim();
        freqMap[str] = (freqMap[str] || 0) + 1;
      });

      const sortedCategories = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
      const topCategories = sortedCategories.slice(0, 15);
      const otherCount = sortedCategories.slice(15).reduce((sum, curr) => sum + curr[1], 0);

      const finalFreq: Record<string, number> = {};
      const percentages: Record<string, number> = {};

      topCategories.forEach(([cat, count]) => {
        finalFreq[cat] = count;
        percentages[cat] = Number(((count / validCount) * 100).toFixed(2));
      });

      if (otherCount > 0) {
        finalFreq['Other'] = otherCount;
        percentages['Other'] = Number(((otherCount / validCount) * 100).toFixed(2));
      }

      columnStats.push({
        columnName: col,
        type: 'categorical',
        percentages,
        frequency: finalFreq,
        missingCount,
        missingPercentage
      });
    }
  }

  return columnStats;
}
