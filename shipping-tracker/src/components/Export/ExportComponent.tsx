import React, { useState } from 'react';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
  DocumentIcon,
  PrinterIcon,
  ShareIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { ShipmentTracking } from '../../types/tracking';

interface ExportComponentProps {
  data: ShipmentTracking[];
  title?: string;
  className?: string;
}

type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'xml';
type ExportType = 'summary' | 'detailed' | 'timeline' | 'custom';

interface ExportOptions {
  format: ExportFormat;
  type: ExportType;
  includeCharts: boolean;
  includeTimeline: boolean;
  includeVesselInfo: boolean;
  includeContainerDetails: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  selectedFields: string[];
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const AVAILABLE_FIELDS = [
  { key: 'trackingNumber', label: 'Tracking Number', category: 'basic' },
  { key: 'carrier', label: 'Carrier', category: 'basic' },
  { key: 'status', label: 'Status', category: 'basic' },
  { key: 'origin', label: 'Origin', category: 'route' },
  { key: 'destination', label: 'Destination', category: 'route' },
  { key: 'departureDate', label: 'Departure Date', category: 'dates' },
  { key: 'arrivalDate', label: 'Arrival Date', category: 'dates' },
  { key: 'vessel', label: 'Vessel Information', category: 'vessel' },
  { key: 'containers', label: 'Container Details', category: 'containers' },
  { key: 'events', label: 'Timeline Events', category: 'events' },
  { key: 'lastUpdated', label: 'Last Updated', category: 'dates' },
];

export const ExportComponent: React.FC<ExportComponentProps> = ({
  data,
  title = 'Shipment Data',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    type: 'summary',
    includeCharts: true,
    includeTimeline: true,
    includeVesselInfo: true,
    includeContainerDetails: true,
    selectedFields: ['trackingNumber', 'carrier', 'status', 'origin', 'destination'],
    sortBy: 'lastUpdated',
    sortOrder: 'desc',
  });

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const exportData = prepareExportData();
      
      switch (exportOptions.format) {
        case 'pdf':
          await exportToPDF(exportData);
          break;
        case 'excel':
          await exportToExcel(exportData);
          break;
        case 'csv':
          await exportToCSV(exportData);
          break;
        case 'json':
          await exportToJSON(exportData);
          break;
        case 'xml':
          await exportToXML(exportData);
          break;
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const prepareExportData = () => {
    let filteredData = [...data];
    
    // Apply date range filter
    if (exportOptions.dateRange) {
      const startDate = new Date(exportOptions.dateRange.start);
      const endDate = new Date(exportOptions.dateRange.end);
      
      filteredData = filteredData.filter(shipment => {
        const shipmentDate = new Date(shipment.lastUpdated);
        return shipmentDate >= startDate && shipmentDate <= endDate;
      });
    }
    
    // Apply sorting
    if (exportOptions.sortBy) {
      filteredData.sort((a, b) => {
        const aValue = getNestedValue(a, exportOptions.sortBy!);
        const bValue = getNestedValue(b, exportOptions.sortBy!);
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
        
        return exportOptions.sortOrder === 'desc' ? -comparison : comparison;
      });
    }
    
    // Transform data based on selected fields
    return filteredData.map(shipment => {
      const exportItem: any = {};
      
      exportOptions.selectedFields.forEach(field => {
        switch (field) {
          case 'origin':
            exportItem.origin = shipment.origin?.name || '';
            exportItem.originCode = shipment.origin?.code || '';
            break;
          case 'destination':
            exportItem.destination = shipment.destination?.name || '';
            exportItem.destinationCode = shipment.destination?.code || '';
            break;
          case 'vessel':
            if (exportOptions.includeVesselInfo && shipment.vessel) {
              exportItem.vesselName = shipment.vessel.name;
              exportItem.vesselIMO = shipment.vessel.imo;
              exportItem.voyage = shipment.vessel.voyage;
            }
            break;
          case 'containers':
            if (exportOptions.includeContainerDetails && shipment.containers) {
              exportItem.containerCount = shipment.containers.length;
              exportItem.containerNumbers = shipment.containers.map(c => c.number).join(', ');
              exportItem.containerTypes = shipment.containers.map(c => c.type).join(', ');
            }
            break;
          case 'events':
            if (exportOptions.includeTimeline && shipment.events) {
              exportItem.eventCount = shipment.events.length;
              exportItem.latestEvent = shipment.events[0]?.description || '';
              exportItem.latestEventDate = shipment.events[0]?.timestamp || '';
            }
            break;
          default:
            exportItem[field] = getNestedValue(shipment, field);
        }
      });
      
      return exportItem;
    });
  };

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const exportToPDF = async (data: any[]) => {
    // This would typically use a library like jsPDF or Puppeteer
    const content = generatePDFContent(data);
    
    // Mock PDF generation
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = async (data: any[]) => {
    // This would typically use a library like SheetJS
    const csvContent = generateCSVContent(data);
    
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = async (data: any[]) => {
    const csvContent = generateCSVContent(data);
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = async (data: any[]) => {
    const jsonContent = JSON.stringify({
      title,
      exportDate: new Date().toISOString(),
      options: exportOptions,
      data,
    }, null, 2);
    
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToXML = async (data: any[]) => {
    const xmlContent = generateXMLContent(data);
    
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generatePDFContent = (data: any[]): string => {
    // This would generate actual PDF content
    return `PDF Report: ${title}\nGenerated: ${new Date().toLocaleString()}\n\nData: ${JSON.stringify(data, null, 2)}`;
  };

  const generateCSVContent = (data: any[]): string => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  };

  const generateXMLContent = (data: any[]): string => {
    const xmlRows = data.map(item => {
      const fields = Object.entries(item)
        .map(([key, value]) => `    <${key}>${value || ''}</${key}>`)
        .join('\n');
      return `  <shipment>\n${fields}\n  </shipment>`;
    }).join('\n');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<export>
  <title>${title}</title>
  <exportDate>${new Date().toISOString()}</exportDate>
  <shipments>
${xmlRows}
  </shipments>
</export>`;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = generatePrintContent();
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const generatePrintContent = (): string => {
    const exportData = prepareExportData();
    
    const tableRows = exportData.map(item => {
      const cells = exportOptions.selectedFields.map(field => {
        const value = item[field] || '';
        return `<td class="border border-gray-300 px-2 py-1">${value}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    
    const tableHeaders = exportOptions.selectedFields.map(field => {
      const fieldConfig = AVAILABLE_FIELDS.find(f => f.key === field);
      return `<th class="border border-gray-300 px-2 py-1 bg-gray-100">${fieldConfig?.label || field}</th>`;
    }).join('');
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Print Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .header { margin-bottom: 20px; }
            .summary { margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          <div class="summary">
            <p><strong>Total Records:</strong> ${exportData.length}</p>
            <p><strong>Export Type:</strong> ${exportOptions.type}</p>
          </div>
          <table>
            <thead>
              <tr>${tableHeaders}</tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Shipping tracking data with ${data.length} shipments`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      const shareText = `${title}\n${window.location.href}\n\nShipment data with ${data.length} records`;
      navigator.clipboard.writeText(shareText);
      alert('Link copied to clipboard!');
    }
  };

  const copyToClipboard = () => {
    const exportData = prepareExportData();
    const textContent = exportData.map(item => 
      exportOptions.selectedFields.map(field => `${field}: ${item[field] || ''}`).join(', ')
    ).join('\n');
    
    navigator.clipboard.writeText(textContent);
    alert('Data copied to clipboard!');
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'pdf':
        return <DocumentIcon className="h-4 w-4" />;
      case 'excel':
      case 'csv':
        return <TableCellsIcon className="h-4 w-4" />;
      case 'json':
      case 'xml':
        return <DocumentTextIcon className="h-4 w-4" />;
      default:
        return <DocumentIcon className="h-4 w-4" />;
    }
  };

  if (!isOpen) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Export
        </button>
        
        <button
          onClick={handlePrint}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          title="Print"
        >
          <PrinterIcon className="h-4 w-4" />
        </button>
        
        <button
          onClick={handleShare}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          title="Share"
        >
          <ShareIcon className="h-4 w-4" />
        </button>
        
        <button
          onClick={copyToClipboard}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          title="Copy to Clipboard"
        >
          <ClipboardDocumentIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Export Data</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Format Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Export Format</h3>
              <div className="grid grid-cols-2 gap-3">
                {(['pdf', 'excel', 'csv', 'json', 'xml'] as ExportFormat[]).map(format => (
                  <button
                    key={format}
                    onClick={() => setExportOptions({ ...exportOptions, format })}
                    className={`p-3 border rounded-lg flex items-center gap-2 transition-colors ${
                      exportOptions.format === format
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {getFormatIcon(format)}
                    <span className="font-medium">{format.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Export Type */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Export Type</h3>
              <div className="space-y-2">
                {(['summary', 'detailed', 'timeline', 'custom'] as ExportType[]).map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="radio"
                      name="exportType"
                      value={type}
                      checked={exportOptions.type === type}
                      onChange={(e) => setExportOptions({ ...exportOptions, type: e.target.value as ExportType })}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="capitalize">{type} Report</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Export Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeCharts}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeCharts: e.target.checked })}
                    className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Include Charts
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeTimeline}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeTimeline: e.target.checked })}
                    className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Include Timeline
                </label>
              </div>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeVesselInfo}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeVesselInfo: e.target.checked })}
                    className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Include Vessel Info
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeContainerDetails}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeContainerDetails: e.target.checked })}
                    className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Include Container Details
                </label>
              </div>
            </div>
          </div>

          {/* Field Selection */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Fields to Include</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {AVAILABLE_FIELDS.map(field => (
                <label key={field.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.selectedFields.includes(field.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExportOptions({
                          ...exportOptions,
                          selectedFields: [...exportOptions.selectedFields, field.key]
                        });
                      } else {
                        setExportOptions({
                          ...exportOptions,
                          selectedFields: exportOptions.selectedFields.filter(f => f !== field.key)
                        });
                      }
                    }}
                    className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Date Range (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={exportOptions.dateRange?.start || ''}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    dateRange: {
                      ...exportOptions.dateRange,
                      start: e.target.value,
                      end: exportOptions.dateRange?.end || ''
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={exportOptions.dateRange?.end || ''}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    dateRange: {
                      start: exportOptions.dateRange?.start || '',
                      end: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {data.length} records will be exported
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || exportOptions.selectedFields.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Export {exportOptions.format.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};