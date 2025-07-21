export declare const config: {
    server: {
        port: number;
        nodeEnv: string;
        frontendUrl: string;
    };
    apiKeys: {
        maersk: string;
        msc: string;
        cmaCgm: string;
        cosco: string;
        hapagLloyd: string;
        evergreen: string;
        oneLine: string;
        yangMing: string;
        zim: string;
        shipsgo: string;
        searates: string;
        project44: string;
        marineTraffic: string;
        vesselFinder: string;
        trackTrace: string;
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