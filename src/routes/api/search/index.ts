import { searchDocuments } from "../firebase";
import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async (request) => {
  const { searchParams } = request.url

  const query = searchParams.get('query');
  const field = searchParams.get('field');
  const partial = searchParams.get('partial') as 'true' | 'false' | null;
  const kind = searchParams.get('kind') as 'metadata' | 'parameters';
  const limit = searchParams.get('limit');
  const page = searchParams.get('page');

  if (!field) { request.text(400, 'You must provide a field parameter'); return; }
  if (!kind) { request.text(400, 'You must provide a kind parameter'); return; }
  if (!['metadata', 'parameters'].includes(kind)) { request.text(400, `kind can only be 'metadata' or 'parameters'`); return; }
  if (!['true', 'false', null].includes(partial)) { request.text(400, `partial can only be 'true', 'false' or null`); return; }
  if (limit && isNaN(Number(limit))) { request.text(400, `limit must be a number`); return; }
  if (page && isNaN(Number(page))) { request.text(400, `page must be a number`); return; }

  const queries = query?.split(',') || [];

  const documents = await searchDocuments({
    field,
    queries,
    kind,
    partialMatch: partial === 'true',
    limit: limit ? Number(limit) : 1,
    page: page ? Number(page) : 1,
  }, request);

  // Return the documents
  request.json(200, documents);
};
