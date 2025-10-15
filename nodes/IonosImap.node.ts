import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeProperties,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { ImapFlow, type MailboxLockObject } from 'imapflow';

async function getClient(this: IExecuteFunctions) {
  const cred = await this.getCredentials('imapCredentials') as any;
  const client = new ImapFlow({
    host: cred.host,
    port: cred.port,
    secure: cred.secure,
    auth: { user: cred.user, pass: cred.password },
    logger: false,
  });
  await client.connect();
  return client;
}

async function openMailbox(client: ImapFlow, mailbox: string): Promise<MailboxLockObject> {
  const lock = await client.getMailboxLock(mailbox);
  return lock;
}

export class IonosImap implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'IMAP Manager',
    name: 'imapManager',
    group: ['transform'],
    icon: 'file:imap-manager.svg',
    version: 1,
    description: 'Manage mail via IMAP (works with IONOS or any IMAP server): search, add keywords, move, copy, delete',
    defaults: { name: 'IMAP Manager' },
    inputs: ['main' as unknown as NodeConnectionType],
    outputs: ['main' as unknown as NodeConnectionType, 'main' as unknown as NodeConnectionType],
    outputNames: ['Main', 'Error'],
    credentials: [{ name: 'imapCredentials', required: true }],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'List Mailboxes', value: 'listMailboxes', description: 'List available mailboxes/folders' },
          { name: 'Search by Message-ID', value: 'searchByMessageId', description: 'Find UIDs by RFC822 Message-ID' },
          { name: 'Add Keywords (Tags)', value: 'addKeywords', description: 'Add IMAP keywords (custom tags) to message' },
          { name: 'Remove Keywords', value: 'removeKeywords', description: 'Remove IMAP keywords from message' },
          { name: 'Move', value: 'move', description: 'Move message to another mailbox' },
          { name: 'Copy', value: 'copy', description: 'Copy message to another mailbox' },
          { name: 'Delete', value: 'delete', description: 'Delete message' }
        ],
        default: 'searchByMessageId',
      },

      // Optional dynamic credential link/guard
      {
        displayName: 'Account Field (optional)',
        name: 'accountField',
        type: 'string',
        default: '',
        description: 'Expression resolving to account/email from upstream, e.g. {{$json.account}}',
      },
      {
        displayName: 'Require Account Matches Credential User',
        name: 'enforceAccountMatch',
        type: 'boolean',
        default: false,
        description: 'If enabled and Account Field is set, mismatched items are routed to Error output',
      },
      { displayName: 'Mailbox', name: 'mailbox', type: 'string', default: 'INBOX', displayOptions: { show: { operation: ['searchByMessageId','addKeywords','removeKeywords','move','copy','delete'] } } },

      // List Mailboxes
      {
        displayName: 'Name Filter (optional)',
        name: 'mailboxFilter',
        type: 'string',
        default: '',
        placeholder: 'e.g. Sales or INBOX/',
        displayOptions: { show: { operation: ['listMailboxes'] } },
        description: 'Case-insensitive substring to filter mailbox paths',
      },

      // Search
      {
        displayName: 'RFC822 Message-ID',
        name: 'messageId',
        type: 'string',
        default: '',
        displayOptions: { show: { operation: ['searchByMessageId'] } },
        description: 'Include angle brackets, e.g., <abc123@example.com>',
      },

      // Common UID input
      {
        displayName: 'UID',
        name: 'uid',
        type: 'number',
        default: 0,
        displayOptions: { show: { operation: ['addKeywords','removeKeywords','move','copy','delete'] } },
      },

      // Keywords
      {
        displayName: 'Keywords (comma separated)',
        name: 'keywords',
        type: 'string',
        default: '',
        placeholder: 'n8n.category:Sales/BD,n8n.priority:P2,n8n.proposed:move=Sales/BD',
        displayOptions: { show: { operation: ['addKeywords','removeKeywords'] } },
      },

      // Destination mailbox
      {
        displayName: 'Destination Mailbox',
        name: 'destMailbox',
        type: 'string',
        default: 'Archive',
        displayOptions: { show: { operation: ['move','copy'] } },
      },

      
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const out: INodeExecutionData[] = [];
    const errs: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const op = this.getNodeParameter('operation', i) as string;
      const mailbox = (op !== 'listMailboxes') ? (this.getNodeParameter('mailbox', i) as string) : '';

      // Optional enforcement that selected credential user matches upstream account field
      const enforce = this.getNodeParameter('enforceAccountMatch', i) as boolean;
      const accField = (this.getNodeParameter('accountField', i) as string) || '';
      if (enforce && accField) {
        try {
          const cred = await this.getCredentials('imapCredentials') as any;
          const upstream = String(accField).toLowerCase();
          const credUser = String(cred?.user || '').toLowerCase();
          if (upstream && credUser && upstream !== credUser) {
            errs.push({ json: { error: 'credential_mismatch', account: accField, credentialUser: cred?.user || '', itemIndex: i } });
            continue;
          }
        } catch (_) {
          errs.push({ json: { error: 'credential_not_found', account: accField || null, itemIndex: i } });
          continue;
        }
      }

      const client = await getClient.call(this);
      try {
        if (op === 'listMailboxes') {
          const filter = ((this.getNodeParameter('mailboxFilter', i) as string) || '').toLowerCase();
          const boxes = await client.list();
          const mailboxes: any[] = [];
          for (const box of boxes as any[]) {
            const info = {
              path: box.path,
              name: box.name,
              flags: Array.isArray((box as any).flags) ? (box as any).flags : [],
              specialUse: (box as any).specialUse || '',
              delimiter: (box as any).delimiter,
              listed: true,
            };
            if (!filter || info.path.toLowerCase().includes(filter) || info.name.toLowerCase().includes(filter)) {
              mailboxes.push(info);
            }
          }
          // Emit one item per mailbox so users can select/map downstream
          if (mailboxes.length === 0) {
            out.push({ json: { mailboxes: [] } });
          } else {
            for (const m of mailboxes) out.push({ json: m });
          }
        }

        if (op === 'searchByMessageId') {
          const messageId = this.getNodeParameter('messageId', i) as string;
          if (!messageId) throw new NodeOperationError(this.getNode(), 'messageId is required', { itemIndex: i });

          const lock = await openMailbox(client, mailbox);
          try {
            const uids = await client.search({ header: { 'message-id': messageId } }, { uid: true });
            out.push({ json: { mailbox, messageId, uids } });
          } finally {
            lock.release();
          }
        }

        if (op === 'addKeywords' || op === 'removeKeywords') {
          const uid = this.getNodeParameter('uid', i) as number;
          const keywordsRaw = (this.getNodeParameter('keywords', i) as string) || '';
          const keywords = keywordsRaw.split(',').map(s => s.trim()).filter(Boolean);
          if (!uid) throw new NodeOperationError(this.getNode(), 'uid is required', { itemIndex: i });
          if (!keywords.length) throw new NodeOperationError(this.getNode(), 'keywords are required', { itemIndex: i });

          const lock = await openMailbox(client, mailbox);
          try {
            const seq = { uid: String(uid) };
            if (op === 'addKeywords') {
              await client.messageFlagsAdd(seq, keywords, { uid: true });
            } else {
              await client.messageFlagsRemove(seq, keywords, { uid: true });
            }
            out.push({ json: { mailbox, uid, operation: op, keywords } });
          } finally {
            lock.release();
          }
        }

        if (op === 'move' || op === 'copy') {
          const uid = this.getNodeParameter('uid', i) as number;
          const destMailbox = this.getNodeParameter('destMailbox', i) as string;
          if (!uid) throw new NodeOperationError(this.getNode(), 'uid is required', { itemIndex: i });
          if (!destMailbox) throw new NodeOperationError(this.getNode(), 'destMailbox is required', { itemIndex: i });

          const lock = await openMailbox(client, mailbox);
          try {
            const seq = { uid: String(uid) };
            if (op === 'move') {
              const res = await client.messageMove(seq, destMailbox, { uid: true });
              out.push({ json: { mailbox, uid, movedTo: destMailbox, result: res } });
            } else {
              const res = await client.messageCopy(seq, destMailbox, { uid: true });
              out.push({ json: { mailbox, uid, copiedTo: destMailbox, result: res } });
            }
          } finally {
            lock.release();
          }
        }

        if (op === 'delete') {
          const uid = this.getNodeParameter('uid', i) as number;
          if (!uid) throw new NodeOperationError(this.getNode(), 'uid is required', { itemIndex: i });

          const lock = await openMailbox(client, mailbox);
          try {
            const seq = { uid: String(uid) };
            await client.messageDelete(seq, { uid: true });
            out.push({ json: { mailbox, uid, deleted: true } });
          } finally {
            lock.release();
          }
        }

        // redirect removed
      } finally {
        await client.logout().catch(() => {});
      }
    }

    return [out, errs];
  }
}


