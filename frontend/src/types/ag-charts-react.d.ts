declare module 'ag-charts-react' {
  import type { ForwardRefExoticComponent, RefAttributes } from 'react';
  import type { AgChartInstance, AgChartOptions } from 'ag-charts-community';

  export interface AgChartsReactProps {
    options: AgChartOptions;
    className?: string;
    style?: React.CSSProperties;
  }

  export interface AgChartsReactRef {
    chart?: AgChartInstance;
  }

  export const AgChartsReact: ForwardRefExoticComponent<
    AgChartsReactProps & RefAttributes<AgChartsReactRef>
  >;
}
