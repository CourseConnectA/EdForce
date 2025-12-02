import React, { useEffect, useState } from 'react';
import { Grid, TextField, FormControlLabel, Checkbox, MenuItem, Select, InputLabel, FormControl, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import customFieldsService, { CustomFieldDefinition, EntityType } from '../../services/customFieldsService';

interface Props {
  entityType: EntityType;
  recordId?: string; // when editing, to load existing values
  onValuesChange?: (values: Record<string, any>) => void;
}

const CustomFieldsRenderer: React.FC<Props> = ({ entityType, recordId, onValuesChange }) => {
  const [defs, setDefs] = useState<CustomFieldDefinition[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await customFieldsService.listDefinitions(entityType);
      if (!mounted) return;
      setDefs(list);
      if (recordId) {
        const v = await customFieldsService.getValues(entityType, recordId);
        if (mounted) {
          setValues(v || {});
          onValuesChange?.(v || {});
        }
      } else {
        const defaults: Record<string, any> = {};
        for (const d of list) {
          if (d.defaultValue !== undefined && d.defaultValue !== null) {
            defaults[d.key] = d.defaultValue;
          }
        }
        setValues(defaults);
        onValuesChange?.(defaults);
      }
    })();
    return () => { mounted = false; };
  }, [entityType, recordId]);

  const handleChange = (key: string, value: any) => {
    const next = { ...values, [key]: value };
    setValues(next);
    onValuesChange?.(next);
  };

  if (!defs.length) return null;

  return (
    <>
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', color: 'primary.main', mt: 2 }}>
          Custom Fields
        </Typography>
      </Grid>
      {defs.map((def) => (
        <Grid key={def.id} item xs={12} sm={def.fieldType === 'textarea' ? 12 : 6}>
          {def.fieldType === 'text' && (
            <TextField
              fullWidth
              label={labelWithAsterisk(def)}
              value={values[def.key] ?? ''}
              onChange={(e) => handleChange(def.key, e.target.value)}
              helperText={def.helpText}
            />
          )}
          {def.fieldType === 'textarea' && (
            <TextField
              fullWidth
              multiline
              minRows={3}
              label={labelWithAsterisk(def)}
              value={values[def.key] ?? ''}
              onChange={(e) => handleChange(def.key, e.target.value)}
              helperText={def.helpText}
            />
          )}
          {def.fieldType === 'number' && (
            <TextField
              fullWidth
              type="number"
              label={labelWithAsterisk(def)}
              value={values[def.key] ?? ''}
              onChange={(e) => handleChange(def.key, e.target.value)}
              helperText={def.helpText}
            />
          )}
          {def.fieldType === 'date' && (
            <DatePicker
              label={labelWithAsterisk(def)}
              value={values[def.key] || null}
              onChange={(newValue) => handleChange(def.key, newValue)}
              slotProps={{ textField: { fullWidth: true, helperText: def.helpText } }}
            />
          )}
          {def.fieldType === 'boolean' && (
            <FormControlLabel
              control={<Checkbox checked={!!values[def.key]} onChange={(e) => handleChange(def.key, e.target.checked)} />}
              label={labelWithAsterisk(def)}
            />
          )}
          {def.fieldType === 'select' && (
            <FormControl fullWidth>
              <InputLabel>{labelWithAsterisk(def)}</InputLabel>
              <Select
                label={labelWithAsterisk(def)}
                value={values[def.key] ?? ''}
                onChange={(e) => handleChange(def.key, e.target.value)}
              >
                {(def.options || []).map((opt, idx) => {
                  const val = typeof opt === 'string' ? opt : (opt as any).value;
                  const lbl = typeof opt === 'string' ? opt : (opt as any).label;
                  return <MenuItem key={idx} value={val}>{lbl}</MenuItem>;
                })}
              </Select>
            </FormControl>
          )}
          {def.fieldType === 'multiselect' && (
            <FormControl fullWidth>
              <InputLabel>{labelWithAsterisk(def)}</InputLabel>
              <Select
                label={labelWithAsterisk(def)}
                multiple
                value={Array.isArray(values[def.key]) ? values[def.key] : []}
                onChange={(e) => handleChange(def.key, e.target.value)}
                renderValue={(selected) => (selected as string[]).join(', ')}
              >
                {(def.options || []).map((opt, idx) => {
                  const val = typeof opt === 'string' ? opt : (opt as any).value;
                  const lbl = typeof opt === 'string' ? opt : (opt as any).label;
                  return <MenuItem key={idx} value={val}>{lbl}</MenuItem>;
                })}
              </Select>
            </FormControl>
          )}
        </Grid>
      ))}
    </>
  );
};

function labelWithAsterisk(def: CustomFieldDefinition) {
  return `${def.name}${def.required ? ' *' : ''}`;
}

export default CustomFieldsRenderer;
