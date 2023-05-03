import type { CollectionReference, DocumentData} from "firebase/firestore/lite";
import { addDoc } from "firebase/firestore/lite";

export type Metadata = {
  [key: string]: {
    value: string | number,
    description?: string
  }
}

export type ExifData = {
  metadata: Metadata,
  parameters?: Record<string, any>
}

export interface Document {
  fileName: string,
  url: string,
  exifData: ExifData
}

interface upLoadDocumentArgs {
  collection: CollectionReference<DocumentData>,
  document: Document
}

const upLoadDocument = async ({
  collection,
  document
}: upLoadDocumentArgs) => {

  return await addDoc(collection, document);
}

export default upLoadDocument;