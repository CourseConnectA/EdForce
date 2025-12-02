import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow localhost and local network IPs
      if (
        !origin ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin) ||
        origin.startsWith('capacitor://')
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all for now, restrict in production
      }
    },
    credentials: true,
  },
})
export class DataSyncGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('DataSyncGateway');

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connection', { message: 'Connected to CRM server' });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Emit lead created event
  emitLeadCreated(lead: any) {
    this.logger.debug(`Broadcasting lead:created for lead ${lead.id}`);
    this.server.emit('lead:created', lead);
  }

  // Emit lead updated event
  emitLeadUpdated(lead: any) {
    this.logger.debug(`Broadcasting lead:updated for lead ${lead.id}`);
    this.server.emit('lead:updated', lead);
  }

  // Emit lead deleted event
  emitLeadDeleted(leadId: string) {
    this.logger.debug(`Broadcasting lead:deleted for lead ${leadId}`);
    this.server.emit('lead:deleted', { id: leadId });
  }

  // Emit lead assigned event
  emitLeadAssigned(lead: any) {
    this.logger.debug(`Broadcasting lead:assigned for lead ${lead.id}`);
    this.server.emit('lead:assigned', lead);
  }

  // Emit call logged event
  emitCallLogged(callLog: any) {
    this.logger.debug(`Broadcasting call:logged for call ${callLog.id}`);
    this.server.emit('call:logged', callLog);
  }

  // Generic data update event
  emitDataUpdated(entity: string, data: any) {
    this.logger.debug(`Broadcasting data:updated for ${entity}`);
    this.server.emit('data:updated', { entity, data });
  }
}
