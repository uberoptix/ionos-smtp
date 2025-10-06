import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class SmtpCredentials implements ICredentialType {
  name = 'smtpCredentials';
  displayName = 'SMTP Credentials (Send/Redirect)';
  properties: INodeProperties[] = [
    { displayName: 'Host', name: 'host', type: 'string', default: '' },
    { displayName: 'Port', name: 'port', type: 'number', default: 465 },
    { displayName: 'Secure (TLS)', name: 'secure', type: 'boolean', default: true },
    { displayName: 'User', name: 'user', type: 'string', default: '' },
    { displayName: 'Password', name: 'password', type: 'string', typeOptions: { password: true }, default: '' },
    { displayName: 'Default From (optional)', name: 'from', type: 'string', default: '' },
  ];

  authenticate: IAuthenticateGeneric = { type: 'generic', properties: {} };
}


