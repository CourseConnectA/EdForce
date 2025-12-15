import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Box, Container, Typography, Divider, Link, Paper } from '@mui/material';

const PrivacyPolicy: React.FC = () => {
  return (
    <Box component="main" sx={{ py: 6, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Helmet>
        <title>Privacy Policy — Edforce</title>
        <meta name="description" content="Edforce Privacy Policy — how we collect, use and protect personal information for our CRM platform." />
        <meta name="robots" content="index,follow" />
      </Helmet>

      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 0 } }}>
        <Paper elevation={1} sx={{ p: { xs: 3, md: 6 }, borderRadius: 2 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, mb: 0.75 }}>
            Privacy Policy
          </Typography>

          <Typography variant="subtitle1" color="text.secondary" paragraph sx={{ mb: 2 }}>
            Last updated: December 12, 2025
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'block' }}>
            <Box component="section" sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Introduction
              </Typography>
              <Typography paragraph sx={{ lineHeight: 1.85, mb: 1.5 }}>
                Edforce is committed to protecting your privacy. This Privacy Policy explains what information we collect, why we collect it, and how you can manage, export or delete that information. We keep this policy clear and focused so you can quickly find the answers you need.
              </Typography>
            </Box>

            <Box component="section" sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Information We Collect</Typography>
              <Typography paragraph sx={{ lineHeight: 1.85, mb: 1.5 }}>
                We collect information that helps deliver, maintain and improve our CRM services. This includes:
              </Typography>
              <Box component="ul" sx={{ pl: 3, lineHeight: 1.85, mb: 1.5 }}>
                <li>Account and profile data (name, email, organization)</li>
                <li>Contacts and CRM records you or your team upload or create</li>
                <li>Usage data (logs, feature usage, device and performance metrics)</li>
                <li>Support and communication records</li>
              </Box>
            </Box>

            <Box component="section" sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>How We Use Your Data</Typography>
              <Typography paragraph sx={{ lineHeight: 1.85, mb: 1.5 }}>
                We use data to operate and improve Edforce, including:
              </Typography>
              <Box component="ul" sx={{ pl: 3, lineHeight: 1.85, mb: 1.5 }}>
                <li>Provide, maintain and secure the service</li>
                <li>Process and sync CRM data across devices and integrations</li>
                <li>Improve features and deliver personalized product experiences</li>
                <li>Respond to support requests and detect abuse</li>
              </Box>
            </Box>

            <Box component="section" sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Sharing and Disclosure</Typography>
              <Typography paragraph sx={{ lineHeight: 1.85, mb: 1.5 }}>
                We do not sell your personal information. We may share data with:
              </Typography>
              <Box component="ul" sx={{ pl: 3, lineHeight: 1.85, mb: 1.5 }}>
                <li>Service providers who perform services on our behalf (hosting, monitoring, analytics)</li>
                <li>Third-party integrations you enable (e.g., email, telephony)</li>
                <li>When required by law or to protect rights and safety</li>
              </Box>
            </Box>

            <Box component="section" sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Security</Typography>
              <Typography paragraph sx={{ lineHeight: 1.85, mb: 1.5 }}>
                We implement industry-standard safeguards — encryption in transit (TLS), secure key management, and access controls — to protect data. We continuously monitor for vulnerabilities and respond to incidents following best practices.
              </Typography>
            </Box>

            <Box component="section" sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Data Retention and Controls</Typography>
              <Typography paragraph sx={{ lineHeight: 1.85, mb: 1.5 }}>
                You control the data you put into Edforce. Administrators can export, edit or delete CRM data. When accounts are closed, we retain only the minimum data required to comply with legal obligations and to prevent fraud, unless you request deletion.
              </Typography>
            </Box>

            <Box component="section" sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Cookies and Tracking</Typography>
              <Typography paragraph sx={{ lineHeight: 1.85, mb: 1.5 }}>
                We use cookies and similar technologies for authentication, security and analytics. You can manage cookie preferences in your browser; some features may require cookies to function.
              </Typography>
            </Box>

            <Box component="section" sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>International Transfers</Typography>
              <Typography paragraph sx={{ lineHeight: 1.85, mb: 1.5 }}>
                Edforce is hosted on secure infrastructure and may transfer or store data in regions outside your country. We take steps to ensure appropriate protections when data moves between jurisdictions.
              </Typography>
            </Box>

            <Box component="section" sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Your Rights</Typography>
              <Typography paragraph sx={{ lineHeight: 1.85, mb: 1.5 }}>
                Depending on your location, you may have rights to access, correct, export, or delete your personal data. To exercise these rights, contact us at the address below or via your account settings.
              </Typography>
            </Box>

            <Box component="section" sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Contact Us</Typography>
              <Typography paragraph sx={{ lineHeight: 1.85, mb: 1.5 }}>
                If you have questions about this policy or our privacy practices, email us at <Link href="mailto:info.edforce@courseconnect.in">info.edforce@courseconnect.in</Link> or visit <Link href="https://edforce.live">edforce.live</Link>.
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="caption" color="text.secondary">This policy may be updated periodically; we will post changes on this page.</Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default PrivacyPolicy;
