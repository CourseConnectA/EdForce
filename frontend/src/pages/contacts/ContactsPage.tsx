import React, { useState } from 'react';
import { Box } from '@mui/material';
import ContactsDataTable from '../../components/contacts/ContactsDataTable';
import ContactForm from '../../components/contacts/ContactForm';
import { Contact } from '../../services/contactsService';

const ContactsPage: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const handleCreateContact = () => {
    setCreateDialogOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setEditDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedContact(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <ContactsDataTable
        onCreateContact={handleCreateContact}
        onEditContact={handleEditContact}
      />
      
      {/* Create Contact Dialog */}
      <ContactForm
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        mode="create"
      />

      {/* Edit Contact Dialog */}
      <ContactForm
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        contact={selectedContact}
        mode="edit"
      />
    </Box>
  );
};

export default ContactsPage;