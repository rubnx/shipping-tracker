export declare const config: {
    server: {
        port: number;
        nodeEnv: string;
        frontendUrl: string;
    };
    apiKeys: {
        maersk: string;
        hapagLloyd: string;
        msc: string;
        cmaCgm: string;
    };
    database: {
        url: string;
    };
    redis: {
        url: string;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    security: {
        jwtSecret: string;
        apiSecretKey: string;
    };
};
export declare const validateEnvironment: () => void;
//# sourceMappingURL=environment.d.ts.map