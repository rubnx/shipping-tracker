-- Initial database schema for shipping tracker application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shipments table for caching tracking data
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_number VARCHAR(50) NOT NULL,
  tracking_type VARCHAR(20) NOT NULL CHECK (tracking_type IN ('booking', 'container', 'bol')),
  carrier VARCHAR(100),
  service VARCHAR(10) CHECK (service IN ('FCL', 'LCL')),
  status VARCHAR(50),
  data JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT unique_tracking_number UNIQUE (tracking_number, tracking_type)
);

-- Create indexes for shipments table
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_type ON shipments(tracking_type);
CREATE INDEX IF NOT EXISTS idx_shipments_carrier ON shipments(carrier);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_last_updated ON shipments(last_updated);
CREATE INDEX IF NOT EXISTS idx_shipments_expires_at ON shipments(expires_at);

-- Search history for user experience
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_number VARCHAR(50) NOT NULL,
  tracking_type VARCHAR(20) CHECK (tracking_type IN ('booking', 'container', 'bol')),
  search_count INTEGER DEFAULT 1,
  last_searched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_session VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate entries per session
  CONSTRAINT unique_search_per_session UNIQUE (tracking_number, user_session)
);

-- Create indexes for search_history table
CREATE INDEX IF NOT EXISTS idx_search_history_tracking_number ON search_history(tracking_number);
CREATE INDEX IF NOT EXISTS idx_search_history_user_session ON search_history(user_session);
CREATE INDEX IF NOT EXISTS idx_search_history_last_searched ON search_history(last_searched);

-- API usage tracking for rate limiting
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_provider VARCHAR(50) NOT NULL,
  endpoint VARCHAR(200),
  requests_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rate_limit_remaining INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for api_usage table
CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage(api_provider);
CREATE INDEX IF NOT EXISTS idx_api_usage_window_start ON api_usage(window_start);

-- Function to clean up expired shipment data
CREATE OR REPLACE FUNCTION cleanup_expired_shipments()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM shipments 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update search history
CREATE OR REPLACE FUNCTION upsert_search_history(
  p_tracking_number VARCHAR(50),
  p_tracking_type VARCHAR(20),
  p_user_session VARCHAR(100)
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO search_history (tracking_number, tracking_type, user_session, search_count, last_searched)
  VALUES (p_tracking_number, p_tracking_type, p_user_session, 1, NOW())
  ON CONFLICT (tracking_number, user_session)
  DO UPDATE SET
    search_count = search_history.search_count + 1,
    last_searched = NOW(),
    tracking_type = p_tracking_type;
END;
$$ LANGUAGE plpgsql;