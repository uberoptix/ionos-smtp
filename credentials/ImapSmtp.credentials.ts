import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class ImapSmtpCredentials implements ICredentialType {
  name = 'imapSmtpCredentials';
  displayName = 'IMAP+SMTP Credentials';
  properties: INodeProperties[] = [
    // IMAP
    { displayName: 'IMAP Host', name: 'imapHost', type: 'string', default: '' },
    { displayName: 'IMAP Port', name: 'imapPort', type: 'number', default: 993 },
    { displayName: 'IMAP Secure (TLS)', name: 'imapSecure', type: 'boolean', default: true },
    { displayName: 'IMAP User', name: 'imapUser', type: 'string', default: '' },
    { displayName: 'IMAP Password', name: 'imapPassword', type: 'string', typeOptions: { password: true }, default: '' },

    // SMTP
    { displayName: 'SMTP Host', name: 'smtpHost', type: 'string', default: '' },
    { displayName: 'SMTP Port', name: 'smtpPort', type: 'number', default: 465 },
    { displayName: 'SMTP Secure (TLS)', name: 'smtpSecure', type: 'boolean', default: true },
    { displayName: 'SMTP User', name: 'smtpUser', type: 'string', default: '' },
    { displayName: 'SMTP Password', name: 'smtpPassword', type: 'string', typeOptions: { password: true }, default: '' },
    { displayName: 'Default From (optional)', name: 'from', type: 'string', default: '' },
  ];

  authenticate: IAuthenticateGeneric = { type: 'generic', properties: {} };
}


