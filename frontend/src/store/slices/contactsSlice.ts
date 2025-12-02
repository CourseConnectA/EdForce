import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { contactsService, Contact, ContactsResponse, ContactsQueryParams, CreateContactDto, UpdateContactDto } from '../../services/contactsService';

export interface ContactsState {
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;
  selectedContact: Contact | null;
}

const initialState: ContactsState = {
  contacts: [],
  total: 0,
  page: 1,
  limit: 10,
  loading: false,
  error: null,
  selectedContact: null,
};

// Async thunks
export const fetchContacts = createAsyncThunk(
  'contacts/fetchContacts',
  async (params?: ContactsQueryParams) => {
    const response = await contactsService.getContacts(params);
    return response;
  }
);

export const fetchContact = createAsyncThunk(
  'contacts/fetchContact',
  async (id: string) => {
    const contact = await contactsService.getContact(id);
    return contact;
  }
);

export const createContact = createAsyncThunk(
  'contacts/createContact',
  async (data: CreateContactDto) => {
    const contact = await contactsService.createContact(data);
    return contact;
  }
);

export const updateContact = createAsyncThunk(
  'contacts/updateContact',
  async ({ id, data }: { id: string; data: UpdateContactDto }) => {
    const contact = await contactsService.updateContact(id, data);
    return contact;
  }
);

export const deleteContact = createAsyncThunk(
  'contacts/deleteContact',
  async (id: string) => {
    await contactsService.deleteContact(id);
    return id;
  }
);

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    setSelectedContact: (state, action: PayloadAction<Contact | null>) => {
      state.selectedContact = action.payload;
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
      // Fetch contacts
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action: PayloadAction<ContactsResponse>) => {
        state.loading = false;
        state.contacts = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch contacts';
      })
      // Fetch single contact
      .addCase(fetchContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContact.fulfilled, (state, action: PayloadAction<Contact>) => {
        state.loading = false;
        state.selectedContact = action.payload;
      })
      .addCase(fetchContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch contact';
      })
      // Create contact
      .addCase(createContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createContact.fulfilled, (state, action: PayloadAction<Contact>) => {
        state.loading = false;
        state.contacts.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create contact';
      })
      // Update contact
      .addCase(updateContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateContact.fulfilled, (state, action: PayloadAction<Contact>) => {
        state.loading = false;
        const index = state.contacts.findIndex(contact => contact.id === action.payload.id);
        if (index !== -1) {
          state.contacts[index] = action.payload;
        }
        if (state.selectedContact?.id === action.payload.id) {
          state.selectedContact = action.payload;
        }
      })
      .addCase(updateContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update contact';
      })
      // Delete contact
      .addCase(deleteContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteContact.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.contacts = state.contacts.filter(contact => contact.id !== action.payload);
        state.total -= 1;
        if (state.selectedContact?.id === action.payload) {
          state.selectedContact = null;
        }
      })
      .addCase(deleteContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete contact';
      });
  },
});

export const { setSelectedContact, clearError, setPage, setLimit } = contactsSlice.actions;
export default contactsSlice.reducer;
