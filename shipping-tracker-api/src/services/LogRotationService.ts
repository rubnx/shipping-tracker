import fs from 'fs/promises';
import path from 'path';
import { loggingService } from './LoggingService';

export interface LogRotationConfig {
  enabled: boolean;
  directory: string;
  maxFileSize: number; // in MB
  maxFiles: number;
  rotationInterval: number; // in hours
  compressionEnabled: boolean;
  retentionDays: number;
}

class LogRotationService {
  private config: LogRotationConfig;
  private rotationTimer: NodeJS.Timeout | null = null;
  private currentLogFile: string | null = null;

  constructor(config?: Partial<LogRotationConfig>) {
    this.config = {
      enabled: process.env.LOG_ROTATION_ENABLED === 'true',
      directory: process.env.LOG_DIRECTORY || './logs',
      maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '100'), // 100MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '10'),
      rotationInterval: parseInt(process.env.LOG_ROTATION_INTERVAL || '24'), // 24 hours
      compressionEnabled: process.env.LOG_COMPRESSION_ENABLED === 'true',
      retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '30'),
      ...config,
    };

    if (this.config.enabled) {
      this.initialize();
    }
  }

  private async initialize() {
    try {
      // Create logs directory if it doesn't exist
      await fs.mkdir(this.config.directory, { recursive: true });
      
      // Start rotation timer
      this.startRotationTimer();
      
      // Clean up old logs
      await this.cleanupOldLogs();
      
      loggingService.info('Log rotation service initialized', {
        directory: this.config.directory,
        maxFileSize: this.config.maxFileSize,
        maxFiles: this.config.maxFiles,
        rotationInterval: this.config.rotationInterval,
        retentionDays: this.config.retentionDays,
      });
    } catch (error) {
      console.error('Failed to initialize log rotation service:', error);
    }
  }

  private startRotationTimer() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    // Rotate logs at specified interval
    this.rotationTimer = setInterval(() => {
      this.rotateLogs();
    }, this.config.rotationInterval * 60 * 60 * 1000); // Convert hours to milliseconds
  }

  public async rotateLogs(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `app-${timestamp}.log`;
      const filepath = path.join(this.config.directory, filename);

      // Export current logs
      const logs = loggingService.exportLogs('json');
      await fs.writeFile(filepath, logs, 'utf8');

      // Compress if enabled
      if (this.config.compressionEnabled) {
        await this.compressLogFile(filepath);
      }

      // Clear in-memory logs after successful rotation
      loggingService.clearLogs();

      // Clean up old files
      await this.cleanupOldFiles();

      this.currentLogFile = filepath;

      loggingService.info('Log rotation completed', {
        filename,
        filepath,
        compressed: this.config.compressionEnabled,
      });
    } catch (error) {
      loggingService.error('Log rotation failed', error as Error, {
        directory: this.config.directory,
      });
    }
  }

  private async compressLogFile(filepath: string): Promise<void> {
    try {
      const zlib = await import('zlib');
      const { promisify } = await import('util');
      const gzip = promisify(zlib.gzip);

      const data = await fs.readFile(filepath);
      const compressed = await gzip(data);
      
      const compressedPath = `${filepath}.gz`;
      await fs.writeFile(compressedPath, compressed);
      
      // Remove original file
      await fs.unlink(filepath);
      
      loggingService.debug('Log file compressed', {
        original: filepath,
        compressed: compressedPath,
      });
    } catch (error) {
      loggingService.error('Log compression failed', error as Error, {
        filepath,
      });
    }
  }

  private async cleanupOldFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.directory);
      const logFiles = files
        .filter(file => file.startsWith('app-') && (file.endsWith('.log') || file.endsWith('.log.gz')))
        .map(file => ({
          name: file,
          path: path.join(this.config.directory, file),
        }));

      // Sort by creation time (newest first)
      const fileStats = await Promise.all(
        logFiles.map(async file => ({
          ...file,
          stats: await fs.stat(file.path),
        }))
      );

      fileStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Remove files exceeding max count
      if (fileStats.length > this.config.maxFiles) {
        const filesToDelete = fileStats.slice(this.config.maxFiles);
        
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          loggingService.debug('Deleted old log file', { filename: file.name });
        }
      }
    } catch (error) {
      loggingService.error('Failed to cleanup old log files', error as Error);
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const files = await fs.readdir(this.config.directory);
      
      for (const file of files) {
        if (file.startsWith('app-') && (file.endsWith('.log') || file.endsWith('.log.gz'))) {
          const filepath = path.join(this.config.directory, file);
          const stats = await fs.stat(filepath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filepath);
            loggingService.debug('Deleted expired log file', {
              filename: file,
              age: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)),
            });
          }
        }
      }
    } catch (error) {
      loggingService.error('Failed to cleanup expired logs', error as Error);
    }
  }

  public async forceRotation(): Promise<void> {
    await this.rotateLogs();
  }

  public async getLogFiles(): Promise<Array<{
    name: string;
    size: number;
    created: Date;
    compressed: boolean;
  }>> {
    try {
      const files = await fs.readdir(this.config.directory);
      const logFiles = files.filter(file => 
        file.startsWith('app-') && (file.endsWith('.log') || file.endsWith('.log.gz'))
      );

      const fileInfo = await Promise.all(
        logFiles.map(async file => {
          const filepath = path.join(this.config.directory, file);
          const stats = await fs.stat(filepath);
          
          return {
            name: file,
            size: stats.size,
            created: stats.birthtime,
            compressed: file.endsWith('.gz'),
          };
        })
      );

      return fileInfo.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      loggingService.error('Failed to get log files', error as Error);
      return [];
    }
  }

  public async getLogFileContent(filename: string): Promise<string | null> {
    try {
      const filepath = path.join(this.config.directory, filename);
      
      if (filename.endsWith('.gz')) {
        const zlib = await import('zlib');
        const { promisify } = await import('util');
        const gunzip = promisify(zlib.gunzip);
        
        const compressed = await fs.readFile(filepath);
        const decompressed = await gunzip(compressed);
        return decompressed.toString('utf8');
      } else {
        return await fs.readFile(filepath, 'utf8');
      }
    } catch (error) {
      loggingService.error('Failed to read log file', error as Error, { filename });
      return null;
    }
  }

  public getConfig(): LogRotationConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<LogRotationConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (this.config.enabled && !this.rotationTimer) {
      this.startRotationTimer();
    } else if (!this.config.enabled && this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
    
    loggingService.info('Log rotation config updated', updates);
  }

  public getStatus() {
    return {
      enabled: this.config.enabled,
      currentLogFile: this.currentLogFile,
      nextRotation: this.rotationTimer ? 
        new Date(Date.now() + this.config.rotationInterval * 60 * 60 * 1000) : null,
      config: this.config,
    };
  }

  public cleanup(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }
}

export const logRotationService = new LogRotationService();