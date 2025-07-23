import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import {
  ChartBarIcon,
  PresentationChartLineIcon,
  ChartPieIcon,
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { ShipmentTracking } from '../../types/tracking';

interface ChartData {
  name: string;
  value: number;
  category?: string;
  date?: string;
  [key: string]: any;
}

interface InteractiveChartsComponentProps {
  data: ShipmentTracking[];
  title?: string;
  className?: string;
}

type ChartType = 'line' | 'area' | 'bar' | 'pie' | 'scatter' | 'radial';
type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';
type MetricType = 'shipments' | 'carriers' | 'routes' | 'status' | 'transit_time' | 'delays';

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export const InteractiveChartsComponent: React.FC<InteractiveChartsComponentProps> = ({
  data,
  title = 'Shipping Analytics',
  className = ''
}) => {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [metricType, setMetricType] = useState<MetricType>('shipments');
  const [showLegend, setShowLegend] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [animationEnabled, setAnimationEnabled] = useState(true);

  // Process data based on selected metric and time range
  const chartData = useMemo(() => {
    const filteredData = filterDataByTimeRange(data, timeRange);
    
    switch (metricType) {
      case 'shipments':
        return processShipmentsOverTime(filteredData);
      case 'carriers':
        return processCarrierDistribution(filteredData);
      case 'routes':
        return processTopRoutes(filteredData);
      case 'status':
        return processStatusDistribution(filteredData);
      case 'transit_time':
        return processTransitTimes(filteredData);
      case 'delays':
        return processDelayAnalysis(filteredData);
      default:
        return [];
    }
  }, [data, timeRange, metricType]);

  const filterDataByTimeRange = (shipments: ShipmentTracking[], range: TimeRange): ShipmentTracking[] => {
    if (range === 'all') return shipments;
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (range) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return shipments.filter(shipment => {
      const shipmentDate = new Date(shipment.lastUpdated);
      return shipmentDate >= cutoffDate;
    });
  };

  const processShipmentsOverTime = (shipments: ShipmentTracking[]): ChartData[] => {
    const groupedData: Record<string, number> = {};
    
    shipments.forEach(shipment => {
      const date = new Date(shipment.lastUpdated).toISOString().split('T')[0];
      groupedData[date] = (groupedData[date] || 0) + 1;
    });
    
    return Object.entries(groupedData)
      .map(([date, count]) => ({
        name: new Date(date).toLocaleDateString(),
        value: count,
        date,
      }))
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  };

  const processCarrierDistribution = (shipments: ShipmentTracking[]): ChartData[] => {
    const carrierCounts: Record<string, number> = {};
    
    shipments.forEach(shipment => {
      const carrier = shipment.carrier || 'Unknown';
      carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
    });
    
    return Object.entries(carrierCounts)
      .map(([carrier, count]) => ({
        name: carrier,
        value: count,
      }))
      .sort((a, b) => b.value - a.value);
  };

  const processTopRoutes = (shipments: ShipmentTracking[]): ChartData[] => {
    const routeCounts: Record<string, number> = {};
    
    shipments.forEach(shipment => {
      if (shipment.origin?.name && shipment.destination?.name) {
        const route = `${shipment.origin.name} → ${shipment.destination.name}`;
        routeCounts[route] = (routeCounts[route] || 0) + 1;
      }
    });
    
    return Object.entries(routeCounts)
      .map(([route, count]) => ({
        name: route,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 routes
  };

  const processStatusDistribution = (shipments: ShipmentTracking[]): ChartData[] => {
    const statusCounts: Record<string, number> = {};
    
    shipments.forEach(shipment => {
      const status = shipment.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return Object.entries(statusCounts)
      .map(([status, count]) => ({
        name: status,
        value: count,
      }))
      .sort((a, b) => b.value - a.value);
  };

  const processTransitTimes = (shipments: ShipmentTracking[]): ChartData[] => {
    const transitTimes: ChartData[] = [];
    
    shipments.forEach((shipment, index) => {
      if (shipment.departureDate && shipment.arrivalDate) {
        const departure = new Date(shipment.departureDate);
        const arrival = new Date(shipment.arrivalDate);
        const transitTime = Math.ceil((arrival.getTime() - departure.getTime()) / (1000 * 60 * 60 * 24));
        
        if (transitTime > 0 && transitTime < 365) { // Reasonable range
          transitTimes.push({
            name: `Shipment ${index + 1}`,
            value: transitTime,
            carrier: shipment.carrier,
            route: shipment.origin?.name && shipment.destination?.name 
              ? `${shipment.origin.name} → ${shipment.destination.name}`
              : 'Unknown Route',
          });
        }
      }
    });
    
    return transitTimes.sort((a, b) => a.value - b.value);
  };

  const processDelayAnalysis = (shipments: ShipmentTracking[]): ChartData[] => {
    const delayData: ChartData[] = [];
    
    shipments.forEach(shipment => {
      const hasDelay = shipment.events.some(event => 
        event.status.toLowerCase().includes('delay') || 
        event.description.toLowerCase().includes('delay')
      );
      
      const carrier = shipment.carrier || 'Unknown';
      const existingEntry = delayData.find(d => d.name === carrier);
      
      if (existingEntry) {
        existingEntry.total = (existingEntry.total || 0) + 1;
        if (hasDelay) {
          existingEntry.delayed = (existingEntry.delayed || 0) + 1;
        }
      } else {
        delayData.push({
          name: carrier,
          value: hasDelay ? 1 : 0,
          total: 1,
          delayed: hasDelay ? 1 : 0,
        });
      }
    });
    
    return delayData.map(item => ({
      ...item,
      value: item.total > 0 ? Math.round((item.delayed / item.total) * 100) : 0,
    }));
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            {showLegend && <Legend />}
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={COLORS[0]} 
              strokeWidth={2}
              dot={{ fill: COLORS[0], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              animationDuration={animationEnabled ? 1000 : 0}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            {showLegend && <Legend />}
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={COLORS[0]} 
              fill={COLORS[0]}
              fillOpacity={0.6}
              animationDuration={animationEnabled ? 1000 : 0}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            {showLegend && <Legend />}
            <Bar 
              dataKey="value" 
              fill={COLORS[0]}
              animationDuration={animationEnabled ? 1000 : 0}
            />
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart {...commonProps}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              animationDuration={animationEnabled ? 1000 : 0}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            {showLegend && <Legend />}
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            {showLegend && <Legend />}
            <Scatter 
              dataKey="value" 
              fill={COLORS[0]}
              animationDuration={animationEnabled ? 1000 : 0}
            />
          </ScatterChart>
        );

      case 'radial':
        return (
          <RadialBarChart {...commonProps} innerRadius="10%" outerRadius="80%">
            <RadialBar 
              dataKey="value" 
              cornerRadius={10} 
              fill={COLORS[0]}
              animationDuration={animationEnabled ? 1000 : 0}
            />
            <Tooltip />
            {showLegend && <Legend />}
          </RadialBarChart>
        );

      default:
        return null;
    }
  };

  const exportChart = (format: 'png' | 'svg' | 'pdf') => {
    // This would typically use a library like html2canvas or jsPDF
    console.log(`Exporting chart as ${format}`);
    alert(`Chart export as ${format.toUpperCase()} would be implemented here`);
  };

  const printChart = () => {
    window.print();
  };

  const getChartIcon = (type: ChartType) => {
    switch (type) {
      case 'line':
      case 'area':
        return <PresentationChartLineIcon className="h-4 w-4" />;
      case 'bar':
        return <ChartBarIcon className="h-4 w-4" />;
      case 'pie':
      case 'radial':
        return <ChartPieIcon className="h-4 w-4" />;
      default:
        return <ChartBarIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportChart('png')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Export as PNG"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>
            <button
              onClick={printChart}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Print Chart"
            >
              <PrinterIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Chart Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chart Type
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['line', 'bar', 'pie'] as ChartType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`p-2 rounded border text-xs flex items-center justify-center gap-1 transition-colors ${
                    chartType === type
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {getChartIcon(type)}
                  {type}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {(['area', 'scatter', 'radial'] as ChartType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`p-2 rounded border text-xs flex items-center justify-center gap-1 transition-colors ${
                    chartType === type
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {getChartIcon(type)}
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="all">All time</option>
            </select>
          </div>

          {/* Metric Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metric
            </label>
            <select
              value={metricType}
              onChange={(e) => setMetricType(e.target.value as MetricType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="shipments">Shipments Over Time</option>
              <option value="carriers">Carrier Distribution</option>
              <option value="routes">Top Routes</option>
              <option value="status">Status Distribution</option>
              <option value="transit_time">Transit Times</option>
              <option value="delays">Delay Analysis</option>
            </select>
          </div>

          {/* Chart Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showLegend}
                  onChange={(e) => setShowLegend(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700">Show Legend</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700">Show Grid</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={animationEnabled}
                  onChange={(e) => setAnimationEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700">Animation</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        {chartData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No data available for the selected criteria</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {chartData.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {chartData.length}
              </div>
              <div className="text-sm text-gray-600">Data Points</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.max(...chartData.map(d => d.value))}
              </div>
              <div className="text-sm text-gray-600">Maximum</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length)}
              </div>
              <div className="text-sm text-gray-600">Average</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {chartData.reduce((sum, d) => sum + d.value, 0)}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};