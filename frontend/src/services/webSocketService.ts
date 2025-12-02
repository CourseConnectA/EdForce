// WebSocket service for real-time updates
import { io, Socket } from 'socket.io-client';
import { store } from '@/store/store';
import { fetchLeads, LeadsState } from '@/store/slices/leadsSlice';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  connect(): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    // Get API URL from environment or use default
    const apiUrl = import.meta.env.VITE_APP_API_URL || '/api';
    const baseUrl = apiUrl.replace('/api', ''); // Remove /api suffix for socket connection
    
    console.log('Connecting to WebSocket:', baseUrl);

    this.socket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
      auth: {
        token: localStorage.getItem('accessToken'),
      },
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('Max reconnection attempts reached');
      }
    });

    // Listen for lead updates
    this.socket.on('lead:created', (data) => {
      console.log('🆕 New lead created:', data);
      // Always refresh for new leads to maintain proper pagination
      this.refreshLeads();
    });

    this.socket.on('lead:updated', (data) => {
      console.log('📝 Lead updated:', data);
      // Refresh to get updated lead data
      this.refreshLeads();
    });

    this.socket.on('lead:deleted', (data) => {
      console.log('🗑️ Lead deleted:', data);
      // Refresh to remove deleted lead
      this.refreshLeads();
    });

    this.socket.on('lead:assigned', (data) => {
      console.log('👤 Lead assigned:', data);
      // Refresh to show assignment changes
      this.refreshLeads();
    });

    // Listen for call log updates
    this.socket.on('call:logged', (data) => {
      console.log('📞 Call logged:', data);
      this.refreshLeads(); // Refresh to update last call info
    });

    // Listen for generic data updates
    this.socket.on('data:updated', (data) => {
      console.log('🔄 Data updated:', data);
      if (data.entity === 'lead') {
        this.refreshLeads();
      }
    });
  }

  private refreshLeads(): void {
    // Get current filters from Redux store
    const state = store.getState();
    const { page, limit, lastQuery } = state.leads as LeadsState;

    const params = lastQuery ? { ...lastQuery } : { page, limit };

    // Dispatch action to refetch leads with current filters
    store.dispatch(fetchLeads(params as any));
  }

  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting WebSocket');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  updateAuth(token: string): void {
    if (this.socket) {
      this.socket.auth = { token };
      // Reconnect with new token
      this.socket.disconnect().connect();
    }
  }

  // Emit events
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Cannot emit, WebSocket not connected');
    }
  }

  // Listen to custom events
  on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove event listener
  off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;
