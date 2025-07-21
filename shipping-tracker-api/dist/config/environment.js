"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironment = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    server: {
        port: parseInt(process.env.PORT || '3001', 10),
        nodeEnv: process.env.NODE_ENV || 'development',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
    },
    apiKeys: {
        // Major Ocean Carriers (9 providers)
        maersk: process.env.MAERSK_API_KEY || '',
        msc: process.env.MSC_API_KEY || '',
        cmaCgm: process.env.CMA_CGM_API_KEY || '',
        cosco: process.env.COSCO_API_KEY || '',
        hapagLloyd: process.env.HAPAG_LLOYD_API_KEY || '',
        evergreen: process.env.EVERGREEN_API_KEY || '',
        oneLine: process.env.ONE_LINE_API_KEY || '',
        yangMing: process.env.YANG_MING_API_KEY || '',
        zim: process.env.ZIM_API_KEY || '',
        // Container-focused Aggregators (3 providers)
        shipsgo: process.env.SHIPSGO_API_KEY || '',
        searates: process.env.SEARATES_API_KEY || '',
        project44: process.env.PROJECT44_API_KEY || '',
        // Vessel Tracking Services (2 providers)
        marineTraffic: process.env.MARINE_TRAFFIC_API_KEY || '',
        vesselFinder: process.env.VESSEL_FINDER_API_KEY || '',
        // Free Container Tracking (1 provider)
        trackTrace: process.env.TRACK_TRACE_API_KEY || ''
    },
    database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/shipping_tracker'
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
    },
    security: {
        jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key',
        apiSecretKey: process.env.API_SECRET_KEY || 'fallback-api-secret'
    }
};
// Validate required environment variables
const validateEnvironment = () => {
    const requiredVars = ['NODE_ENV'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
    }
    // Log configuration in development
    if (exports.config.server.nodeEnv === 'development') {
        console.log('🔧 Configuration loaded:', {
            port: exports.config.server.port,
            nodeEnv: exports.config.server.nodeEnv,
            frontendUrl: exports.config.server.frontendUrl,
            hasApiKeys: {
                maersk: !!exports.config.apiKeys.maersk,
                hapagLloyd: !!exports.config.apiKeys.hapagLloyd,
                msc: !!exports.config.apiKeys.msc,
                cmaCgm: !!exports.config.apiKeys.cmaCgm
            }
        });
    }
};
exports.validateEnvironment = validateEnvironment;
//# sourceMappingURL=environment.js.map