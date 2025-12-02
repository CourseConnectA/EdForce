import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid, Box, Typography, IconButton, Autocomplete } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
// DatePicker removed with dynamic form; keep if used later
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { createOpportunity, updateOpportunity } from '../../store/slices/opportunitiesSlice';
import { fetchAccounts } from '../../store/slices/accountsSlice';
import { fetchContacts } from '../../store/slices/contactsSlice';
import contactsService from '../../services/contactsService';
import { Opportunity, CreateOpportunityDto, UpdateOpportunityDto } from '../../services/opportunitiesService';
import EntityFieldsRenderer from '../custom-fields/EntityFieldsRenderer';
import customFieldsService, { CustomFieldDefinition } from '../../services/customFieldsService';

interface OpportunityFormProps {
  open: boolean;
  onClose: () => void;
  opportunity?: Opportunity | null;
  mode: 'create' | 'edit';
}

function buildValidation(defs: CustomFieldDefinition[]) {
  const shape: Record<string, any> = {};
  defs.forEach((d) => {
    const key = (d.targetField || d.key) as string;
    let rule: any;
    switch (d.fieldType) {
      case 'number':
        rule = Yup.number();
        break;
      case 'date':
        rule = Yup.mixed();
        break;
      case 'boolean':
        rule = Yup.boolean();
        break;
      default:
        rule = Yup.string();
    }
    if (d.required) rule = rule.required(`${d.name} is required`);
    shape[key] = rule;
  });
  return Yup.object(shape);
}

const OpportunityForm: React.FC<OpportunityFormProps> = ({ open, onClose, opportunity, mode }) => {
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [groups, setGroups] = useState<Array<{ name: string; fields: CustomFieldDefinition[] }>>([]);
  // systemDefs not needed outside init/validation
  const [validationSchema, setValidationSchema] = useState<any>(Yup.object({}));
  const [initialValues, setInitialValues] = useState<Record<string, any>>({});
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.opportunities);
  const { accounts } = useSelector((state: RootState) => state.accounts);
  const { contacts } = useSelector((state: RootState) => state.contacts);
  
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [loadingAccountContacts, setLoadingAccountContacts] = useState(false);
  const [hasAccountScopedContacts, setHasAccountScopedContacts] = useState(false);
  const [showingAllContactsFallback, setShowingAllContactsFallback] = useState(false);

  // Fetch accounts and contacts for dropdowns
  useEffect(() => {
    if (open) {
      dispatch(fetchAccounts({ limit: 100 }));
  dispatch(fetchContacts({ limit: 100 }));
    }
  }, [open, dispatch]);

  // When account changes, fetch contacts for that account to ensure list is up to date
  useEffect(() => {
    if (open && selectedAccount?.id) {
      let cancelled = false;
      setLoadingAccountContacts(true);
      setHasAccountScopedContacts(false);
  console.log('[OpportunityForm] Fetching contacts for account', selectedAccount?.id);

      (async () => {
        try {
          // First, try the by-account route
          const res = await contactsService.getContactsByAccount(selectedAccount.id, { limit: 100 });
          let list = Array.isArray((res as any).data) ? (res as any).data : (res as any);
          console.log('[OpportunityForm] Contacts fetched via by-account:', selectedAccount?.id, 'count:', (list || []).length);

          // If empty, try query-param route as a fallback
          if (!list || list.length === 0) {
            const alt = await contactsService.getContacts({ limit: 100, accountId: selectedAccount.id });
            list = Array.isArray((alt as any).data) ? (alt as any).data : (alt as any);
            console.log('[OpportunityForm] Contacts fetched via query-param route:', selectedAccount?.id, 'count:', (list || []).length);
          }

          if (cancelled) return;
          if (list && list.length) {
            setFilteredContacts(list);
            setHasAccountScopedContacts(true);
            setShowingAllContactsFallback(false);
          } else {
            // Actively fetch contacts via Redux, then filter by account immediately
            try {
              const fetched = await dispatch(fetchContacts({ limit: 100 })).unwrap();
              const filtered = (fetched?.data || []).filter((c: any) => {
                const contactAccountId = c.accountId ?? c.account?.id ?? c.account_id;
                return contactAccountId === selectedAccount.id;
              });
              if (filtered.length) {
                setFilteredContacts(filtered);
                setHasAccountScopedContacts(true);
                setShowingAllContactsFallback(false);
              } else {
                // Final fallback: show all contacts so user isn't blocked
                setFilteredContacts(fetched?.data || contacts);
                setHasAccountScopedContacts(false);
                setShowingAllContactsFallback(true);
              }
            } catch (e) {
              // If Redux fetch fails, fallback to current store
              setFilteredContacts(contacts);
              setHasAccountScopedContacts(false);
              setShowingAllContactsFallback(true);
            }
          }

          // Reset selected contact if it doesn't match
          if (
            selectedContact &&
            ((selectedContact.accountId ?? selectedContact.account?.id ?? (selectedContact as any).account_id) !== selectedAccount.id)
          ) {
            setSelectedContact(null);
          }
        } catch (err) {
          console.error('Failed to load contacts for account:', err);
          const fallback = contacts.filter((c: any) => {
            const contactAccountId = c.accountId ?? c.account?.id ?? c.account_id;
            return contactAccountId === selectedAccount.id;
          });
          setFilteredContacts(fallback.length ? fallback : contacts);
          setHasAccountScopedContacts(!!fallback.length);
          setShowingAllContactsFallback(!fallback.length);
        } finally {
          if (!cancelled) setLoadingAccountContacts(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }
  }, [open, selectedAccount?.id, contacts, dispatch]);

  // Set selected account and contact when editing
  useEffect(() => {
    if (opportunity?.account) {
      setSelectedAccount(opportunity.account);
    } else {
      setSelectedAccount(null);
    }
    
    if (opportunity?.contact) {
      setSelectedContact(opportunity.contact);
    } else {
      setSelectedContact(null);
    }
  }, [opportunity]);

  // Filter contacts by selected account
  useEffect(() => {
    if (selectedAccount) {
      // If we already loaded account-scoped contacts, don't override them with global store
      if (!loadingAccountContacts && !hasAccountScopedContacts) {
        // Some API responses may include account_id (snake), accountId, or nested account.id
        const accountContacts = contacts.filter((contact: any) => {
          const contactAccountId = contact.accountId ?? contact.account?.id ?? contact.account_id;
          return contactAccountId === selectedAccount.id;
        });
        setFilteredContacts(accountContacts);
      }
      
      // Clear contact selection if it doesn't belong to the selected account
      if (selectedContact) {
        const selectedContactAccountId = selectedContact.accountId ?? selectedContact.account?.id ?? (selectedContact as any).account_id;
        if (selectedContactAccountId !== selectedAccount.id) {
          setSelectedContact(null);
        }
      }
    } else {
      setFilteredContacts(contacts);
    }
  }, [selectedAccount, contacts, selectedContact, loadingAccountContacts, hasAccountScopedContacts]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!open) return; // only load when modal is open
      const g = await customFieldsService.listGroups('opportunity');
      if (!mounted) return;
      g.forEach((grp) => grp.fields.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      setGroups(g);
      const sys = g.flatMap((grp) => grp.fields).filter((f) => f.isSystem);
      const init: Record<string, any> = {};
      sys.forEach((d) => {
        const k = (d.targetField || d.key) as string;
        init[k] = (opportunity as any)?.[k] ?? (d.fieldType === 'date' ? null : '');
      });
      setInitialValues(init);
      setValidationSchema(buildValidation(sys));
    })();
    return () => { mounted = false; };
  }, [open, opportunity]);

  const handleSubmit = async (values: any) => {
    try {
      if (!selectedAccount) {
        alert('Please select an account');
        return;
      }

      // Convert empty strings to undefined for optional fields
      // Handle date conversion properly (send date-only string YYYY-MM-DD)
      let dateClosedExpectedISO: string | undefined = undefined;
      if (values.dateClosedExpected) {
        const dateValue = values.dateClosedExpected instanceof Date
          ? values.dateClosedExpected
          : new Date(values.dateClosedExpected);

        if (!isNaN(dateValue.getTime())) {
          const yyyy = dateValue.getFullYear();
          const mm = String(dateValue.getMonth() + 1).padStart(2, '0');
          const dd = String(dateValue.getDate()).padStart(2, '0');
          dateClosedExpectedISO = `${yyyy}-${mm}-${dd}`; // e.g., 2025-10-21
        }
      }

      const formData = {
        ...values,
        amount: Number(values.amount),
  dateClosedExpected: dateClosedExpectedISO,
        description: values.description || undefined,
        nextStep: values.nextStep || undefined,
        accountId: selectedAccount.id,
        contactId: selectedContact?.id || undefined,
      };

      console.log('Form data being sent to backend:', formData);
      console.log('Form data types:', {
        name: typeof formData.name,
        amount: typeof formData.amount,
        salesStage: typeof formData.salesStage,
        probability: typeof formData.probability,
        dateClosedExpected: typeof formData.dateClosedExpected,
        accountId: typeof formData.accountId,
        contactId: typeof formData.contactId,
      });

      let recordId = opportunity?.id;
      if (mode === 'create') {
        const created = await dispatch(createOpportunity(formData as CreateOpportunityDto)).unwrap() as any;
        recordId = created?.id;
      } else if (mode === 'edit' && opportunity) {
        await dispatch(updateOpportunity({ id: opportunity.id, data: formData as UpdateOpportunityDto })).unwrap();
        recordId = opportunity.id;
      }
      if (recordId) {
        await customFieldsService.saveValues('opportunity', recordId, customValues);
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error submitting opportunity form:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      
      // Log the backend validation error details
      if (error?.response?.data) {
        console.error('Backend validation error:', JSON.stringify(error.response.data, null, 2));
      }
      
      // Show validation errors to user
      if (error?.response?.data?.message) {
        const errorMessage = Array.isArray(error.response.data.message) 
          ? error.response.data.message.join(', ')
          : error.response.data.message;
        alert(`Validation Error: ${errorMessage}`);
      } else {
        alert(`Error: ${error.message || 'Unknown error occurred'}`);
      }
    }
  };

  // Removed unused helper getStageProbability

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {mode === 'create' ? 'Create New Opportunity' : 'Edit Opportunity'}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, handleChange, handleBlur, errors, touched, isSubmitting, setFieldValue }) => (
            <Form>
              <DialogContent dividers>
                <Grid container spacing={3}>
                  {/* Account & Contact kept outside dynamic definitions */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                      Account & Contact
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      value={selectedAccount}
                      onChange={(_, newValue) => {
                        setSelectedAccount(newValue);
                      }}
                      options={accounts}
                      getOptionLabel={(option) => option.name || ''}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Account *"
                          placeholder="Select an account"
                          helperText="This opportunity must be associated with an account"
                          error={!selectedAccount}
                        />
                      )}
                      renderOption={(props, option) => {
                        const { key, ...liProps } = props as any;
                        return (
                        <Box component="li" key={key} {...liProps}>
                          <div>
                            <Typography variant="body2" fontWeight="medium">
                              {option.name}
                            </Typography>
                            <Typography variant="caption" component="span" color="text.secondary">
                              {option.industry} • {option.type}
                            </Typography>
                          </div>
                        </Box>
                        );
                      }}
                      noOptionsText="No accounts found"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      value={selectedContact}
                      onChange={(_, newValue) => {
                        setSelectedContact(newValue);
                      }}
                      options={filteredContacts}
                      loading={loadingAccountContacts}
                      getOptionLabel={(option) => `${option.firstName ?? ''} ${option.lastName ?? ''}`.trim()}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      disabled={!selectedAccount}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Contact"
                          placeholder="Select a contact"
                          helperText={
                            selectedAccount
                              ? (loadingAccountContacts
                                  ? 'Loading contacts…'
                                  : (showingAllContactsFallback
                                      ? 'No contacts found for this account — showing all contacts'
                                      : 'Contacts from the selected account'))
                              : 'Select an account first'
                          }
                        />
                      )}
                      renderOption={(props, option) => {
                        const { key, ...liProps } = props as any;
                        return (
                        <Box component="li" key={key} {...liProps}>
                          <div>
                            <Typography variant="body2" fontWeight="medium">
                              {`${option.firstName} ${option.lastName}`}
                            </Typography>
                            <Typography variant="caption" component="span" color="text.secondary">
                              {option.title || 'No title'} • {option.email || option.email1 || 'No email'}
                            </Typography>
                          </div>
                        </Box>
                        );
                      }}
                      loadingText="Loading contacts…"
                      noOptionsText={loadingAccountContacts ? 'Loading…' : 'No contacts found for this account'}
                    />
                  </Grid>

                  {/* Dynamic grouped fields */}
                  <Grid item xs={12}>
                    <EntityFieldsRenderer
                      entityType="opportunity"
                      recordId={mode === 'edit' ? opportunity?.id : undefined}
                      form={{ values, errors, touched, handleChange, handleBlur, setFieldValue }}
                      groupsOverride={groups}
                      onCustomValuesChange={setCustomValues}
                    />
                  </Grid>
                </Grid>
              </DialogContent>

              <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose} disabled={loading || isSubmitting}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={loading || isSubmitting}
                >
                  {mode === 'create' ? 'Create Opportunity' : 'Update Opportunity'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </LocalizationProvider>
  );
};

export default OpportunityForm;