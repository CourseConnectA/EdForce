import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import leadsService, {
  Lead,
  LeadsQueryParams,
  CreateLeadDto,
  UpdateLeadDto,
} from '../../services/leadsService';

export interface LeadsState {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;
  selectedLead: Lead | null;
  lastQuery: LeadsQueryParams | null;
}

const initialState: LeadsState = {
  leads: [],
  total: 0,
  page: 1,
  limit: 10,
  loading: false,
  error: null,
  selectedLead: null,
  lastQuery: null,
};

// Async thunks
export const fetchLeads = createAsyncThunk(
  'leads/fetchLeads',
  async (params?: LeadsQueryParams) => {
    const response = await leadsService.getLeads(params);
    return { response, params };
  }
);

export const fetchLead = createAsyncThunk(
  'leads/fetchLead',
  async (id: string) => {
    const lead = await leadsService.getLead(id);
    return lead;
  }
);

export const createLead = createAsyncThunk(
  'leads/createLead',
  async (data: CreateLeadDto) => {
    const lead = await leadsService.createLead(data);
    return lead;
  }
);

export const updateLead = createAsyncThunk(
  'leads/updateLead',
  async ({ id, data }: { id: string; data: UpdateLeadDto }) => {
    const lead = await leadsService.updateLead(id, data);
    return lead;
  }
);

export const deleteLead = createAsyncThunk(
  'leads/deleteLead',
  async (id: string) => {
    await leadsService.deleteLead(id);
    return id;
  }
);

export const deleteLeadsBulk = createAsyncThunk(
  'leads/deleteLeadsBulk',
  async (ids: string[]) => {
    const result = await leadsService.deleteLeadsBulk(ids);
    return { ids, result };
  }
);

export const convertLead = createAsyncThunk(
  'leads/convertLead',
  async (id: string) => {
    const result = await leadsService.convertLead(id);
    return { id, result };
  }
);

export const assignLead = createAsyncThunk(
  'leads/assignLead',
  async ({ id, assignedUserId }: { id: string; assignedUserId: string }) => {
    const lead = await leadsService.assignLead(id, assignedUserId);
    return lead;
  }
);

export const assignLeadsBulk = createAsyncThunk(
  'leads/assignLeadsBulk',
  async ({ ids, assignedUserId }: { ids: string[]; assignedUserId: string }) => {
    const result = await leadsService.assignLeadsBulk(ids, assignedUserId);
    return result;
  }
);

const leadsSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    setSelectedLead: (state, action: PayloadAction<Lead | null>) => {
      state.selectedLead = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.limit = action.payload;
    },
    clearLeads: (state) => {
      state.leads = [];
      state.total = 0;
      state.page = 1;
      state.selectedLead = null;
      state.lastQuery = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch leads
      .addCase(fetchLeads.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.loading = false;
        state.leads = action.payload.response.data;
        state.total = action.payload.response.total;
        state.page = action.payload.response.page;
        state.limit = action.payload.response.limit;
        state.lastQuery = action.payload.params || null;
      })
      .addCase(fetchLeads.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch leads';
      })
      // Fetch single lead
      .addCase(fetchLead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLead.fulfilled, (state, action: PayloadAction<Lead>) => {
        state.loading = false;
        state.selectedLead = action.payload;
      })
      .addCase(fetchLead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch lead';
      })
      // Create lead
      .addCase(createLead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLead.fulfilled, (state, action: PayloadAction<Lead>) => {
        state.loading = false;
        state.leads.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createLead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create lead';
      })
      // Update lead
      .addCase(updateLead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLead.fulfilled, (state, action: PayloadAction<Lead>) => {
        state.loading = false;
        const index = state.leads.findIndex((lead) => lead.id === action.payload.id);
        if (index !== -1) {
          state.leads[index] = action.payload;
        }
        if (state.selectedLead?.id === action.payload.id) {
          state.selectedLead = action.payload;
        }
      })
      .addCase(updateLead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update lead';
      })
      // Delete lead
      .addCase(deleteLead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteLead.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.leads = state.leads.filter((lead) => lead.id !== action.payload);
        state.total -= 1;
        if (state.selectedLead?.id === action.payload) {
          state.selectedLead = null;
        }
      })
      .addCase(deleteLead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete lead';
      })
      // Delete leads bulk
      .addCase(deleteLeadsBulk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteLeadsBulk.fulfilled, (state, action) => {
        state.loading = false;
        const deletedIds = action.payload.ids;
        state.leads = state.leads.filter((lead) => !deletedIds.includes(lead.id));
        state.total -= action.payload.result.deleted;
        if (state.selectedLead && deletedIds.includes(state.selectedLead.id)) {
          state.selectedLead = null;
        }
      })
      .addCase(deleteLeadsBulk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete leads';
      })
      // Convert lead
      .addCase(convertLead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(convertLead.fulfilled, (state, action) => {
        state.loading = false;
        // Remove converted lead from list
        state.leads = state.leads.filter((lead) => lead.id !== action.payload.id);
        state.total -= 1;
        if (state.selectedLead?.id === action.payload.id) {
          state.selectedLead = null;
        }
      })
      .addCase(convertLead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to convert lead';
      })
      // Assign lead
      .addCase(assignLead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(assignLead.fulfilled, (state, action: PayloadAction<Lead>) => {
        state.loading = false;
        const index = state.leads.findIndex((lead) => lead.id === action.payload.id);
        if (index !== -1) {
          state.leads[index] = action.payload;
        }
        if (state.selectedLead?.id === action.payload.id) {
          state.selectedLead = action.payload;
        }
      })
      .addCase(assignLead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to assign lead';
      })
      // Assign leads bulk
      .addCase(assignLeadsBulk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(assignLeadsBulk.fulfilled, (state) => {
        state.loading = false;
        // Leads will be refreshed via fetchLeads
      })
      .addCase(assignLeadsBulk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to assign leads';
      });
  },
});

export const {
  setSelectedLead,
  clearError,
  setPage,
  setLimit,
  clearLeads,
} = leadsSlice.actions;

export default leadsSlice.reducer;
