import { google } from 'googleapis';
import type { docs_v1, drive_v3 } from 'googleapis';

import { ENV } from './env';
import { logger } from './logger.js';

type GoogleClients = {
  docs: docs_v1.Docs;
  drive: drive_v3.Drive;
};

let cachedClients: GoogleClients | null = null;

function getPrivateKey() {
  const key = ENV.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  return key ? key.replace(/\\n/g, '\n') : '';
}

async function createGoogleClients(): Promise<GoogleClients | null> {
  if (!ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL || !ENV.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return null;
  }

  try {
    const auth = new google.auth.JWT({
      email: ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: getPrivateKey(),
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
      ],
      subject: ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    });

    await auth.authorize();

    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });
    return { docs, drive };
  } catch (error) {
    logger.error(error, { where: 'googleDocs.createClients' });
    return null;
  }
}

async function getClients(): Promise<GoogleClients | null> {
  if (cachedClients) return cachedClients;
  cachedClients = await createGoogleClients();
  return cachedClients;
}

export async function provisionWebsiteWorkspace(name: string): Promise<{ docId: string | null; folderId: string | null }> {
  const clients = await getClients();
  if (!clients) return { docId: null, folderId: null };

  const parentId = ENV.GOOGLE_DRIVE_PARENT_FOLDER_ID || undefined;

  try {
    const folderRes = await clients.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      },
      fields: 'id',
    });

    const folderId = folderRes.data.id ?? null;
    let docId: string | null = null;

    if (ENV.GOOGLE_DOCS_SECTION_TEMPLATE_ID) {
      const copyRes = await clients.drive.files.copy({
        fileId: ENV.GOOGLE_DOCS_SECTION_TEMPLATE_ID,
        requestBody: {
          name: `${name} – Contenu`,
          parents: folderId ? [folderId] : parentId ? [parentId] : undefined,
        },
        fields: 'id',
      });
      docId = copyRes.data.id ?? null;
    } else {
      const docRes = await clients.docs.documents.create({
        requestBody: { title: `${name} – Contenu` },
      });
      docId = docRes.data.documentId ?? null;

      if (docId && folderId) {
        const updatePayload: drive_v3.Params$Resource$Files$Update = {
          fileId: docId,
          addParents: folderId,
          fields: 'id',
        };
        if (parentId) {
          updatePayload.removeParents = parentId;
        }
        await clients.drive.files.update(updatePayload);
      }
    }

    return { docId, folderId };
  } catch (error) {
    logger.error(error, { where: 'googleDocs.provisionWorkspace' });
    return { docId: null, folderId: null };
  }
}

export type GoogleDocSection = {
  heading: string;
  content: string;
};

export async function getDocumentSections(documentId: string): Promise<GoogleDocSection[]> {
  const clients = await getClients();
  if (!clients) return [];

  try {
    const res = await clients.docs.documents.get({ documentId });
    const body = res.data.body?.content ?? [];

    const sections: GoogleDocSection[] = [];
    let current: GoogleDocSection | null = null;

    for (const element of body) {
      if (!element.paragraph) continue;
      const para = element.paragraph;
      const text = (para.elements ?? [])
        .map((el) => el.textRun?.content ?? '')
        .join('')
        .trim();
      if (!text) continue;

      const style = para.paragraphStyle?.namedStyleType ?? '';
      if (style.startsWith('HEADING')) {
        if (current) sections.push(current);
        current = { heading: text, content: '' };
      } else if (current) {
        current.content = current.content ? `${current.content}\n${text}` : text;
      }
    }

    if (current) sections.push(current);

    return sections;
  } catch (error) {
    logger.error(error, { where: 'googleDocs.getSections', documentId });
    return [];
  }
}

export async function appendSectionsToDocument(documentId: string, sections: GoogleDocSection[]) {
  const clients = await getClients();
  if (!clients || !sections.length) return;

  try {
    const requests: docs_v1.Schema$Request[] = [];

    sections
      .slice()
      .reverse()
      .forEach((section) => {
        const content = (section.content ?? '').trim();
        const bodyText = content ? `\n${content}\n` : '\n';
        requests.push({
          insertText: {
            location: { index: 1 },
            text: bodyText,
          },
        });
        requests.push({
          insertText: {
            location: { index: 1 },
            text: `${section.heading}\n`,
          },
        });
      });

    if (!requests.length) return;

    await clients.docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
  } catch (error) {
    logger.error(error, { where: 'googleDocs.appendSections', documentId });
  }
}

export async function shareFileWithEmail(fileId: string, email: string, role: 'reader' | 'commenter' | 'writer' = 'writer') {
  const clients = await getClients();
  if (!clients || !fileId || !email) return { ok: false };
  try {
    await clients.drive.permissions.create({
      fileId,
      requestBody: {
        type: 'user',
        role,
        emailAddress: email,
      },
      sendNotificationEmail: true,
    });
    return { ok: true };
  } catch (error) {
    logger.error(error, { where: 'googleDocs.shareFileWithEmail', fileId, email });
    return { ok: false };
  }
}
