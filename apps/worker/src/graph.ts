import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';

// App-only Graph client (application permission Mail.Send). Credentials come
// from the environment / vault — never hard-coded.
const credential = new ClientSecretCredential(
  process.env.ENTRA_TENANT_ID!, process.env.GRAPH_CLIENT_ID!, process.env.GRAPH_CLIENT_SECRET!);

export const graph = Client.initWithMiddleware({
  authProvider: {
    getAccessToken: async () =>
      (await credential.getToken('https://graph.microsoft.com/.default')).token,
  },
});

export interface Mail { subject: string; html: string; to: string[]; cc?: string[]; }

/** Send mail as the GRC sender mailbox via POST /users/{id}/sendMail. */
export async function sendMail(m: Mail) {
  const sender = process.env.GRAPH_SENDER_UPN!;
  await graph.api(`/users/${sender}/sendMail`).post({
    message: {
      subject: m.subject,
      body: { contentType: 'HTML', content: m.html },
      toRecipients: m.to.map(address => ({ emailAddress: { address } })),
      ccRecipients: (m.cc ?? []).map(address => ({ emailAddress: { address } })),
    },
    saveToSentItems: true,
  });
}
