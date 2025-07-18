import { Pool, QueryResult } from 'pg';
import { pool } from '../config/database';
import { 
  ShipmentRecord, 
  CreateShipmentData, 
  UpdateShipmentData, 
  TrackingType,
  DatabaseError 
} from '../types';

export class ShipmentRepository {
  private pool: Pool;

  constructor(dbPool: Pool = pool) {
    this.pool = dbPool;
  }

  // Create a new shipment record
  async create(data: CreateShipmentData): Promise<ShipmentRecord> {
    const query = `
      INSERT INTO shipments (
        tracking_number, 
        tracking_type, 
        carrier, 
        service, 
        status, 
        data, 
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      data.tracking_number,
      data.tracking_type,
      data.carrier,
      data.service,
      data.status,
      JSON.stringify(data.data),
      data.expires_at
    ];

    try {
      const result: QueryResult<ShipmentRecord> = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Find shipment by tracking number and type
  async findByTrackingNumber(
    trackingNumber: string, 
    trackingType?: TrackingType
  ): Promise<ShipmentRecord | null> {
    let query = `
      SELECT * FROM shipments 
      WHERE tracking_number = $1
    `;
    const values: any[] = [trackingNumber];

    if (trackingType) {
      query += ` AND tracking_type = $2`;
      values.push(trackingType);
    }

    query += ` ORDER BY last_updated DESC LIMIT 1`;

    try {
      const result: QueryResult<ShipmentRecord> = await this.pool.query(query, values);
      return result.rows[0] || null;
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Find shipment by ID
  async findById(id: string): Promise<ShipmentRecord | null> {
    const query = `SELECT * FROM shipments WHERE id = $1`;

    try {
      const result: QueryResult<ShipmentRecord> = await this.pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Update shipment record
  async update(id: string, data: UpdateShipmentData): Promise<ShipmentRecord | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic update query
    if (data.carrier !== undefined) {
      updateFields.push(`carrier = $${paramCount++}`);
      values.push(data.carrier);
    }
    if (data.service !== undefined) {
      updateFields.push(`service = $${paramCount++}`);
      values.push(data.service);
    }
    if (data.status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.data !== undefined) {
      updateFields.push(`data = $${paramCount++}`);
      values.push(JSON.stringify(data.data));
    }
    if (data.expires_at !== undefined) {
      updateFields.push(`expires_at = $${paramCount++}`);
      values.push(data.expires_at);
    }

    // Always update last_updated
    updateFields.push(`last_updated = NOW()`);

    if (updateFields.length === 1) { // Only last_updated
      return this.findById(id); // No actual updates, just return current record
    }

    const query = `
      UPDATE shipments 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    try {
      const result: QueryResult<ShipmentRecord> = await this.pool.query(query, values);
      return result.rows[0] || null;
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Upsert shipment (insert or update)
  async upsert(data: CreateShipmentData): Promise<ShipmentRecord> {
    const existing = await this.findByTrackingNumber(data.tracking_number, data.tracking_type);
    
    if (existing) {
      const updateData: UpdateShipmentData = {
        carrier: data.carrier,
        service: data.service,
        status: data.status,
        data: data.data,
        expires_at: data.expires_at
      };
      const updated = await this.update(existing.id, updateData);
      return updated!;
    } else {
      return await this.create(data);
    }
  }

  // Delete shipment by ID
  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM shipments WHERE id = $1`;

    try {
      const result = await this.pool.query(query, [id]);
      return result.rowCount! > 0;
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Find shipments by carrier
  async findByCarrier(carrier: string, limit: number = 50): Promise<ShipmentRecord[]> {
    const query = `
      SELECT * FROM shipments 
      WHERE carrier = $1 
      ORDER BY last_updated DESC 
      LIMIT $2
    `;

    try {
      const result: QueryResult<ShipmentRecord> = await this.pool.query(query, [carrier, limit]);
      return result.rows;
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Find expired shipments
  async findExpired(): Promise<ShipmentRecord[]> {
    const query = `
      SELECT * FROM shipments 
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
      ORDER BY expires_at ASC
    `;

    try {
      const result: QueryResult<ShipmentRecord> = await this.pool.query(query);
      return result.rows;
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Clean up expired shipments
  async cleanupExpired(): Promise<number> {
    const query = `SELECT cleanup_expired_shipments()`;

    try {
      const result = await this.pool.query(query);
      return result.rows[0].cleanup_expired_shipments;
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Get shipment statistics
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byCarrier: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const queries = [
      'SELECT COUNT(*) as total FROM shipments',
      'SELECT tracking_type, COUNT(*) as count FROM shipments GROUP BY tracking_type',
      'SELECT carrier, COUNT(*) as count FROM shipments WHERE carrier IS NOT NULL GROUP BY carrier',
      'SELECT status, COUNT(*) as count FROM shipments WHERE status IS NOT NULL GROUP BY status'
    ];

    try {
      const [totalResult, typeResult, carrierResult, statusResult] = await Promise.all(
        queries.map(query => this.pool.query(query))
      );

      return {
        total: parseInt(totalResult.rows[0].total),
        byType: typeResult.rows.reduce((acc, row) => {
          acc[row.tracking_type] = parseInt(row.count);
          return acc;
        }, {}),
        byCarrier: carrierResult.rows.reduce((acc, row) => {
          acc[row.carrier] = parseInt(row.count);
          return acc;
        }, {}),
        byStatus: statusResult.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {})
      };
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Handle database errors
  private handleDatabaseError(error: any): DatabaseError {
    const dbError = new Error(error.message) as DatabaseError;
    dbError.code = error.code;
    dbError.detail = error.detail;
    dbError.constraint = error.constraint;
    dbError.name = 'DatabaseError';
    return dbError;
  }
}