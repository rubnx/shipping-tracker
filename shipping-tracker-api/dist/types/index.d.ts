export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp: string;
}
export type TrackingType = 'booking' | 'container' | 'bol';
export interface TrackingRequest {
    trackingNumber: string;
    type?: TrackingType;
}
export interface TrackingResponse {
    trackingNumber: string;
    trackingType: TrackingType;
    carrier: string;
    status: string;
    lastUpdated: string;
}
export interface ApiError {
    code: string;
    message: string;
    details?: any;
}
//# sourceMappingURL=index.d.ts.map