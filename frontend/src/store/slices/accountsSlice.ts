import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { accountsService, Account, AccountsResponse, AccountsQueryParams, CreateAccountDto, UpdateAccountDto } from '../../services/accountsService';

export interface AccountsState {
  accounts: Account[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;
  selectedAccount: Account | null;
}

const initialState: AccountsState = {
  accounts: [],
  total: 0,
  page: 1,
  limit: 10,
  loading: false,
  error: null,
  selectedAccount: null,
};

// Async thunks
export const fetchAccounts = createAsyncThunk(
  'accounts/fetchAccounts',
  async (params?: AccountsQueryParams) => {
    const response = await accountsService.getAccounts(params);
    return response;
  }
);

export const fetchAccount = createAsyncThunk(
  'accounts/fetchAccount',
  async (id: string) => {
    const account = await accountsService.getAccount(id);
    return account;
  }
);

export const createAccount = createAsyncThunk(
  'accounts/createAccount',
  async (data: CreateAccountDto) => {
    const account = await accountsService.createAccount(data);
    return account;
  }
);

export const updateAccount = createAsyncThunk(
  'accounts/updateAccount',
  async ({ id, data }: { id: string; data: UpdateAccountDto }) => {
    const account = await accountsService.updateAccount(id, data);
    return account;
  }
);

export const deleteAccount = createAsyncThunk(
  'accounts/deleteAccount',
  async (id: string) => {
    await accountsService.deleteAccount(id);
    return id;
  }
);

const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    setSelectedAccount: (state, action: PayloadAction<Account | null>) => {
      state.selectedAccount = action.payload;
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
      // Fetch accounts
      .addCase(fetchAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action: PayloadAction<AccountsResponse>) => {
        state.loading = false;
        state.accounts = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch accounts';
      })
      // Fetch single account
      .addCase(fetchAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccount.fulfilled, (state, action: PayloadAction<Account>) => {
        state.loading = false;
        state.selectedAccount = action.payload;
      })
      .addCase(fetchAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch account';
      })
      // Create account
      .addCase(createAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAccount.fulfilled, (state, action: PayloadAction<Account>) => {
        state.loading = false;
        state.accounts.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create account';
      })
      // Update account
      .addCase(updateAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAccount.fulfilled, (state, action: PayloadAction<Account>) => {
        state.loading = false;
        const index = state.accounts.findIndex(account => account.id === action.payload.id);
        if (index !== -1) {
          state.accounts[index] = action.payload;
        }
        if (state.selectedAccount?.id === action.payload.id) {
          state.selectedAccount = action.payload;
        }
      })
      .addCase(updateAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update account';
      })
      // Delete account
      .addCase(deleteAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.accounts = state.accounts.filter(account => account.id !== action.payload);
        state.total -= 1;
        if (state.selectedAccount?.id === action.payload) {
          state.selectedAccount = null;
        }
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete account';
      });
  },
});

export const { setSelectedAccount, clearError, setPage, setLimit } = accountsSlice.actions;
export default accountsSlice.reducer;
