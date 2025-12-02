import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { createContact, updateContact } from '../../store/slices/contactsSlice';
import { fetchAccounts } from '../../store/slices/accountsSlice';
import { Contact, CreateContactDto, UpdateContactDto } from '../../services/contactsService';
import EntityFieldsRenderer from '../custom-fields/EntityFieldsRenderer';
import customFieldsService, { CustomFieldDefinition } from '../../services/customFieldsService';

interface ContactFormProps {
  open: boolean;
  onClose: () => void;
  contact?: Contact | null;
  mode: 'create' | 'edit';
}

// Dynamic validation builder
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
        rule = Yup.string();
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

const ContactForm: React.FC<ContactFormProps> = ({ open, onClose, contact, mode }) => {
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [groups, setGroups] = useState<Array<{ name: string; fields: CustomFieldDefinition[] }>>([]);
  // systemDefs not needed outside init/validation generation
  const [validationSchema, setValidationSchema] = useState<any>(Yup.object({}));
  const [initialValues, setInitialValues] = useState<Record<string, any>>({});
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.contacts);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  // Fetch accounts for dropdown
  useEffect(() => {
    if (open) {
      dispatch(fetchAccounts({ limit: 100 })); // Get more accounts for dropdown
    }
  }, [open, dispatch]);

  // Set selected account when editing
  useEffect(() => {
    if (contact?.account) {
      setSelectedAccount(contact.account);
    } else {
      setSelectedAccount(null);
    }
  }, [contact]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const g = await customFieldsService.listGroups('contact');
      if (!mounted) return;
      g.forEach((grp) => grp.fields.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      setGroups(g);
      const sys = g.flatMap((grp) => grp.fields).filter((f) => f.isSystem);
      const init: Record<string, any> = {};
      sys.forEach((d) => {
        const k = (d.targetField || d.key) as string;
        init[k] = (contact as any)?.[k] ?? '';
      });
      setInitialValues(init);
      setValidationSchema(buildValidation(sys));
    })();
    return () => { mounted = false; };
  }, [contact]);

  const handleSubmit = async (values: any) => {
    try {
      // Convert empty strings to undefined for optional fields
      const formData = {
        ...values,
        email1: values.email1 || undefined,
        phoneWork: values.phoneWork || undefined,
        phoneMobile: values.phoneMobile || undefined,
        title: values.title || undefined,
        department: values.department || undefined,
        primaryAddressStreet: values.primaryAddressStreet || undefined,
        primaryAddressCity: values.primaryAddressCity || undefined,
        primaryAddressState: values.primaryAddressState || undefined,
        primaryAddressCountry: values.primaryAddressCountry || undefined,
        primaryAddressPostalcode: values.primaryAddressPostalcode || undefined,
        leadSource: values.leadSource || undefined,
        description: values.description || undefined,
        accountId: selectedAccount?.id || undefined,
      };

      let recordId = contact?.id;
      if (mode === 'create') {
        const created = await dispatch(createContact(formData as CreateContactDto)).unwrap() as any;
        recordId = created?.id;
      } else if (mode === 'edit' && contact) {
        await dispatch(updateContact({ id: contact.id, data: formData as UpdateContactDto })).unwrap();
        recordId = contact.id;
      }
      if (recordId) {
        await customFieldsService.saveValues('contact', recordId, customValues);
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting contact form:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {mode === 'create' ? 'Create New Contact' : 'Edit Contact'}
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
              <EntityFieldsRenderer
                entityType="contact"
                recordId={mode === 'edit' ? contact?.id : undefined}
                form={{ values, errors, touched, handleChange, handleBlur, setFieldValue }}
                groupsOverride={groups}
                onCustomValuesChange={setCustomValues}
              />
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
                {mode === 'create' ? 'Create Contact' : 'Update Contact'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default ContactForm;