export interface StatCard {
  title: string;
  value: string;
  change: number;
  icon: string;
  color: string;
}

export interface RevenueData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
}

export interface TrafficData {
  labels: string[];
  data: number[];
}

export interface ProjectStatus {
  icon: string;
  title: string;
  subtitle: string;
  percentage: number;
  chartLabels: string[];
  chartData: number[];
}
