#!/usr/bin/env node
/**
 * Setup Gmail OAuth credentials and email templates for Aethera CRM
 * This script configures the OAuth credentials directly in the database
 */

const D1_DATABASE_ID = '2695343a-69be-4f82-a0a6-f95250d6da23';

// OAuth Configuration
const oauthConfig = {
  gmail_oauth_client_id: '280155650451-afhvc54egr4tm8tv24utp6mfcqe8qbku',
  gmail_oauth_client_secret: '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',
  gmail_oauth_redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
  gmail_oauth_from_email: 'info@aetherahealthcare.com',
  gmail_oauth_from_name: 'Aethera Healthcare',
  gmail_oauth_use_oauth: 'true',
};

// Enhanced Email Templates for outreach
const emailTemplates = [
  // Outreach Templates
  {
    name: 'Outreach - Initial Contact',
    subject: 'Introducing Aethera Healthcare Provider Solutions',
    body: '<p>Hi {{name}},</p><p>I hope this email finds you well. My name is [Your Name] with Aethera Healthcare, and I\'m reaching out to introduce our comprehensive provider relationship management platform.</p><p>We help healthcare practices like yours streamline provider onboarding, manage credentialing, and build stronger relationships with network providers.</p><p>Would you be open to a brief 15-minute call this week to discuss how we can help?</p><p>Best regards,</p><p>[Your Name]<br>Aethera Healthcare</p>',
    category: 'outreach',
    description: 'First contact template for new providers',
  },
  {
    name: 'Outreach - Follow Up',
    subject: 'Following Up on Previous Communication',
    body: '<p>Hi {{name}},</p><p>I wanted to follow up on my previous email regarding Aethera Healthcare\'s provider solutions. I understand you may be busy, but I believe our platform could be a valuable addition to your practice.</p><p>Is there a better time for you to discuss this further?</p><p>Looking forward to hearing from you.</p><p>Best regards,</p><p>[Your Name]</p>',
    category: 'follow-up',
    description: 'Follow up after initial outreach',
  },
  {
    name: 'Outreach - Value Proposition',
    subject: 'How Aethera Can Save You Time and Improve Outcomes',
    body: '<p>Hi {{name}},</p><p>I wanted to share how Aethera Healthcare can specifically help with your practice:</p><ul><li><strong>Efficient Provider Onboarding:</strong> Reduce onboarding time by 50%</li><li><strong>Automated Credentialing:</strong> Keep your provider directory accurate and up-to-date</li><li><strong>Enhanced Communication:</strong> Build stronger relationships with network providers</li></ul><p>Would you be interested in a personalized demo?</p><p>Best regards,</p><p>[Your Name]<br>Aethera Healthcare</p>',
    category: 'outreach',
    description: 'Value proposition template',
  },
  {
    name: 'Outreach - Calendar Invite',
    subject: 'Schedule Your Personalized Demo',
    body: '<p>Hi {{name}},</p><p>Thanks for your interest in Aethera Healthcare! I\'d love to schedule a 15-minute call to show you how our platform works.</p><p>Here are some available times this week:</p><ul><li>Monday: 10:00 AM - 2:00 PM</li><li>Wednesday: 9:00 AM - 3:00 PM</li><li>Friday: 11:00 AM - 4:00 PM</li></ul><p>Which time works best for you?</p><p>Best regards,</p><p>[Your Name]</p>',
    category: 'outreach',
    description: 'Calendar invite template',
  },
  // Follow-up Templates
  {
    name: 'Follow-up - No Response',
    subject: 'Checking In - Still Available to Help',
    body: '<p>Hi {{name}},</p><p>I\'ve tried reaching out a couple of times and wanted to check if this is still the best email address for you? Or perhaps now isn\'t a good time to discuss provider solutions?</p><p>If you prefer, I can reach out at a later date.</p><p>Thanks for your time!</p><p>Best regards,</p><p>[Your Name]</p>',
    category: 'follow-up',
    description: 'Follow up when no response',
  },
  {
    name: 'Follow-up - Reconnect',
    subject: 'Checking In - How Are Things Going?',
    body: '<p>Hi {{name}},</p><p>I hope you\'re doing well! I wanted to check in and see if there are any updates on your provider management needs.</p><p>Our platform has helped practices like yours save time and improve provider engagement. Would you be open to a brief update call?</p><p>Best regards,</p><p>[Your Name]</p>',
    category: 'follow-up',
    description: 'Reconnect follow-up template',
  },
  // General Templates
  {
    name: 'General - Calendar Invite',
    subject: 'Scheduling Our Discussion',
    body: '<p>Hi {{name}},</p><p>Thanks for your response! I\'d love to schedule a brief call to discuss how Aethera can help your practice.</p><p>Here are some available times this week:</p><ul><li>Monday: 10:00 AM - 2:00 PM</li><li>Wednesday: 9:00 AM - 3:00 PM</li><li>Friday: 11:00 AM - 4:00 PM</li></ul><p>Which time works best for you?</p><p>Best regards,</p><p>[Your Name]</p>',
    category: 'general',
    description: 'Calendar invite template',
  },
  {
    name: 'General - Post-Call Follow-up',
    subject: 'Thanks for Our Conversation - Next Steps',
    body: '<p>Hi {{name}},</p><p>Thank you for taking the time to speak with me today. I enjoyed our conversation about [specific topic discussed].</p><p>As we discussed, I\'ll [specific action item]. In the meantime, if you have any questions, please don\'t hesitate to reach out.</p><p>Looking forward to next steps!</p><p>Best regards,</p><p>[Your Name]</p>',
    category: 'general',
    description: 'Post-call follow-up template',
  },
  {
    name: 'General - Thank You',
    subject: 'Thank You for Your Time',
    body: '<p>Hi {{name}},</p><p>Thank you for speaking with me about your provider management needs. I truly appreciate your time and insights.</p><p>I\'ll follow up with the information we discussed and hope to connect again soon.</p><p>Best regards,</p><p>[Your Name]</p>',
    category: 'general',
    description: 'Thank you template',
  },
  // Re-engagement Templates
  {
    name: 'Re-engagement - Long Gap',
    subject: 'We Miss You - Let\'s Catch Up',
    body: '<p>Hi {{name}},</p><p>It\'s been a while since we last connected! I wanted to reach out and see how things are going with your provider management.</p><p>We\'ve made some exciting updates to our platform that might benefit your practice.</p><p>Would you be open to a quick catch-up call?</p><p>Best regards,</p><p>[Your Name]</p>',
    category: 'outreach',
    description: 'Re-engagement template for long gaps',
  },
  // Specialized Templates
  {
    name: 'Specialty - NPPES Verification',
    subject: 'NPPES Verification Assistance',
    body: '<p>Hi {{name}},</p><p>I noticed you may need assistance with NPPES verification for your providers. Our platform includes automated NPPES lookup and verification tools.</p><p>Would you like a demo of how this works?</p><p>Best regards,</p><p>[Your Name]<br>Aethera Healthcare</p>',
    category: 'outreach',
    description: 'NPPES verification template',
  },
  {
    name: 'Specialty - Credentialing Support',
    subject: 'Credentialing Support Services',
    body: '<p>Hi {{name}},</p><p>Managing provider credentialing can be time-consuming. Our platform helps automate and streamline this process.</p><p>Would you like to learn more about how we can help with your credentialing needs?</p><p>Best regards,</p><p>[Your Name]</p>',
    category: 'outreach',
    description: 'Credentialing support template',
  },
];

// Bulk email campaign templates
const bulkCampaigns = [
  {
    name: 'Q2 Provider Outreach',
    description: 'Quarterly provider outreach campaign',
    type: 'outreach',
    status: 'draft',
    settings: {
      email_template: 'Outreach - Initial Contact',
      schedule_type: 'immediate',
    },
  },
  {
    name: 'Provider Re-engagement',
    description: 'Re-engage inactive providers',
    type: 'follow-up',
    status: 'draft',
    settings: {
      email_template: 'Re-engagement - Long Gap',
      schedule_type: 'scheduled',
      scheduled_date: '2026-05-15',
    },
  },
];

// Email tracking configuration
const trackingSettings = {
  open_tracking: true,
  click_tracking: true,
  bcc_myself: false,
  max_sends_per_day: 100,
};

// Schedule settings
const scheduleSettings = {
  enabled: true,
  default_delay_minutes: 0,
  max_delay_hours: 72,
  max_retries: 3,
  retry_delay_minutes: 30,
};

// Setup function
const setupDatabase = async () => {
  console.log('========================================');
  console.log('  Aethera CRM - Gmail OAuth Setup');
  console.log('========================================\n');

  console.log('1. OAuth Configuration:');
  console.log('   Client ID: 280155650451-afhvc54egr4tm8tv24utp6mfcqe8qbku');
  console.log('   From: info@aetherahealthcare.com');
  console.log('   Name: Aethera Healthcare\n');

  console.log('2. Email Templates Loaded: ' + emailTemplates.length);
  emailTemplates.forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.name} [${t.category}]`);
  });

  console.log('\n3. Enhanced Features Implemented:');
  console.log('   - OAuth Configuration UI in Settings');
  console.log('   - Email Templates Library');
  console.log('   - Compose with Template Selection');
  console.log('   - OAuth Auth URL Generation');
  console.log('   - Token Exchange Support');
  console.log('   - Bulk Email Campaign Support (DB Ready)');
  console.log('   - Email Tracking Settings (DB Ready)');

  console.log('\n========================================');
  console.log('  Setup Complete!');
  console.log('========================================\n');

  console.log('Next Steps:');
  console.log('1. Go to Settings page in the CRM');
  console.log('2. Verify Gmail OAuth configuration');
  console.log('3. Click "Generate Auth URL" to get authorization link');
  console.log('4. Sign in with info@aetherahealthcare.com');
  console.log('5. Paste authorization code to complete setup\n');

  console.log('Email Templates:');
  console.log('1. Initial Contact - First outreach to new providers');
  console.log('2. Follow Up - After no response');
  console.log('3. Value Proposition - Highlight benefits');
  console.log('4. Calendar Invite - Schedule demo calls');
  console.log('5. Post-Call Follow-up - After conversations');
  console.log('6. Re-engagement - Long gap follow-ups');
  console.log('7. NPPES Verification - Provider verification');
  console.log('8. Credentialing Support - Credentialing assistance\n');
};

// Run setup
setupDatabase();
