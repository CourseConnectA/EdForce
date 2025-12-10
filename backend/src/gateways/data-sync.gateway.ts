import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  centerName?: string;
}

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
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class DataSyncGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('DataSyncGateway');
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      // Validate JWT token from handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (token) {
        try {
          const payload = this.jwtService.verify(token, {
            secret: this.configService.get('JWT_SECRET') || 'dev-secret-change-me',
          });
          
          // Store user info on socket
          client.userId = payload.sub || payload.id;
          client.userRole = payload.role;
          client.centerName = payload.centerName;
          
          // Join user-specific room
          client.join(`user:${client.userId}`);
          
          // Join center-specific room if user has a center
          if (client.centerName) {
            client.join(`center:${client.centerName}`);
          }
          
          // Join role-based room
          if (client.userRole) {
            client.join(`role:${client.userRole}`);
          }
          
          // Super admins join global room
          if (client.userRole === 'super-admin') {
            client.join('global:admins');
          }
          
          this.logger.log(`Client authenticated: ${client.id} (user: ${client.userId}, center: ${client.centerName})`);
        } catch (err) {
          this.logger.warn(`Invalid token for client ${client.id}: ${err.message}`);
          // Allow connection but without room membership (will only receive public events)
        }
      }
      
      this.connectedClients.set(client.id, client);
      this.logger.log(`Client connected: ${client.id} (total: ${this.connectedClients.size})`);
      client.emit('connection', { message: 'Connected to CRM server', clientId: client.id });
    } catch (error) {
      this.logger.error(`Error handling connection: ${error.message}`);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id} (total: ${this.connectedClients.size})`);
  }

  // Get the room name for a lead based on its center/assignment
  private getLeadRooms(lead: any, centerName?: string): string[] {
    const rooms: string[] = [];
    
    // Always notify super admins
    rooms.push('global:admins');
    
    // Notify the assigned user
    if (lead.assignedUserId) {
      rooms.push(`user:${lead.assignedUserId}`);
    }
    
    // Notify all users in the same center (for center managers and counselors)
    const effectiveCenterName = centerName || lead.centerName;
    if (effectiveCenterName) {
      rooms.push(`center:${effectiveCenterName}`);
    }
    
    this.logger.debug(`Lead rooms for ${lead.id}: ${rooms.join(', ')}`);
    return rooms;
  }

  // Emit lead created event - room-based
  emitLeadCreated(lead: any, centerName?: string) {
    this.logger.debug(`Broadcasting lead:created for lead ${lead.id}`);
    const rooms = this.getLeadRooms(lead, centerName);
    
    if (rooms.length > 0) {
      rooms.forEach(room => {
        this.server.to(room).emit('lead:created', lead);
      });
    } else {
      // Fallback to broadcast if no specific rooms
      this.server.emit('lead:created', lead);
    }
  }

  // Emit lead updated event - room-based
  emitLeadUpdated(lead: any, centerName?: string) {
    this.logger.debug(`Broadcasting lead:updated for lead ${lead.id}`);
    const rooms = this.getLeadRooms(lead, centerName);
    
    if (rooms.length > 0) {
      rooms.forEach(room => {
        this.server.to(room).emit('lead:updated', lead);
      });
    } else {
      this.server.emit('lead:updated', lead);
    }
  }

  // Emit lead deleted event - room-based
  emitLeadDeleted(leadId: string, centerName?: string, assignedUserId?: string) {
    this.logger.debug(`Broadcasting lead:deleted for lead ${leadId}`);
    const rooms: string[] = ['global:admins'];
    
    if (centerName) rooms.push(`center:${centerName}`);
    if (assignedUserId) rooms.push(`user:${assignedUserId}`);
    
    if (rooms.length > 0) {
      rooms.forEach(room => {
        this.server.to(room).emit('lead:deleted', { id: leadId });
      });
    } else {
      this.server.emit('lead:deleted', { id: leadId });
    }
  }

  // Emit lead assigned event - notify both old and new assignees
  emitLeadAssigned(lead: any, centerName?: string, previousAssigneeId?: string) {
    this.logger.debug(`Broadcasting lead:assigned for lead ${lead.id}`);
    const rooms = this.getLeadRooms(lead, centerName);
    
    // Also notify previous assignee
    if (previousAssigneeId && previousAssigneeId !== lead.assignedUserId) {
      rooms.push(`user:${previousAssigneeId}`);
    }
    
    this.logger.debug(`Broadcasting lead:assigned to rooms: ${rooms.join(', ')}`);
    
    if (rooms.length > 0) {
      rooms.forEach(room => {
        this.server.to(room).emit('lead:assigned', lead);
      });
    } else {
      this.server.emit('lead:assigned', lead);
    }
  }

  // Emit call logged event - room-based
  emitCallLogged(callLog: any, centerName?: string) {
    this.logger.debug(`Broadcasting call:logged for call ${callLog.id}`);
    const rooms: string[] = ['global:admins'];
    
    // Get centerName from callLog if not provided
    const effectiveCenterName = centerName || callLog?.centerName;
    
    if (callLog.userId) rooms.push(`user:${callLog.userId}`);
    if (effectiveCenterName) rooms.push(`center:${effectiveCenterName}`);
    
    // Also notify counselors in the same center
    if (effectiveCenterName) {
      rooms.push(`role:counselor`);
    }
    
    this.logger.debug(`Broadcasting call:logged to rooms: ${rooms.join(', ')}`);
    
    if (rooms.length > 0) {
      rooms.forEach(room => {
        this.server.to(room).emit('call:logged', callLog);
      });
    } else {
      this.server.emit('call:logged', callLog);
    }
  }

  // Generic data update event - room-based with optional targeting
  emitDataUpdated(entity: string, data: any, targetRooms?: string[]) {
    this.logger.debug(`Broadcasting data:updated for ${entity}`);
    
    if (targetRooms && targetRooms.length > 0) {
      targetRooms.forEach(room => {
        this.server.to(room).emit('data:updated', { entity, data });
      });
    } else {
      this.server.emit('data:updated', { entity, data });
    }
  }

  // Emit to specific user
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Emit to specific center
  emitToCenter(centerName: string, event: string, data: any) {
    this.server.to(`center:${centerName}`).emit(event, data);
  }

  // Emit presence update - broadcast to relevant rooms
  emitPresenceUpdate(userId: string, presence: string, centerName?: string, role?: string) {
    this.logger.debug(`Broadcasting presence:updated for user ${userId}: ${presence}`);
    const payload = { userId, presence };
    
    // Notify super admins
    this.server.to('global:admins').emit('presence:updated', payload);
    
    // Notify users in the same center
    if (centerName) {
      this.server.to(`center:${centerName}`).emit('presence:updated', payload);
    }
    
    // Notify the user themselves (for multi-device sync)
    this.server.to(`user:${userId}`).emit('presence:updated', payload);
  }

  // Get connection stats
  getConnectionStats(): { total: number; authenticated: number } {
    let authenticated = 0;
    this.connectedClients.forEach(client => {
      if (client.userId) authenticated++;
    });
    return { total: this.connectedClients.size, authenticated };
  }
}
