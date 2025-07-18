const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/shipping_tracker',
  ssl: false
});

async function testDatabaseOperations() {
  console.log('🧪 Testing database operations...\n');

  try {
    // Test connection
    console.log('1. Testing database connection...');
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful\n');

    // Test shipments table operations
    console.log('2. Testing shipments table operations...');
    
    // Insert test shipment
    const testShipment = {
      tracking_number: 'TEST123456789',
      tracking_type: 'container',
      carrier: 'Test Carrier',
      service: 'FCL',
      status: 'In Transit',
      data: JSON.stringify({
        origin: 'Shanghai',
        destination: 'Los Angeles',
        vessel: 'Test Vessel'
      }),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    };

    const insertQuery = `
      INSERT INTO shipments (tracking_number, tracking_type, carrier, service, status, data, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const insertResult = await pool.query(insertQuery, [
      testShipment.tracking_number,
      testShipment.tracking_type,
      testShipment.carrier,
      testShipment.service,
      testShipment.status,
      testShipment.data,
      testShipment.expires_at
    ]);

    console.log('✅ Shipment inserted:', insertResult.rows[0].id);

    // Query shipment
    const selectQuery = 'SELECT * FROM shipments WHERE tracking_number = $1';
    const selectResult = await pool.query(selectQuery, [testShipment.tracking_number]);
    console.log('✅ Shipment retrieved:', selectResult.rows.length, 'record(s)');

    // Update shipment
    const updateQuery = `
      UPDATE shipments 
      SET status = $1, last_updated = NOW() 
      WHERE tracking_number = $2 
      RETURNING *
    `;
    const updateResult = await pool.query(updateQuery, ['Delivered', testShipment.tracking_number]);
    console.log('✅ Shipment updated, new status:', updateResult.rows[0].status);

    console.log('');

    // Test search history operations
    console.log('3. Testing search_history table operations...');
    
    const testSession = uuidv4();
    
    // Use the upsert function
    const upsertQuery = 'SELECT upsert_search_history($1, $2, $3)';
    await pool.query(upsertQuery, [testShipment.tracking_number, 'container', testSession]);
    console.log('✅ Search history upserted');

    // Query search history
    const historyQuery = 'SELECT * FROM search_history WHERE user_session = $1';
    const historyResult = await pool.query(historyQuery, [testSession]);
    console.log('✅ Search history retrieved:', historyResult.rows.length, 'record(s)');
    console.log('   Search count:', historyResult.rows[0].search_count);

    // Test upsert again (should increment count)
    await pool.query(upsertQuery, [testShipment.tracking_number, 'container', testSession]);
    const historyResult2 = await pool.query(historyQuery, [testSession]);
    console.log('✅ Search history updated, new count:', historyResult2.rows[0].search_count);

    console.log('');

    // Test cleanup function
    console.log('4. Testing cleanup function...');
    const cleanupResult = await pool.query('SELECT cleanup_expired_shipments()');
    console.log('✅ Cleanup function executed, deleted:', cleanupResult.rows[0].cleanup_expired_shipments, 'expired records');

    console.log('');

    // Clean up test data
    console.log('5. Cleaning up test data...');
    await pool.query('DELETE FROM shipments WHERE tracking_number = $1', [testShipment.tracking_number]);
    await pool.query('DELETE FROM search_history WHERE user_session = $1', [testSession]);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All database tests passed successfully!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run tests
testDatabaseOperations();