// Component-specific type definitions

import type { 
  TrackingType, 
  TimelineEvent, 
  RouteInfo, 
  Port, 
  ShipmentTracking, 
  LatLng,
  LoadingState,
  SearchHistoryItem 
} from './index';

// Search Component Types
export interface SearchComponentProps {
  onSearch: (query: string, type: TrackingType) => void;
  isLoading: boolean;
  recentSearches: SearchHistoryItem[];
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export interface SearchComponentState {
  query: string;
  detectedType: TrackingType | null;
  validationError: string | null;
  showSuggestions: boolean;
  selectedSuggestionIndex: number;
}

// Timeline Component Types
export interface TimelineComponentProps {
  events: TimelineEvent[];
  currentStatus: string;
  completionPercentage: number;
  isLoading?: boolean;
  className?: string;
  showProgress?: boolean;
  compact?: boolean;
}

export interface TimelineItemProps {
  event: TimelineEvent;
  isLast: boolean;
  isActive: boolean;
  showTime?: boolean;
}

// Map Component Types
export interface MapComponentProps {
  route: RouteInfo;
  vesselPosition?: LatLng;
  ports: Port[];
  onMarkerClick: (location: Port) => void;
  height?: string | number;
  className?: string;
  showControls?: boolean;
  interactive?: boolean;
}

export interface MapMarkerProps {
  position: LatLng;
  title: string;
  type: 'origin' | 'destination' | 'intermediate' | 'vessel';
  onClick?: () => void;
  icon?: string;
}

// Shipment Details Component Types
export interface ShipmentDetailsProps {
  shipment: ShipmentTracking;
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void;
  className?: string;
  showActions?: boolean;
}

export interface ShipmentSummaryProps {
  shipment: ShipmentTracking;
  compact?: boolean;
}

export interface ContainerDetailsProps {
  containers: ShipmentTracking['containers'];
  showAll?: boolean;
}

export interface VesselInfoProps {
  vessel: ShipmentTracking['vessel'];
  showPosition?: boolean;
}

// Loading Component Types
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  animate?: boolean;
}

export interface LoadingStateProps {
  state: LoadingState;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  children: React.ReactNode;
}

// Error Boundary Types
export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

// Form Component Types
export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'tel' | 'password';
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
  onChange?: (value: string) => void;
}

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

// Modal and Dialog Types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

// Notification Types
export interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose?: () => void;
}

export interface ToastProps extends Omit<NotificationProps, 'id'> {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// Layout Component Types
export interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  onSearchToggle?: () => void;
  className?: string;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export interface PageLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}

// Table Component Types
export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex: keyof T;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  rowKey?: keyof T | ((record: T) => string);
  className?: string;
}

// Filter and Sort Types
export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface SortOption {
  label: string;
  value: string;
  direction: 'asc' | 'desc';
}

export interface FilterProps {
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  title?: string;
  searchable?: boolean;
}

// Responsive Types
export interface ResponsiveProps {
  mobile?: React.ReactNode;
  tablet?: React.ReactNode;
  desktop?: React.ReactNode;
  children?: React.ReactNode;
}

export interface BreakpointProps {
  xs?: boolean;
  sm?: boolean;
  md?: boolean;
  lg?: boolean;
  xl?: boolean;
}