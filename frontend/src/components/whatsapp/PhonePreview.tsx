import React from 'react';
import { Card, Box, Typography, Stack, Button } from '@mui/material';

export interface PhonePreviewProps {
  headerType?: 'IMAGE' | 'NONE';
  headerImageUrl?: string;
  body: string;
  footer?: string;
  buttons?: { text: string }[];
}

const PhonePreview: React.FC<PhonePreviewProps> = ({ headerType = 'NONE', headerImageUrl, body, footer, buttons }) => {
  return (
    <Card sx={{ width: 360, borderRadius: 3, p: 1, bgcolor: '#f0f2f5' }}>
      <Box sx={{ bgcolor: '#fff', borderRadius: 2, overflow: 'hidden', boxShadow: 1 }}>
        {headerType === 'IMAGE' && headerImageUrl && (
          <Box sx={{ width: '100%', height: 160, bgcolor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={headerImageUrl} alt="Header" style={{ maxWidth: '100%', maxHeight: '100%' }} />
          </Box>
        )}
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: '#111' }}>
            {body}
          </Typography>
          {footer && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {footer}
            </Typography>
          )}
        </Box>
        {buttons && buttons.length > 0 && (
          <Stack spacing={0} sx={{ borderTop: '1px solid #eee', p: 1 }}>
            {buttons.map((b, i) => (
              <Button key={i} fullWidth size="small" sx={{ justifyContent: 'flex-start' }}>
                {b.text}
              </Button>
            ))}
          </Stack>
        )}
      </Box>
    </Card>
  );
};

export default PhonePreview;
