# n8n-nodes-imap-manager

Community node to manage IMAP mail with imapflow:
- Search by RFC822 Message-ID → get UID
- Add/Remove keywords (IMAP flags)
- Move, Copy, Delete by UID

## Prereqs
- Node.js ≥ 18
- n8n self-hosted
- IMAP host, port, TLS enabled (e.g., imap.example.com:993)

## Install from the Community Catalog

In n8n, go to Settings → Community Nodes → Install, search for `n8n-nodes-imap-manager`, and install. Restart n8n if prompted.

## Node: IMAP Manager
Properties:
- Operation: List Mailboxes | Search by Message-ID | Add Keywords | Remove Keywords | Move | Copy | Delete
- Mailbox: default INBOX
- RFC822 Message-ID: e.g. `<abc123@example.com>`
- UID: for actions
- Keywords: comma-separated for add/remove
- Destination Mailbox: for Move/Copy

## Examples
Lookup UID by message-id then add keywords:
1) IMAP Manager (Search by Message-ID) → RFC822 Message-ID: `={{$json.messageId}}`
2) IMAP Manager (Add Keywords) → UID: `={{$json.uids[0]}}`

Redirect functionality has been removed in this version; use Move/Copy or your SMTP workflow.

## Notes
- Custom keywords require server support of `*` in PERMANENTFLAGS.
- Use standard `IMAP Credentials`. This package contains no SMTP functionality.
- This package contains no secrets or example credentials.
