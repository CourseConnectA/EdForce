// WebSocket service for real-time updates with debouncing and optimized event handling
import { io, Socket } from 'socket.io-client';
import { store } from '@/store/store';
import { fetchLeads, LeadsState } from '@/store/slices/leadsSlice';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  
  // Debounce configuration for different event types
  private refreshTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private pendingEvents: Map<string, any[]> = new Map();
  private readonly DEBOUNCE_DELAY = 500; // 500ms debounce
  private readonly BATCH_DEBOUNCE_DELAY = 1000; // 1 second for batch operations
  
  // Presence update listeners
  private presenceListeners: Set<(data: { userId: string; presence: string }) => void> = new Set();

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
      // Improved connection settings for production
      timeout: 20000,
      forceNew: false,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      // Clear any pending debounced refreshes on reconnect
      this.clearAllPendingRefreshes();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      // Clear pending refreshes on disconnect
      this.clearAllPendingRefreshes();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('Max reconnection attempts reached');
      }
    });

    // Listen for lead updates with debouncing
    this.socket.on('lead:created', (data) => {
      console.log('🆕 New lead created:', data?.id || data);
      this.debouncedRefreshLeads('lead:created', data);
    });

    this.socket.on('lead:updated', (data) => {
      console.log('📝 Lead updated:', data?.id || data);
      this.debouncedRefreshLeads('lead:updated', data);
    });

    this.socket.on('lead:deleted', (data) => {
      console.log('🗑️ Lead deleted:', data?.id || data);
      this.debouncedRefreshLeads('lead:deleted', data);
    });

    this.socket.on('lead:assigned', (data) => {
      console.log('👤 Lead assigned:', data?.id || data);
      this.debouncedRefreshLeads('lead:assigned', data);
    });

    // Listen for call log updates with debouncing
    this.socket.on('call:logged', (data) => {
      console.log('📞 Call logged:', data?.id || data);
      this.debouncedRefreshLeads('call:logged', data, this.BATCH_DEBOUNCE_DELAY);
    });

    // Listen for presence updates
    this.socket.on('presence:updated', (data) => {
      console.log('👤 Presence updated:', data?.userId, data?.presence);
      // Emit to any listeners registered for presence updates
      this.presenceListeners.forEach(listener => listener(data));
    });

    // Listen for generic data updates
    this.socket.on('data:updated', (data) => {
      console.log('🔄 Data updated:', data?.entity || data);
      if (data?.entity === 'lead') {
        this.debouncedRefreshLeads('data:updated', data);
      }
    });

    // Handle batch events (for bulk operations)
    this.socket.on('leads:batch-updated', (data) => {
      console.log('📦 Batch leads updated:', data?.count || 'unknown');
      this.debouncedRefreshLeads('batch', data, this.BATCH_DEBOUNCE_DELAY);
    });
  }

  /**
   * Debounced refresh to prevent multiple rapid API calls
   * Multiple events of the same type within the debounce window will result in a single refresh
   */
  private debouncedRefreshLeads(eventType: string, data?: any, customDelay?: number): void {
    const delay = customDelay || this.DEBOUNCE_DELAY;
    
    // Track pending events for this type
    if (!this.pendingEvents.has(eventType)) {
      this.pendingEvents.set(eventType, []);
    }
    this.pendingEvents.get(eventType)!.push(data);

    // Clear existing timeout for this event type
    const existingTimeout = this.refreshTimeouts.get(eventType);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new debounced timeout
    const timeout = setTimeout(() => {
      const events = this.pendingEvents.get(eventType) || [];
      console.log(`🔄 Executing debounced refresh for ${eventType} (${events.length} events batched)`);
      
      // Clear pending events
      this.pendingEvents.delete(eventType);
      this.refreshTimeouts.delete(eventType);
      
      // Perform the actual refresh
      this.executeRefreshLeads();
    }, delay);

    this.refreshTimeouts.set(eventType, timeout);
  }

  /**
   * Clear all pending refresh timeouts
   */
  private clearAllPendingRefreshes(): void {
    this.refreshTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.refreshTimeouts.clear();
    this.pendingEvents.clear();
  }

  /**
   * Execute the actual leads refresh
   */
  private executeRefreshLeads(): void {
    // Get current filters from Redux store
    const state = store.getState();
    const { page, limit, lastQuery } = state.leads as LeadsState;

    const params = lastQuery ? { ...lastQuery } : { page, limit };

    // Dispatch action to refetch leads with current filters
    store.dispatch(fetchLeads(params as any));
  }

  /**
   * Force immediate refresh (bypasses debouncing)
   */
  forceRefreshLeads(): void {
    this.clearAllPendingRefreshes();
    this.executeRefreshLeads();
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

  // Subscribe to presence updates
  onPresenceUpdate(callback: (data: { userId: string; presence: string }) => void): () => void {
    this.presenceListeners.add(callback);
    return () => this.presenceListeners.delete(callback);
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;
