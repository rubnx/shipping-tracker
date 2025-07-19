import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { useTrackingStore } from '../store';
import type { TrackingType, ShipmentTracking } from '../types';

// Query keys
export const queryKeys = {
  shipments: ['shipments'] as const,
  shipment: (trackingNumber: string) => ['shipments', trackingNumber] as const,
  validation: (trackingNumber: string) => ['validation', trackingNumber] as const,
  health: ['health'] as const,
} as const;

// Validation query
export const useValidateTrackingNumber = (trackingNumber: string) => {
  return useQuery({
    queryKey: queryKeys.validation(trackingNumber),
    queryFn: () => apiClient.validateTrackingNumber(trackingNumber),
    enabled: trackingNumber.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

// Shipment search query
export const useSearchShipment = (
  trackingNumber: string,
  type?: TrackingType,
  enabled: boolean = true
) => {
  const { cacheShipment, getCachedShipment } = useTrackingStore();

  return useQuery({
    queryKey: queryKeys.shipment(trackingNumber),
    queryFn: async () => {
      // Check cache first
      const cached = getCachedShipment(trackingNumber);
      if (cached) {
        return cached;
      }

      // Fetch from API
      const shipment = await apiClient.searchShipment(trackingNumber, type);
      
      // Cache the result
      cacheShipment(trackingNumber, shipment);
      
      return shipment;
    },
    enabled: enabled && trackingNumber.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on validation errors
      if (error instanceof Error && error.message.includes('400')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Shipment details query
export const useShipmentDetails = (trackingNumber: string) => {
  const { cacheShipment, getCachedShipment } = useTrackingStore();

  return useQuery({
    queryKey: queryKeys.shipment(trackingNumber),
    queryFn: async () => {
      // Check cache first
      const cached = getCachedShipment(trackingNumber);
      if (cached) {
        return cached;
      }

      // Fetch from API
      const shipment = await apiClient.getShipmentDetails(trackingNumber);
      
      // Cache the result
      cacheShipment(trackingNumber, shipment);
      
      return shipment;
    },
    enabled: trackingNumber.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Refresh shipment mutation
export const useRefreshShipment = () => {
  const queryClient = useQueryClient();
  const { cacheShipment } = useTrackingStore();

  return useMutation({
    mutationFn: (trackingNumber: string) => 
      apiClient.refreshShipment(trackingNumber),
    onSuccess: (data, trackingNumber) => {
      // Update cache
      cacheShipment(trackingNumber, data);
      
      // Invalidate and refetch
      queryClient.setQueryData(queryKeys.shipment(trackingNumber), data);
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.shipment(trackingNumber) 
      });
    },
    onError: (error) => {
      console.error('Failed to refresh shipment:', error);
    },
  });
};

// Batch shipments query
export const useBatchShipments = (trackingNumbers: string[]) => {
  return useQuery({
    queryKey: ['shipments', 'batch', ...trackingNumbers.sort()],
    queryFn: () => apiClient.getShipments(trackingNumbers),
    enabled: trackingNumbers.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Health check query
export const useHealthCheck = () => {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiClient.healthCheck(),
    refetchInterval: 30 * 1000, // 30 seconds
    retry: 1,
  });
};

// Custom hook for search with state management
export const useTrackingSearch = () => {
  const {
    searchQuery,
    searchType,
    isSearching,
    searchError,
    setIsSearching,
    setSearchError,
    setCurrentShipment,
    addToSearchHistory,
  } = useTrackingStore();

  const queryClient = useQueryClient();

  const searchMutation = useMutation({
    mutationFn: ({ trackingNumber, type }: { 
      trackingNumber: string; 
      type?: TrackingType 
    }) => apiClient.searchShipment(trackingNumber, type),
    onMutate: () => {
      setIsSearching(true);
      setSearchError(null);
    },
    onSuccess: (data, variables) => {
      setCurrentShipment(data);
      addToSearchHistory({
        trackingNumber: variables.trackingNumber,
        trackingType: variables.type || 'container',
        carrier: data.carrier,
      });
      
      // Cache the result
      queryClient.setQueryData(
        queryKeys.shipment(variables.trackingNumber), 
        data
      );
    },
    onError: (error) => {
      setSearchError(error instanceof Error ? error.message : 'Search failed');
    },
    onSettled: () => {
      setIsSearching(false);
    },
  });

  const search = (trackingNumber: string, type?: TrackingType) => {
    searchMutation.mutate({ trackingNumber, type });
  };

  return {
    search,
    isSearching: isSearching || searchMutation.isPending,
    error: searchError || searchMutation.error?.message,
    data: searchMutation.data,
    reset: () => {
      searchMutation.reset();
      setSearchError(null);
    },
  };
};