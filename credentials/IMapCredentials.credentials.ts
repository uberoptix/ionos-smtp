import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class IMapCredentials implements ICredentialType {
  name = 'imapCredentials';
  displayName = 'IMAP Credentials';
  properties: INodeProperties[] = [
    { displayName: 'Host', name: 'host', type: 'string', default: 'imap.ionos.com' },
    { displayName: 'Port', name: 'port', type: 'number', default: 993 },
    { displayName: 'Secure (TLS)', name: 'secure', type: 'boolean', default: true },
    { displayName: 'User', name: 'user', type: 'string', default: '' },
    { displayName: 'Password', name: 'password', type: 'string', typeOptions: { password: true }, default: '' }
  ];

  // Auth handled directly by the node with imapflow
  authenticate: IAuthenticateGeneric = { type: 'generic', properties: {} };
}



