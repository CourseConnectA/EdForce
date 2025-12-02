import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { createAccount, updateAccount } from '../../store/slices/accountsSlice';
import { Account, CreateAccountDto, UpdateAccountDto } from '../../services/accountsService';

interface AccountFormProps {
  open: boolean;
  onClose: () => void;
  account?: Account | null;
  mode: 'create' | 'edit';
}

const validationSchema = Yup.object({
  name: Yup.string()
    .required('Account name is required')
    .min(2, 'Account name must be at least 2 characters')
    .max(150, 'Account name must be less than 150 characters'),
  industry: Yup.string()
    .max(100, 'Industry must be less than 100 characters'),
  website: Yup.string()
    .url('Website must be a valid URL')
    .nullable(),
  phoneOffice: Yup.string()
    .matches(/^[\+]?[\s\-\(\)]*([0-9][\s\-\(\)]*){10,}$/, 'Phone number is not valid')
    .nullable(),
  accountType: Yup.string()
    .oneOf(['Customer', 'Prospect', 'Partner', 'Reseller', 'Competitor', 'Other'])
    .nullable(),
  rating: Yup.string()
    .oneOf(['Hot', 'Warm', 'Cold'])
    .nullable(),
  annualRevenue: Yup.number()
    .positive('Annual revenue must be positive')
    .nullable(),
  employees: Yup.number()
    .positive('Number of employees must be positive')
    .integer('Number of employees must be a whole number')
    .nullable(),
  billingAddressStreet: Yup.string()
    .max(150, 'Address must be less than 150 characters'),
  billingAddressCity: Yup.string()
    .max(100, 'City must be less than 100 characters'),
  billingAddressState: Yup.string()
    .max(100, 'State must be less than 100 characters'),
  billingAddressCountry: Yup.string()
    .max(100, 'Country must be less than 100 characters'),
  billingAddressPostalcode: Yup.string()
    .max(20, 'Postal code must be less than 20 characters'),
  description: Yup.string()
    .max(1000, 'Description must be less than 1000 characters'),
});

const AccountForm: React.FC<AccountFormProps> = ({ open, onClose, account, mode }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.accounts);

  const initialValues = {
    name: account?.name || '',
    industry: account?.industry || '',
    website: account?.website || '',
    phoneOffice: account?.phoneOffice || '',
    accountType: account?.accountType || 'Prospect',
    rating: account?.rating || 'Warm',
    annualRevenue: account?.annualRevenue || '',
    employees: account?.employees || '',
    billingAddressStreet: account?.billingAddressStreet || '',
    billingAddressCity: account?.billingAddressCity || '',
    billingAddressState: account?.billingAddressState || '',
    billingAddressCountry: account?.billingAddressCountry || '',
    billingAddressPostalcode: account?.billingAddressPostalcode || '',
    description: account?.description || '',
  };

  const handleSubmit = async (values: any) => {
    try {
      // Convert empty strings to undefined for optional fields
      const formData = {
        name: values.name,
        industry: values.industry || undefined,
        website: values.website || undefined,
        phoneOffice: values.phoneOffice || undefined,
        accountType: values.accountType || undefined,
        rating: values.rating || undefined,
        billingAddressStreet: values.billingAddressStreet || undefined,
        billingAddressCity: values.billingAddressCity || undefined,
        billingAddressState: values.billingAddressState || undefined,
        billingAddressCountry: values.billingAddressCountry || undefined,
        billingAddressPostalcode: values.billingAddressPostalcode || undefined,
        description: values.description || undefined,
        annualRevenue: values.annualRevenue ? Number(values.annualRevenue) : undefined,
        employees: values.employees ? Number(values.employees) : undefined,
      };

      if (mode === 'create') {
        await dispatch(createAccount(formData as CreateAccountDto)).unwrap();
      } else if (mode === 'edit' && account) {
        await dispatch(updateAccount({ id: account.id, data: formData as UpdateAccountDto })).unwrap();
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting account form:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {mode === 'create' ? 'Create New Account' : 'Edit Account'}
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
        {({ values, handleChange, handleBlur, errors, touched, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                    Basic Information
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="name"
                    label="Account Name *"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="industry"
                    label="Industry"
                    value={values.industry}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.industry && Boolean(errors.industry)}
                    helperText={touched.industry && errors.industry}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Account Type</InputLabel>
                    <Select
                      name="accountType"
                      value={values.accountType}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      label="Account Type"
                    >
                      <MenuItem value="Prospect">Prospect</MenuItem>
                      <MenuItem value="Customer">Customer</MenuItem>
                      <MenuItem value="Partner">Partner</MenuItem>
                      <MenuItem value="Reseller">Reseller</MenuItem>
                      <MenuItem value="Competitor">Competitor</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Rating</InputLabel>
                    <Select
                      name="rating"
                      value={values.rating}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      label="Rating"
                    >
                      <MenuItem value="Hot">Hot</MenuItem>
                      <MenuItem value="Warm">Warm</MenuItem>
                      <MenuItem value="Cold">Cold</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Contact Information */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', color: 'primary.main', mt: 2 }}>
                    Contact Information
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="phoneOffice"
                    label="Office Phone"
                    value={values.phoneOffice}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.phoneOffice && Boolean(errors.phoneOffice)}
                    helperText={touched.phoneOffice && errors.phoneOffice}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="website"
                    label="Website"
                    value={values.website}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.website && Boolean(errors.website)}
                    helperText={touched.website && errors.website}
                    placeholder="https://www.example.com"
                  />
                </Grid>

                {/* Address Information */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', color: 'primary.main', mt: 2 }}>
                    Billing Address
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="billingAddressStreet"
                    label="Street Address"
                    value={values.billingAddressStreet}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.billingAddressStreet && Boolean(errors.billingAddressStreet)}
                    helperText={touched.billingAddressStreet && errors.billingAddressStreet}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="billingAddressCity"
                    label="City"
                    value={values.billingAddressCity}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.billingAddressCity && Boolean(errors.billingAddressCity)}
                    helperText={touched.billingAddressCity && errors.billingAddressCity}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="billingAddressState"
                    label="State/Province"
                    value={values.billingAddressState}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.billingAddressState && Boolean(errors.billingAddressState)}
                    helperText={touched.billingAddressState && errors.billingAddressState}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="billingAddressCountry"
                    label="Country"
                    value={values.billingAddressCountry}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.billingAddressCountry && Boolean(errors.billingAddressCountry)}
                    helperText={touched.billingAddressCountry && errors.billingAddressCountry}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="billingAddressPostalcode"
                    label="Postal Code"
                    value={values.billingAddressPostalcode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.billingAddressPostalcode && Boolean(errors.billingAddressPostalcode)}
                    helperText={touched.billingAddressPostalcode && errors.billingAddressPostalcode}
                  />
                </Grid>

                {/* Additional Information */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', color: 'primary.main', mt: 2 }}>
                    Additional Information
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="annualRevenue"
                    label="Annual Revenue"
                    type="number"
                    value={values.annualRevenue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.annualRevenue && Boolean(errors.annualRevenue)}
                    helperText={touched.annualRevenue && errors.annualRevenue}
                    InputProps={{
                      startAdornment: <Typography sx={{ color: 'text.secondary', mr: 1 }}>₹</Typography>,
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="employees"
                    label="Number of Employees"
                    type="number"
                    value={values.employees}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.employees && Boolean(errors.employees)}
                    helperText={touched.employees && errors.employees}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="description"
                    label="Description"
                    multiline
                    rows={4}
                    value={values.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.description && Boolean(errors.description)}
                    helperText={touched.description && errors.description}
                    placeholder="Add any additional notes about this account..."
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
                {mode === 'create' ? 'Create Account' : 'Update Account'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default AccountForm;