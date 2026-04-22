import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: (origin: string, cb: (err: Error | null, allow: boolean) => void) => {
      const allowed = [
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        // Production ibogha.elowe.fr
        'https://patient.ibogha.elowe.fr',
        'https://pro.ibogha.elowe.fr',
        'https://admin.ibogha.elowe.fr',
        // Preprod ibogha.elowe.fr
        'https://preprod-patient.ibogha.elowe.fr',
        'https://preprod-pro.ibogha.elowe.fr',
        'https://preprod-admin.ibogha.elowe.fr',
      ];
      const isLocalhost = !origin || /^http:\/\/localhost:\d+$/.test(origin);
      cb(null, isLocalhost || allowed.includes(origin));
    },
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  afterInit() {
    this.logger.log('NotificationsGateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId: string = payload.sub;
      client.data.userId = userId;

      // Join a room named after the user — allows multi-tab
      client.join(`user:${userId}`);
      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /** Push a notification to all sockets of a specific user */
  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
