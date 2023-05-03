import Busboy from "busboy";
import type { PngTags } from "exifreader";
import { Readable } from "stream";
import type { ExifData, Metadata } from "../firebase/uploadDocument";
import type { RequestEvent } from "@builder.io/qwik-city";

interface File {
  buffer: Buffer,
  url: string,
  exifData: ExifData
}

type Files = {
  [key: string]: File
}

function isNumeric(value: string): boolean {
  return !isNaN(parseFloat(value)) && !isNaN(Number(value));
}

function convertParametersToRecord(input: string): Record<string, any> {
  const inputLines = input.split("\n");
  const result: Record<string, any> = {};

  inputLines.forEach((line, index) => {
    if (index === 0) {
      result["prompt"] = line;
    } else {
      // Use a regex to match key-value pairs and nested values
      const regex = /(?:([^,:]+:\s(?:[^,()"]+|\([^)]+\)|"[^"]+"))|(\([^)]+\)))/g;
      const matches = line.match(regex);

      if (matches) {
        matches.forEach((match) => {
          if (match.includes(": ")) {
            const keyValue = match.split(": ");
            const key = keyValue[0].trim();
            let value = keyValue[1]?.trim();

            // Remove double quotes around parentheses values
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1);
            }

            if (value && isNumeric(value)) {
              result[key] = parseFloat(value);
            } else {
              result[key] = value;
            }
          } else {
            // Append nested value to the previous key
            const lastKey = Object.keys(result).slice(-1)[0];
            result[lastKey] += `, ${match}`;
          }
        });
      }
    }
  });

  return result;
}

export const parseForm = async (req: RequestEvent): Promise<{ files: Files }> => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    const headers: [string, string][] = Array.from(req.request.headers);

    const contentTypeKey = headers.find(([key]) => key.toLowerCase() === 'content-type');

    if (!contentTypeKey) reject(new Error('No content type header'));

    const [, contentType] = headers.find(([key]) => key.toLowerCase() === 'content-type')!;

    const busboy = Busboy({
      headers: {
        'content-type': contentType,
      }
    });
    const files: Files = {};

    busboy.on('file', (_, file, info) => {
      const chunks: Uint8Array[] = [];
      file.on('data', (chunk) => {
        chunks.push(chunk);
      });
      file.on('end', () => {
        files[info.filename] = {
          buffer: Buffer.concat(chunks),
          url: '',
          exifData: {
            metadata: {}
          },
        }
      });
    });

    busboy.on('finish', () => {
      resolve({ files });
    });

    busboy.on('error', (error) => {
      console.debug('Error parsing form: ', error);
      reject(error);
    });

    const readableStream = new Readable({
      read() { },
    });

    const bodyStream = req.request.body as ReadableStream<Uint8Array>;
    const bodyReader = bodyStream.getReader();

    const processResult = async (result: ReadableStreamReadResult<Uint8Array>): Promise<void> => {
      if (result.done) {
        readableStream.push(null);
        return;
      }

      const chunk = result.value;
      readableStream.push(chunk);
      const nextRead = await bodyReader.read();
      return await processResult(nextRead);
    }

    if (!req.request.body) reject(new Error('No body'));

    const firstRead = await bodyReader.read();
    await processResult(firstRead);

    readableStream.pipe(busboy);
  });
};

export const convertImage = (originalImage: PngTags): ExifData => {
  const metadata: Metadata = {};

  for (const [key, value] of Object.entries(originalImage)) {
    if (key !== 'parameters') {
      metadata[key] = {
        value: value.value,
        description: value.description
      }
    }
  }

  return {
    metadata: metadata,
    parameters: convertParametersToRecord(originalImage.parameters.description)
  };
}