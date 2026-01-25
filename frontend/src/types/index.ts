export interface Rate {
  source_name: string;
  rate: number;
  timestamp: string;
}

export interface TrendData {
  period_days: number;
  data: {
    [source: string]: Array<{
      timestamp: string;
      rate: number;
    }>;
  };
}

export interface ConversionResult {
  sgd_amount: number;
  myr_amount: number;
  rate: number;
  source: string;
  timestamp: string;
}
