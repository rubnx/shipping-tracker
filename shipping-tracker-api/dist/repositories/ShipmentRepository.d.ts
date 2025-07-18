import { Pool } from 'pg';
import { ShipmentRecord, CreateShipmentData, UpdateShipmentData, TrackingType } from '../types';
export declare class ShipmentRepository {
    private pool;
    constructor(dbPool?: Pool);
    create(data: CreateShipmentData): Promise<ShipmentRecord>;
    findByTrackingNumber(trackingNumber: string, trackingType?: TrackingType): Promise<ShipmentRecord | null>;
    findById(id: string): Promise<ShipmentRecord | null>;
    update(id: string, data: UpdateShipmentData): Promise<ShipmentRecord | null>;
    upsert(data: CreateShipmentData): Promise<ShipmentRecord>;
    delete(id: string): Promise<boolean>;
    findByCarrier(carrier: string, limit?: number): Promise<ShipmentRecord[]>;
    findExpired(): Promise<ShipmentRecord[]>;
    cleanupExpired(): Promise<number>;
    getStats(): Promise<{
        total: number;
        byType: Record<string, number>;
        byCarrier: Record<string, number>;
        byStatus: Record<string, number>;
    }>;
    private handleDatabaseError;
}
//# sourceMappingURL=ShipmentRepository.d.ts.map