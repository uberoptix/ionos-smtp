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
    displayName: 'IONOS IMAP',
    name: 'ionosImap',
    group: ['transform'],
    icon: 'fa:envelope',
    version: 1,
    description: 'Manage mail via IMAP (IONOS or any IMAP server): search, add keywords, move, copy, delete',
    defaults: { name: 'IONOS IMAP' },
    inputs: ['main' as unknown as NodeConnectionType],
    outputs: ['main' as unknown as NodeConnectionType],
    credentials: [{ name: 'imapCredentials', required: true }],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Search by Message-ID', value: 'searchByMessageId', description: 'Find UIDs by RFC822 Message-ID' },
          { name: 'Add Keywords (Tags)', value: 'addKeywords', description: 'Add IMAP keywords (custom tags) to message' },
          { name: 'Remove Keywords', value: 'removeKeywords', description: 'Remove IMAP keywords from message' },
          { name: 'Move', value: 'move', description: 'Move message to another mailbox' },
          { name: 'Copy', value: 'copy', description: 'Copy message to another mailbox' },
          { name: 'Delete', value: 'delete', description: 'Delete message' }
        ],
        default: 'searchByMessageId',
      },
      { displayName: 'Mailbox', name: 'mailbox', type: 'string', default: 'INBOX' },

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

    for (let i = 0; i < items.length; i++) {
      const op = this.getNodeParameter('operation', i) as string;
      const mailbox = this.getNodeParameter('mailbox', i) as string;

      const client = await getClient.call(this);
      try {
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
      } finally {
        await client.logout().catch(() => {});
      }
    }

    return [out];
  }
}


