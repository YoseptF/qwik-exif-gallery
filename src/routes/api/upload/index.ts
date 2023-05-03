import type { RequestHandler } from '@builder.io/qwik-city';
import B2 from "backblaze-b2";
import { load } from 'exifreader';
import { convertImage, parseForm } from "./utils";
import { uploadDocument } from "../firebase";

export const onPost: RequestHandler = async (request) => {
  const b2 = new B2({
    applicationKeyId: request.env.get('BACKBLAZE_APPLICATION_KEY_ID')!,
    applicationKey: request.env.get('BACKBLAZE_APPLICATION_KEY')!,
  });

  try {

    const { files } = await parseForm(request);

    await b2.authorize();
    const backblazePromise = (async () => {
      try {
        for (const [fileName, file] of Object.entries(files)) {
          const { data: uploadUrlData } = await b2.getUploadUrl({ bucketId: request.env.get('BACKBLAZE_BUCKET_ID')! });
          const { uploadUrl, authorizationToken } = uploadUrlData;
    
          await b2.uploadFile({
            fileName,
            data: file.buffer,
            uploadAuthToken: authorizationToken,
            uploadUrl,
          });
    
          files[fileName].url = `https://house-data.s3.us-east-005.backblazeb2.com/${fileName}`;
        }
      } catch (error) {
        throw new Error(error + '');
      }
    })();

    // extract exif info from the image
    const exifPromise = (async () => {
      for (const [fileName, file] of Object.entries(files)) {
        const tags = load(file.buffer, { expanded: true });
        if (!tags.png) throw new Error('No png tags');
    
        const parsedTags = convertImage(tags.png);
        files[fileName].exifData = parsedTags;
      }
    })();

    await Promise.all([backblazePromise, exifPromise]);

    const FilesWithoutBuffer = Object.fromEntries(Object.entries(files).map(([key, value]) => {
      return [key, {
        url: value.url,
        exifData: value.exifData,
      }]
    }));

    // Loop over the files and create a new document for each file in the collection
    for (const [fileName, file] of Object.entries(FilesWithoutBuffer)) {
      const docRef = await uploadDocument({
        exifData: file.exifData,
        fileName: fileName,
        url: file.url,
      }, request)
      console.log(`Document written with ID: ${docRef.id}`);
    }

    
    request.json(200,FilesWithoutBuffer)
    return
  } catch (error) {
    request.json(500, { error: error + '' });
  }
}
