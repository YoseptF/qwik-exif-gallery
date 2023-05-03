import type {
  CollectionReference,
  DocumentData} from "firebase/firestore/lite";
import {
  query as firestoreQuery,
  where,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  startAfter,
} from "firebase/firestore/lite";

export interface searchDocumentsArgs {
  collection: CollectionReference<DocumentData>;
  field: string;
  queries: string[];
  kind: "metadata" | "parameters";
  partialMatch?: boolean;
  limit?: number;
  page?: number;
}

export interface searchDocumentsResult {
  documents: DocumentData[];
  totalPages: number;
}
 


const searchDocuments = async ({
  collection,
  kind,
  field,
  queries,
  partialMatch = false,
  limit = 10,
  page = 1,
}: searchDocumentsArgs): Promise<searchDocumentsResult> => {
  const fieldPath = `exifData.${kind}.${field}` + (kind === "metadata" ? ".description" : "");

  // Get a reference to the query
  let q = firestoreQuery(collection);

  if (!partialMatch) {
    q = firestoreQuery(collection, where(fieldPath, "in", queries));
  }

  // Apply limit and pagination
  q = firestoreQuery(q, orderBy(fieldPath), firestoreLimit(limit));

  if (page > 1) {
    const lastVisibleDoc = await getLastVisibleDoc(collection, fieldPath, limit, page);
    if (lastVisibleDoc) {
      q = firestoreQuery(q, startAfter(lastVisibleDoc));
    }
  }

  // Get the documents
  const querySnapshot = await getDocs(q);

  // Return the documents
  const docs = querySnapshot.docs.map((doc) => doc.data());

  const totalCount = partialMatch
    ? await getPartialMatchCount(collection, kind, field, queries)
    : await getTotalCount(collection, fieldPath, queries);

  // Calculate the total number of pages
  const totalPages = Math.ceil(totalCount / limit);

  // If partialMatch is true, filter the results using the custom filter function
  if (partialMatch) {
    return {
      documents: docs.filter((doc) => {
        const fieldValue = doc.exifData[kind][field];
        return queries.some((query) => fieldValue && fieldValue.includes(query));
      }),
      totalPages,
    }
  }

  return {
    documents: docs,
    totalPages,
  };
};

const getPartialMatchCount = async (
  collection: CollectionReference<DocumentData>,
  kind: "metadata" | "parameters",
  field: string,
  queries: string[]
): Promise<number> => {
  const allDocsSnapshot = await getDocs(collection);
  return allDocsSnapshot.docs.filter((doc) => {
    const fieldValue = doc.data().exifData[kind][field];
    return queries.some((query) => fieldValue && fieldValue.includes(query));
  }).length;
};

// Helper function to get the total count of matching documents for exact match
const getTotalCount = async (
  collection: CollectionReference<DocumentData>,
  fieldPath: string,
  queries: string[]
): Promise<number> => {
  const q = firestoreQuery(collection, where(fieldPath, "in", queries));
  const snapshot = await getDocs(q);
  return snapshot.size;
};

// Helper function to get the last visible document for pagination
const getLastVisibleDoc = async (
  collection: CollectionReference<DocumentData>,
  fieldPath: string,
  limit: number,
  page: number
) => {
  const q = firestoreQuery(collection, orderBy(fieldPath), firestoreLimit(limit * (page - 1)));
  const snapshot = await getDocs(q);
  return snapshot.docs[snapshot.docs.length - 1];
};

export default searchDocuments;
