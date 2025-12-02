import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	FormControlLabel,
	Grid,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Switch,
	Tab,
	Tabs,
	TextField,
	Typography,
	Chip,
	Stack,
} from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Close as CloseIcon } from '@mui/icons-material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import customFieldsService, { CustomFieldDefinition, CreateCustomFieldDefinitionDto, UpdateCustomFieldDefinitionDto, EntityType, FieldType } from '../../services/customFieldsService';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

const FIELD_TYPE_OPTIONS: { label: string; value: FieldType }[] = [
	{ label: 'Text', value: 'text' },
	{ label: 'Textarea', value: 'textarea' },
	{ label: 'Number', value: 'number' },
	{ label: 'Date', value: 'date' },
	{ label: 'Boolean', value: 'boolean' },
	{ label: 'Select', value: 'select' },
	{ label: 'Multi Select', value: 'multiselect' },
];

const validationSchema = Yup.object({
	name: Yup.string().required('Field label is required').max(128),
	key: Yup.string().max(128),
	fieldType: Yup.mixed<FieldType>().oneOf(FIELD_TYPE_OPTIONS.map((o) => o.value)).required(),
	order: Yup.number().min(0).integer().optional(),
});

const SettingsCustomFieldsPage: React.FC = () => {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
	const { user } = useSelector((s: RootState) => s.auth);
	const derivedRole = String((user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : 'counselor')).toLowerCase();
	const canEdit = derivedRole === 'center-manager';
	const canAccess = derivedRole === 'center-manager';
	// Lock to leads only
	const [entityType] = useState<EntityType>('lead');
	const entityTypeRef = useRef<EntityType>('lead');
	const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
	const [loading, setLoading] = useState(false);
	const [openDialog, setOpenDialog] = useState(false);
	const [editing, setEditing] = useState<CustomFieldDefinition | null>(null);

	const load = async (type: EntityType) => {
		setLoading(true);
			try {
				const list = await customFieldsService.listDefinitions(type, true);
				// Only apply if the response matches the current tab to avoid race conditions
				if (type === entityTypeRef.current) {
					setFields(list);
				}
		} finally {
			setLoading(false);
		}
	};

	const handleSeedSystem = async () => {
		if (!confirm('Seed system lead fields? This will insert default system fields if missing.')) return;
		setLoading(true);
		try {
			await customFieldsService.seedLeadSystemFields();
			await load('lead');
			console.log('System fields seeded. You can now toggle them on/off.');
		} catch (e: any) {
			console.error(e?.message || 'Failed to seed system fields');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		entityTypeRef.current = 'lead';
		load('lead');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

		const handleToggleRequired = async (row: CustomFieldDefinition, next: boolean) => {
			// Optimistic UI update
			setFields((prev) => prev.map((f) => (f.id === row.id ? { ...f, required: next } : f)));
			try {
				await customFieldsService.updateDefinition(row.id, { required: next });
			} catch (e) {
				// Revert on failure
				setFields((prev) => prev.map((f) => (f.id === row.id ? { ...f, required: row.required } : f)));
			}
		};

		const handleToggleActive = async (row: CustomFieldDefinition, next: boolean) => {
			setFields((prev) => prev.map((f) => (f.id === row.id ? { ...f, active: next } : f)));
			try {
				await customFieldsService.updateDefinition(row.id, { active: next });
			} catch (e) {
				setFields((prev) => prev.map((f) => (f.id === row.id ? { ...f, active: row.active } : f)));
			}
		};

		const columns: GridColDef[] = useMemo(() => [
			{ field: 'order', headerName: '#', width: 60 },
			{ field: 'name', headerName: 'Field', flex: 1, minWidth: 180 },
			{ field: 'key', headerName: 'Key', flex: 1, minWidth: 160 },
			{ field: 'groupName', headerName: 'Group', width: 160 },
			{ field: 'fieldType', headerName: 'Type', width: 140 },
			{ field: 'targetField', headerName: 'Target Field', width: 160 },
			{
				field: 'required', headerName: 'Required', width: 140, renderCell: (params) => (
					params.row.isSystem ? (
						<FormControlLabel
							control={<Switch checked={!!params.row.required} onChange={(e) => handleToggleRequired(params.row, e.target.checked)} />}
							label={params.row.required ? 'Required' : 'Optional'}
						/>
					) : (
						<Chip size="small" label={params.row.required ? 'Yes' : 'No'} color={params.row.required ? 'warning' : 'default'} />
					)
				)
			},
			{
				field: 'active', headerName: 'Visible', width: 140, renderCell: (params) => (
					params.row.isSystem ? (
						<FormControlLabel
							control={<Switch checked={!!params.row.active} onChange={(e) => handleToggleActive(params.row, e.target.checked)} />}
							label={params.row.active ? 'Shown' : 'Hidden'}
						/>
					) : (
						<Chip size="small" label={params.row.active ? 'Active' : 'Hidden'} color={params.row.active ? 'success' : 'default'} />
					)
				)
			},
			{
				field: 'actions', headerName: 'Actions', width: 140, sortable: false, filterable: false,
				renderCell: (params) => (
					params.row.isSystem ? (
						<Typography variant="caption" color="text.secondary">System field</Typography>
					) : (
						<Stack direction="row" spacing={1}>
							<IconButton aria-label="edit" onClick={() => { setEditing(params.row); setOpenDialog(true); }}>
								<EditIcon />
							</IconButton>
							<IconButton aria-label="delete" color="error" onClick={() => handleDelete(params.row.id)}>
								<DeleteIcon />
							</IconButton>
						</Stack>
					)
				)
			}
		], []);

		const handleDelete = async (id: string) => {
		if (!confirm('Delete this field? This removes it from forms but keeps existing data. This cannot be undone.')) return;
		// Optimistically remove from UI for instant feedback
		setFields((prev) => prev.filter((f) => f.id !== id));
		try {
			await customFieldsService.deleteDefinition(id);
			await load(entityType);
		} catch (e) {
			// On failure, refetch to restore correct state
			await load(entityType);
		}
	};



		const handleOpenCreate = () => { setEditing(null); setOpenDialog(true); };
	const handleCloseDialog = () => setOpenDialog(false);

	if (!canAccess) {
		return (
			<Box>
				<Typography variant="h5" sx={{ mb: 2 }}>Settings • Custom Fields</Typography>
				<Typography variant="body2" color="text.secondary">Only Center Managers can configure custom fields.</Typography>
			</Box>
		);
	}

	return (
		<Box>
			<Typography variant="h5" sx={{ mb: 2 }}>Settings • Custom Fields</Typography>
			{/* Only Leads custom fields are supported */}
			<Tabs value={entityType} sx={{ mb: 2 }}>
				<Tab value="lead" label="Leads" />
			</Tabs>

			<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 2 : 0, alignItems: isMobile ? 'stretch' : 'center' }}>
				<Typography variant="subtitle1" color="text.secondary">
					Define additional fields for {entityType}s. Use them in forms and reports.
				</Typography>
					<Stack direction={isMobile ? 'column' : 'row'} spacing={1} width={isMobile ? '100%' : 'auto'}>
						<Button variant="outlined" onClick={handleSeedSystem} disabled={!canEdit}>Seed System Fields</Button>
						<Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate} fullWidth={isMobile} disabled={!canEdit}>Add Field</Button>
					</Stack>
			</Box>

			<div style={{ height: isMobile ? 'auto' : 520, width: '100%', overflowX: 'auto' }}>
				<DataGrid
					rows={fields}
					columns={columns}
					getRowId={(r) => r.id}
					loading={loading}
					disableRowSelectionOnClick
					density={isMobile ? 'compact' : 'standard'}
					autoHeight={isMobile}
					sx={{ scrollbarGutter: 'stable both-edges' }}
				/>
			</div>

			<FieldDialog
				open={openDialog}
				onClose={handleCloseDialog}
				entityType={entityType}
				initial={editing || undefined}
				onSaved={() => { handleCloseDialog(); load(entityType); }}
			/>
		</Box>
	);
};

const FieldDialog: React.FC<{
	open: boolean;
	onClose: () => void;
	entityType: EntityType;
	initial?: CustomFieldDefinition;
	onSaved: () => void;
}> = ({ open, onClose, entityType, initial, onSaved }) => {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
		const isEdit = !!initial;
	const [optionsText, setOptionsText] = useState('');

	useEffect(() => {
		if (initial?.options) {
			const list = initial.options.map((o) => typeof o === 'string' ? o : (o?.value ?? o?.label));
			setOptionsText(list.join('\n'));
		} else {
			setOptionsText('');
		}
	}, [initial]);

		const initialValues: CreateCustomFieldDefinitionDto = {
		entityType,
		name: initial?.name || '',
		key: initial?.key || '',
		fieldType: (initial?.fieldType as FieldType) || 'text',
			required: initial?.required ?? false,
		order: initial?.order ?? 0,
			helpText: initial?.helpText || '',
			active: initial?.active ?? true,
			options: initial?.options || [],
			groupName: initial?.groupName || undefined,
			isSystem: initial?.isSystem || false,
			targetField: (initial as any)?.targetField || undefined,
	};

	const handleSubmit = async (values: CreateCustomFieldDefinitionDto) => {
		// Build options array only when select/multiselect
		let builtOptions: Array<{ label: string; value: string }> | undefined;
		if (values.fieldType === 'select' || values.fieldType === 'multiselect') {
			const lines = optionsText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
			// If editing and user didn't provide any lines but initial has options, don't send options to preserve
			if (!(isEdit && initial && initial.options && lines.length === 0)) {
				builtOptions = lines.map((s) => ({ label: s, value: s }));
			}
		}

		try {
			if (isEdit && initial) {
				// For update, DO NOT send entityType; construct Update DTO payload only with updatable fields
				const updatePayload: UpdateCustomFieldDefinitionDto = {
					name: values.name,
					key: values.key?.trim() || undefined,
					fieldType: values.fieldType,
					options: builtOptions, // undefined preserves, array updates
					required: values.required,
					order: values.order,
					groupName: values.groupName?.trim() || undefined,
					helpText: values.helpText?.trim() || undefined,
					active: values.active,
					// Allow mapping for system fields when present
					...(values.isSystem ? { isSystem: values.isSystem, targetField: (values as any).targetField?.trim() || undefined } : {}),
				};
				await customFieldsService.updateDefinition(initial.id, updatePayload);
			} else {
				const createPayload: CreateCustomFieldDefinitionDto = {
					entityType,
					name: values.name,
					key: values.key?.trim() || undefined,
					fieldType: values.fieldType,
					options: builtOptions,
					required: values.required,
					order: values.order,
					groupName: values.groupName?.trim() || undefined,
					helpText: values.helpText?.trim() || undefined,
					active: values.active,
					...(values.isSystem ? { isSystem: values.isSystem, targetField: (values as any).targetField?.trim() || undefined } : {}),
				};
				await customFieldsService.createDefinition(createPayload);
			}
			onSaved();
		} catch (err: any) {
			const msg = err?.response?.data?.message;
			console.error(Array.isArray(msg) ? msg.join(', ') : (msg || err?.message || 'Failed to save field'));
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
			<DialogTitle>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<Typography variant="h6">{isEdit ? 'Edit Field' : 'Add Field'}</Typography>
					<IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
				</Box>
			</DialogTitle>
			<Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
				{({ values, errors, touched, handleChange, handleBlur, isSubmitting, setFieldValue }) => (
					<Form>
						<DialogContent dividers>
										<Grid container spacing={2}>
								<Grid item xs={12}>
									<TextField
										fullWidth
										name="name"
										label="Field Label *"
										value={values.name}
										onChange={handleChange}
										onBlur={handleBlur}
										error={touched.name && Boolean(errors.name)}
										helperText={touched.name && errors.name}
									/>
								</Grid>

								<Grid item xs={12}>
									<TextField
										fullWidth
										name="key"
										label="Key (optional)"
										value={values.key}
										onChange={handleChange}
										onBlur={handleBlur}
													helperText="If blank, a key will be generated from the label"
													disabled={initial?.isSystem}
									/>
								</Grid>

								<Grid item xs={12} sm={6}>
									<FormControl fullWidth>
										<InputLabel>Field Type *</InputLabel>
										<Select
											name="fieldType"
											label="Field Type *"
											value={values.fieldType}
														onChange={(e) => {
															const val = String(e.target.value) as FieldType;
															setFieldValue('fieldType', val);
															// Reset options text when switching types
															if (val !== 'select' && val !== 'multiselect') {
																setOptionsText('');
															}
														}}
														disabled={initial?.isSystem}
										>
											{FIELD_TYPE_OPTIONS.map((o) => (
												<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
											))}
										</Select>
									</FormControl>
								</Grid>

								<Grid item xs={6} sm={3}>
									<TextField
										fullWidth
										name="order"
										type="number"
										label="Order"
										value={values.order}
										onChange={handleChange}
										onBlur={handleBlur}
									/>
								</Grid>

								<Grid item xs={6} sm={3}>
													<FormControlLabel
															control={<Switch checked={!!values.required} onChange={(e) => setFieldValue('required', e.target.checked)} />}
															label="Required"
														/>
								</Grid>

												<Grid item xs={12} sm={6}>
													<TextField
														fullWidth
														name="groupName"
														label="Group"
														value={values.groupName || ''}
														onChange={(e) => setFieldValue('groupName', e.target.value)}
														helperText="Optional group/section name where this field appears"
														placeholder="e.g., Basic Info, Address"
														select={false}
													/>
												</Grid>

												<Grid item xs={12} sm={6}>
													<FormControlLabel
														control={<Switch checked={!!values.active} onChange={(e) => setFieldValue('active', e.target.checked)} />}
														label="Active"
													/>
												</Grid>

												{(initial?.isSystem || values.isSystem) && (
													<Grid item xs={12}>
														<TextField
															fullWidth
															name="targetField"
															label="Target Field (entity property)"
															value={(values as any).targetField || ''}
															onChange={(e) => setFieldValue('targetField', e.target.value)}
															helperText="Map this definition to an existing entity property, e.g., firstName"
															disabled={initial?.isSystem}
														/>
													</Grid>
												)}

								<Grid item xs={12}>
									<TextField
										fullWidth
										name="helpText"
										label="Help Text"
										value={values.helpText}
										onChange={handleChange}
										onBlur={handleBlur}
									/>
								</Grid>

								{(['select','multiselect'] as FieldType[]).includes(values.fieldType as FieldType) && (
									<Grid item xs={12}>
										<TextField
											fullWidth
											label="Options (one per line)"
											multiline
											minRows={4}
											value={optionsText}
											onChange={(e) => setOptionsText(e.target.value)}
										/>
									</Grid>
								)}
							</Grid>
						</DialogContent>
						<DialogActions>
							<Button onClick={onClose}>Cancel</Button>
							<Button type="submit" variant="contained" disabled={isSubmitting}>{isEdit ? 'Save' : 'Create'}</Button>
						</DialogActions>
					</Form>
				)}
			</Formik>
		</Dialog>
	);
};

export default SettingsCustomFieldsPage;

