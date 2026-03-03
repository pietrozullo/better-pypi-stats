export interface PyPIRecentDownloads {
  data: {
    last_day: number;
    last_month: number;
    last_week: number;
  };
  package: string;
  type: string;
}

export interface PyPIOverallData {
  data: {
    category: string;
    date: string;
    downloads: number;
  }[];
  package: string;
  type: string;
}

export interface PyPIPythonVersionData {
  data: {
    category: string;
    date: string;
    downloads: number;
  }[];
  package: string;
  type: string;
}

export interface PyPISystemData {
  data: {
    category: string;
    date: string;
    downloads: number;
  }[];
  package: string;
  type: string;
}

// A daily time series where each date has values per category
// e.g. { date: "2024-01-15", Linux: 5000, Windows: 3000, Darwin: 2000 }
export type BreakdownTimeSeries = Record<string, string | number>[];

export interface PackageStats {
  name: string;
  recentDownloads: {
    lastDay: number;
    lastWeek: number;
    lastMonth: number;
  };
  dailyDownloads: { date: string; downloads: number }[];
  systemBreakdown: { name: string; value: number }[];
  pythonVersionBreakdown: { name: string; value: number }[];
  pythonMinorBreakdown: { name: string; value: number }[];
  // Time series breakdowns for the main chart
  systemTimeSeries: { data: BreakdownTimeSeries; categories: string[] };
  pythonVersionTimeSeries: { data: BreakdownTimeSeries; categories: string[] };
  pythonMinorTimeSeries: { data: BreakdownTimeSeries; categories: string[] };
  versionTimeSeries?: { data: BreakdownTimeSeries; categories: string[] };
}

export interface ComparePackage {
  name: string;
  color: string;
  dailyDownloads: { date: string; downloads: number }[];
  recentDownloads: {
    lastDay: number;
    lastWeek: number;
    lastMonth: number;
  };
}
