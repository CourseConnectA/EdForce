import React from 'react';
import { Drawer, Box, Typography, List, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

interface Props {
  open: boolean;
  phoneNumber: string;
  onClose: () => void;
  onChoose: (type: 'normal' | 'business') => void;
}

const WhatsAppChooserModal: React.FC<Props> = ({ open, phoneNumber, onClose, onChoose }) => {
  return (
    <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { borderTopLeftRadius: 12, borderTopRightRadius: 12 } }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Open with</Typography>
        <List>
          <ListItemButton onClick={() => onChoose('normal')}>
            <ListItemIcon>
              <WhatsAppIcon color="success" />
            </ListItemIcon>
            <ListItemText primary="WhatsApp" secondary={phoneNumber} />
          </ListItemButton>
          <Divider />
          <ListItemButton onClick={() => onChoose('business')}>
            <ListItemIcon>
              <WhatsAppIcon color="success" />
            </ListItemIcon>
            <ListItemText primary="WhatsApp Business" secondary={phoneNumber} />
          </ListItemButton>
        </List>
      </Box>
    </Drawer>
  );
};

export default WhatsAppChooserModal;
