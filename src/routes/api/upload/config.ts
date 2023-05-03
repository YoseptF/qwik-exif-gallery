// Backblaze B2 configuration
export const backblazeConfig = {
  applicationKeyId: process.env.BACKBLAZE_APPLICATION_KEY_ID!,
  applicationKey: process.env.BACKBLAZE_APPLICATION_KEY!,
  bucketId: process.env.BACKBLAZE_BUCKET_ID!,
};
