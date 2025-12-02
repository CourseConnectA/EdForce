import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { opportunitiesService, Opportunity, OpportunitiesResponse, OpportunitiesQueryParams, CreateOpportunityDto, UpdateOpportunityDto } from '../../services/opportunitiesService';

export interface OpportunitiesState {
  opportunities: Opportunity[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;
  selectedOpportunity: Opportunity | null;
}

const initialState: OpportunitiesState = {
  opportunities: [],
  total: 0,
  page: 1,
  limit: 10,
  loading: false,
  error: null,
  selectedOpportunity: null,
};

// Async thunks
export const fetchOpportunities = createAsyncThunk(
  'opportunities/fetchOpportunities',
  async (params?: OpportunitiesQueryParams) => {
    const response = await opportunitiesService.getOpportunities(params);
    return response;
  }
);

export const fetchOpportunity = createAsyncThunk(
  'opportunities/fetchOpportunity',
  async (id: string) => {
    const opportunity = await opportunitiesService.getOpportunity(id);
    return opportunity;
  }
);

export const createOpportunity = createAsyncThunk(
  'opportunities/createOpportunity',
  async (data: CreateOpportunityDto) => {
    const opportunity = await opportunitiesService.createOpportunity(data);
    return opportunity;
  }
);

export const updateOpportunity = createAsyncThunk(
  'opportunities/updateOpportunity',
  async ({ id, data }: { id: string; data: UpdateOpportunityDto }) => {
    const opportunity = await opportunitiesService.updateOpportunity(id, data);
    return opportunity;
  }
);

export const deleteOpportunity = createAsyncThunk(
  'opportunities/deleteOpportunity',
  async (id: string) => {
    await opportunitiesService.deleteOpportunity(id);
    return id;
  }
);

const opportunitiesSlice = createSlice({
  name: 'opportunities',
  initialState,
  reducers: {
    setSelectedOpportunity: (state, action: PayloadAction<Opportunity | null>) => {
      state.selectedOpportunity = action.payload;
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
  },
  extraReducers: (builder) => {
    builder
      // Fetch opportunities
      .addCase(fetchOpportunities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOpportunities.fulfilled, (state, action: PayloadAction<OpportunitiesResponse>) => {
        state.loading = false;
        state.opportunities = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchOpportunities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch opportunities';
      })
      // Fetch single opportunity
      .addCase(fetchOpportunity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOpportunity.fulfilled, (state, action: PayloadAction<Opportunity>) => {
        state.loading = false;
        state.selectedOpportunity = action.payload;
      })
      .addCase(fetchOpportunity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch opportunity';
      })
      // Create opportunity
      .addCase(createOpportunity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOpportunity.fulfilled, (state, action: PayloadAction<Opportunity>) => {
        state.loading = false;
        state.opportunities.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createOpportunity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create opportunity';
      })
      // Update opportunity
      .addCase(updateOpportunity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOpportunity.fulfilled, (state, action: PayloadAction<Opportunity>) => {
        state.loading = false;
        const index = state.opportunities.findIndex(opportunity => opportunity.id === action.payload.id);
        if (index !== -1) {
          state.opportunities[index] = action.payload;
        }
        if (state.selectedOpportunity?.id === action.payload.id) {
          state.selectedOpportunity = action.payload;
        }
      })
      .addCase(updateOpportunity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update opportunity';
      })
      // Delete opportunity
      .addCase(deleteOpportunity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteOpportunity.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.opportunities = state.opportunities.filter(opportunity => opportunity.id !== action.payload);
        state.total -= 1;
        if (state.selectedOpportunity?.id === action.payload) {
          state.selectedOpportunity = null;
        }
      })
      .addCase(deleteOpportunity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete opportunity';
      });
  },
});

export const { setSelectedOpportunity, clearError, setPage, setLimit } = opportunitiesSlice.actions;
export default opportunitiesSlice.reducer;
