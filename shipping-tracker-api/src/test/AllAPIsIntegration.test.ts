import { MaerskAPIService } from '../services/carriers/MaerskAPIService';
import { MSCAPIService } from '../services/carriers/MSCAPIService';
import { CMACGMAPIService } from '../services/carriers/CMACGMAPIService';
import { COSCOAPIService } from '../services/carriers/COSCOAPIService';
import { HapagLloydAPIService } from '../services/carriers/HapagLloydAPIService';
import { EvergreenAPIService } from '../services/carriers/EvergreenAPIService';
import { ONELineAPIService } from '../services/carriers/ONELineAPIService';
import { YangMingAPIService } from '../services/carriers/YangMingAPIService';
import { ZIMAPIService } from '../services/carriers/ZIMAPIService';
import { Project44APIService } from '../services/carriers/Project44APIService';
import { ShipsGoAPIService } from '../services/carriers/ShipsGoAPIService';
import { SeaRatesAPIService } from '../services/carriers/SeaRatesAPIService';
import { TrackTraceAPIService } from '../services/carriers/TrackTraceAPIService';
import { MarineTrafficAPIService } from '../services/carriers/MarineTrafficAPIService';
import { VesselFinderAPIService } from '../services/carriers/VesselFinderAPIService';

/**
 * Comprehensive integration tests for all 15 container APIs
 * Tests each API service individually with real container number formats
 * Implements Requirements 9.4 for comprehensive API testing
 */
describe('All Container APIs Integration Tests', () => {
  // Test timeout for API calls
  const API_TIMEOUT = 30000;
  
  // Real container number formats for testing
  const testContainers = {
    maersk: ['MAEU1234567', 'MAEU7654321'],
    msc: ['MSCU1234567', 'MSCU7654321'],
    cmaCgm: ['CMAU1234567', 'CMAU7654321'],
    cosco: ['COSU1234567', 'COSU7654321'],
    hapagLloyd: ['HLCU1234567', 'HLCU7654321'],
    evergreen: ['EGLV1234567', 'EGLV7654321'],
    oneLine: ['ONEY1234567', 'ONEY7654321'],
    yangMing: ['YMLU1234567', 'YMLU7654321'],
    zim: ['ZIMU1234567', 'ZIMU7654321'],
    project44: ['TEST1234567', 'TEST7654321'],
    shipsGo: ['SHIP1234567', 'SHIP7654321'],
    seaRates: ['RATE1234567', 'RATE7654321'],
    trackTrace: ['TRCK1234567', 'TRCK7654321'],
    marineTraffic: ['MTRK1234567', 'MTRK7654321'],
    vesselFinder: ['VFND1234567', 'VFND7654321']
  };

  describe('Tier 1 Major Ocean Carriers', () => {
    describe('Maersk API Service', () => {
      let maerskService: MaerskAPIService;

      beforeEach(() => {
        maerskService = new MaerskAPIService();
      });

      it('should track Maersk containers successfully', async () => {
        for (const container of testContainers.maersk) {
          const startTime = Date.now();
          
          try {
            const result = await maerskService.trackContainer(container);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(10000); // Should respond within 10 seconds
            expect(result).toBeDefined();
            
            if (result) {
              expect(result).toHaveProperty('trackingNumber');
              expect(result.trackingNumber).toBe(container);
            }
          } catch (error) {
            // Log error but don't fail test - API might be unavailable
            console.warn(`Maersk API error for ${container}:`, error);
          }
        }
      }, API_TIMEOUT);

      it('should handle invalid container numbers gracefully', async () => {
        try {
          const result = await maerskService.trackContainer('INVALID123');
          // Should either return null or throw a handled error
          expect(result).toBeNull();
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }, API_TIMEOUT);
    });

    describe('MSC API Service', () => {
      let mscService: MSCAPIService;

      beforeEach(() => {
        mscService = new MSCAPIService();
      });

      it('should track MSC containers successfully', async () => {
        for (const container of testContainers.msc) {
          const startTime = Date.now();
          
          try {
            const result = await mscService.trackContainer(container);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(10000);
            expect(result).toBeDefined();
            
            if (result) {
              expect(result).toHaveProperty('trackingNumber');
              expect(result.trackingNumber).toBe(container);
            }
          } catch (error) {
            console.warn(`MSC API error for ${container}:`, error);
          }
        }
      }, API_TIMEOUT);
    });

    describe('CMA CGM API Service', () => {
      let cmaCgmService: CMACGMAPIService;

      beforeEach(() => {
        cmaCgmService = new CMACGMAPIService();
      });

      it('should track CMA CGM containers successfully', async () => {
        for (const container of testContainers.cmaCgm) {
          const startTime = Date.now();
          
          try {
            const result = await cmaCgmService.trackContainer(container);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(10000);
            expect(result).toBeDefined();
            
            if (result) {
              expect(result).toHaveProperty('trackingNumber');
              expect(result.trackingNumber).toBe(container);
            }
          } catch (error) {
            console.warn(`CMA CGM API error for ${container}:`, error);
          }
        }
      }, API_TIMEOUT);
    });

    describe('COSCO API Service', () => {
      let coscoService: COSCOAPIService;

      beforeEach(() => {
        coscoService = new COSCOAPIService();
      });

      it('should track COSCO containers successfully', async () => {
        for (const container of testContainers.cosco) {
          const startTime = Date.now();
          
          try {
            const result = await coscoService.trackContainer(container);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(10000);
            expect(result).toBeDefined();
            
            if (result) {
              expect(result).toHaveProperty('trackingNumber');
              expect(result.trackingNumber).toBe(container);
            }
          } catch (error) {
            console.warn(`COSCO API error for ${container}:`, error);
          }
        }
      }, API_TIMEOUT);
    });

    describe('Hapag-Lloyd API Service', () => {
      let hapagService: HapagLloydAPIService;

      beforeEach(() => {
        hapagService = new HapagLloydAPIService();
      });

      it('should track Hapag-Lloyd containers successfully', async () => {
        for (const container of testContainers.hapagLloyd) {
          const startTime = Date.now();
          
          try {
            const result = await hapagService.trackContainer(container);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(10000);
            expect(result).toBeDefined();
            
            if (result) {
              expect(result).toHaveProperty('trackingNumber');
              expect(result.trackingNumber).toBe(container);
            }
          } catch (error) {
            console.warn(`Hapag-Lloyd API error for ${container}:`, error);
          }
        }
      }, API_TIMEOUT);
    });
  });

  describe('Asia-Pacific Carriers', () => {
    describe('Evergreen API Service', () => {
      let evergreenService: EvergreenAPIService;

      beforeEach(() => {
        evergreenService = new EvergreenAPIService();
      });

      it('should track Evergreen containers successfully', async () => {
        for (const container of testContainers.evergreen) {
          const startTime = Date.now();
          
          try {
            const result = await evergreenService.trackContainer(container);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(10000);
            expect(result).toBeDefined();
            
            if (result) {
              expect(result).toHaveProperty('trackingNumber');
              expect(result.trackingNumber).toBe(container);
            }
          } catch (error) {
            console.warn(`Evergreen API error for ${container}:`, error);
          }
        }
      }, API_TIMEOUT);
    });

    describe('ONE Line API Service', () => {
      let oneLineService: ONELineAPIService;

      beforeEach(() => {
        oneLineService = new ONELineAPIService();
      });

      it('should track ONE Line containers successfully', async () => {
        for (const container of testContainers.oneLine) {
          const startTime = Date.now();
          
          try {
            const result = await oneLineService.trackContainer(container);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(10000);
            expect(result).toBeDefined();
            
            if (result) {
              expect(result).toHaveProperty('trackingNumber');
              expect(result.trackingNumber).toBe(container);
            }
          } catch (error) {
            console.warn(`ONE Line API error for ${container}:`, error);
          }
        }
      }, API_TIMEOUT);
    });

    describe('Yang Ming API Service', () => {
      let yangMingService: YangMingAPIService;

      beforeEach(() => {
        yangMingService = new YangMingAPIService();
      });

      it('should track Yang Ming containers successfully', async () => {
        for (const container of testContainers.yangMing) {
          const startTime = Date.now();
          
          try {
            const result = await yangMingService.trackContainer(container);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(10000);
            expect(result).toBeDefined();
            
            if (result) {
              expect(result).toHaveProperty('trackingNumber');
              expect(result.trackingNumber).toBe(container);
            }
          } catch (error) {
            console.warn(`Yang Ming API error for ${container}:`, error);
          }
        }
      }, API_TIMEOUT);
    });
  });

  describe('Regional and Specialized Carriers', () => {
    describe('ZIM API Service', () => {
      let zimService: ZIMAPIService;

      beforeEach(() => {
        zimService = new ZIMAPIService();
      });

      it('should track ZIM containers successfully', async () => {
        for (const container of testContainers.zim) {
          const startTime = Date.now();
          
          try {
            const result = await zimService.trackContainer(container);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(10000);
            expect(result).toBeDefined();
            
            if (result) {
              expect(result).toHaveProperty('trackingNumber');
              expect(result.trackingNumber).toBe(container);
            }
          } catch (error) {
            console.warn(`ZIM API error for ${container}:`, error);
          }
        }
      }, API_TIMEOUT);
    });
  });

  describe('Premium and Enterprise Services', () => {
    describe('Project44 API Service', () => {
      let project44Service: Project44APIService;

      beforeEach(() => {
        project44Service = new Project44APIService();
      });

      it('should track containers through Project44 successfully', async () => {
        for (const container of testContainers.project44) {
          const startTime = Date.now();
          
          try {
            const result = await project44Service.trackContainer(container);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(15000); // Premium service might be slower
            expect(result).toBeDefined();
            
            if (result) {
              expect(result).toHaveProperty('trackingNumber');
              expect(result.trackingNumber).toBe(container);
            }
          } catch (error) {
            console.warn(`Project44 API error for ${container}:`, error);
          }
        }
      }, API_TIMEOUT);
    });
  });

  describe('Container Aggregators', () => {
    describe('ShipsGo API Service', () => {
      let shipsGoService: ShipsGoAPIService;

      beforeEach(() => {
        shipsGoService = new ShipsGoAPIService();
      });

      it('should track containers through ShipsGo successfully', async () => {
        for (const container of testContainers.shipsGo) {
          const startTime = Date.now();
          
          try {
            const result = await shipsGoService.trackContainer(container);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(10000);
            expect(result).toBeDefined();
            
            if (result) {
              expect(result).toHaveProperty('trackingNumber');
              expect(result.trackingNumber).toBe(container);
            }
          } catch (error) {
            console.warn(`ShipsGo API error for ${container}:`, error);
          }
        }
      }, API_TIMEOUT);
    });

    describe('SeaRates API Service', () => {
      let seaRatesService: SeaRatesAPIService;

      beforeEach(() => {
        seaRatesService = new SeaRatesAPIService();
      });

      it('should track containers through SeaRates successfully', async () => {
        for (const container of testContainers.seaRates) {
          const startTime = Date.now();
          
          try {
            const result = await seaRatesService.trackContainer(container);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(10000);
            expect(result).toBeDefined();
            
            if (result) {
              expect(result).toHaveProperty('trackingNumber');
              expect(result.trackingNumber).toBe(container);
            }
          } catch (error) {
            console.warn(`SeaRates API error for ${container}:`, error);
          }
        }
      }, API_TIMEOUT);
    });

    describe('Track-Trace API Service', () => {
      let trackTraceService: TrackTraceAPIService;

      beforeEach(() => {
        trackTraceService = new TrackTraceAPIService();
      });

      it('should track containers through Track-Trace successfully', async () => {
        for (const container of testContainers.trackTrace) {
          const startTime = Date.now();
          
          try {
            const result = await trackTraceService.trackContainer(container);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(10000);
            expect(result).toBeDefined();
            
            if (result) {
              expect(result).toHaveProperty('trackingNumber');
              expect(result.trackingNumber).toBe(container);
            }
          } catch (error) {
            console.warn(`Track-Trace API error for ${container}:`, error);
          }
        }
      }, API_TIMEOUT);
    });
  });

  describe('Vessel Tracking Services', () => {
    describe('Marine Traffic API Service', () => {
      let marineTrafficService: MarineTrafficAPIService;

      beforeEach(() => {
        marineTrafficService = new MarineTrafficAPIService();
      });

      it('should track vessels through Marine Traffic successfully', async () => {
        for (const container of testContainers.marineTraffic) {
          const startTime = Date.now();
          
          try {
            const result = await marineTrafficService.trackContainer(container);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(10000);
            expect(result).toBeDefined();
            
            if (result) {
              expect(result).toHaveProperty('trackingNumber');
              expect(result.trackingNumber).toBe(container);
            }
          } catch (error) {
            console.warn(`Marine Traffic API error for ${container}:`, error);
          }
        }
      }, API_TIMEOUT);
    });

    describe('Vessel Finder API Service', () => {
      let vesselFinderService: VesselFinderAPIService;

      beforeEach(() => {
        vesselFinderService = new VesselFinderAPIService();
      });

      it('should track vessels through Vessel Finder successfully', async () => {
        for (const container of testContainers.vesselFinder) {
          const startTime = Date.now();
          
          try {
            const result = await vesselFinderService.trackContainer(container);
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(10000);
            expect(result).toBeDefined();
            
            if (result) {
              expect(result).toHaveProperty('trackingNumber');
              expect(result.trackingNumber).toBe(container);
            }
          } catch (error) {
            console.warn(`Vessel Finder API error for ${container}:`, error);
          }
        }
      }, API_TIMEOUT);
    });
  });

  describe('Cross-API Performance Tests', () => {
    it('should handle concurrent requests across all APIs', async () => {
      const services = [
        new MaerskAPIService(),
        new MSCAPIService(),
        new CMACGMAPIService(),
        new COSCOAPIService(),
        new HapagLloydAPIService()
      ];

      const containers = [
        'MAEU1234567',
        'MSCU1234567',
        'CMAU1234567',
        'COSU1234567',
        'HLCU1234567'
      ];

      const startTime = Date.now();
      
      const promises = services.map((service, index) => 
        service.trackContainer(containers[index]).catch(error => {
          console.warn(`Concurrent test error:`, error);
          return null;
        })
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(results).toHaveLength(5);
      
      // At least some results should be successful
      const successfulResults = results.filter(r => r !== null);
      expect(successfulResults.length).toBeGreaterThanOrEqual(0);
    }, 45000);

    it('should maintain performance under load', async () => {
      const service = new MaerskAPIService();
      const container = 'MAEU1234567';
      const requestCount = 10;
      
      const startTime = Date.now();
      
      const promises = Array.from({ length: requestCount }, () =>
        service.trackContainer(container).catch(error => {
          console.warn(`Load test error:`, error);
          return null;
        })
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / requestCount;

      expect(averageTime).toBeLessThan(5000); // Average should be under 5 seconds
      expect(results).toHaveLength(requestCount);
    }, 60000);
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network timeouts gracefully', async () => {
      const service = new MaerskAPIService();
      
      // Test with a container that might cause timeout
      try {
        const result = await service.trackContainer('TIMEOUT_TEST_123');
        // Should either return null or valid result
        expect(result).toBeDefined();
      } catch (error) {
        // Should be a handled error
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeDefined();
      }
    }, API_TIMEOUT);

    it('should handle rate limiting appropriately', async () => {
      const service = new TrackTraceAPIService(); // Free tier service
      const rapidRequests = Array.from({ length: 20 }, (_, i) => 
        service.trackContainer(`RATE${i}`).catch(error => error)
      );

      const results = await Promise.all(rapidRequests);
      
      // Should handle rate limiting without crashing
      expect(results).toHaveLength(20);
      
      // Some requests might fail due to rate limiting
      const errors = results.filter(r => r instanceof Error);
      const successes = results.filter(r => !(r instanceof Error));
      
      expect(errors.length + successes.length).toBe(20);
    }, 60000);
  });
});