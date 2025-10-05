# n8n-nodes-imap-manager

Local-only community node to manage IONOS (or any IMAP) mail with imapflow:
- Search by RFC822 Message-ID → get UID
- Add/Remove keywords (IMAP flags)
- Move, Copy, Delete by UID

## Prereqs
- Node.js ≥ 18
- n8n self-hosted
- IONOS IMAP details (host: imap.ionos.com, port: 993, TLS)

## Install from the Community Catalog

In n8n, go to Settings → Community Nodes → Install, search for `n8n-nodes-ionos-imap`, and install. Restart n8n if prompted.

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
1) IONOS IMAP (Search by Message-ID) → RFC822 Message-ID: `={{$json.messageId}}`
2) IONOS IMAP (Add Keywords) → UID: `={{$json.uids[0]}}`

## Notes
- Custom keywords require server support of `*` in PERMANENTFLAGS.
- Create multiple IMAP credentials, one per mailbox.
- This package contains no secrets or example credentials.
