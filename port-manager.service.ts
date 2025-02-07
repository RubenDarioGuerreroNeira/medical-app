import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';

@Injectable()
export class PortManagerService {
    private readonly logger = new Logger(PortManagerService.name);

    async findAvailablePort(desiredPort: number): Promise<number> {
        try {
            await this.checkPort(desiredPort);
            return desiredPort;
        } catch (error) {
            this.logger.warn(`Puerto ${desiredPort} está en uso. Buscando puerto alternativo...`);
            return this.findNextAvailablePort(desiredPort + 1);
        }
    }

    private async checkPort(port: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            
            server.once('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    reject(new Error(`Puerto ${port} está en uso`));
                } else {
                    reject(err);
                }
            });

            server.once('listening', () => {
                server.close();
                resolve();
            });

            server.listen(port);
        });
    }

    private async findNextAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
        for (let port = startPort; port < startPort + maxAttempts; port++) {
            try {
                await this.checkPort(port);
                this.logger.log(`Puerto disponible encontrado: ${port}`);
                return port;
            } catch (error) {
                continue;
            }
        }
        throw new Error(`No se encontró ningún puerto disponible después de ${maxAttempts} intentos`);
    }
}