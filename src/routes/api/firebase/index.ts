import type { Document } from './uploadDocument';
import uploadDocumentInternal from './uploadDocument';
import type { searchDocumentsArgs } from './searchDocuments';
import searchDocumentsInternal from './searchDocuments';
import type { FirebaseApp} from "firebase/app";
import { initializeApp } from "firebase/app";
import {
  collection as FirebaseCollection,
  getFirestore,
} from 'firebase/firestore/lite';
import type { RequestEvent } from '@builder.io/qwik-city';
import { appStore } from './store';

const getFirebaseConfig = (request: RequestEvent) => ({
  apiKey: request.env.get('FIREBASE_API_KEY')!,
  authDomain: request.env.get('FIREBASE_AUTH_DOMAIN')!,
  projectId: request.env.get('FIREBASE_PROJECT_ID')!,
  storageBucket: request.env.get('FIREBASE_STORAGE_BUCKET')!,
  messagingSenderId: request.env.get('FIREBASE_MESSAGING_SENDER_ID')!,
  appId: request.env.get('FIREBASE_APP_ID')!,
  measurementId: request.env.get('FIREBASE_MEASUREMENT_ID')!,
});

let app: FirebaseApp;

const getCollection = (request: RequestEvent) => {
  app = app || initializeApp(getFirebaseConfig(request));

  const db = getFirestore(app);

  // Define the collection name where we want to upload the file
  const collectionName = 'Images';

  // Get a reference to the collection
  const collection = FirebaseCollection(db, collectionName);

  return collection;
}

export const uploadDocument = async (document: Document, request: RequestEvent) => {
  const collection = getCollection(request);
  return uploadDocumentInternal({ collection, document });
}

export const searchDocuments = async (args: Omit<searchDocumentsArgs, 'collection'>, request: RequestEvent) => {
  const collection = getCollection(request);
  return searchDocumentsInternal({ collection, ...args });
}