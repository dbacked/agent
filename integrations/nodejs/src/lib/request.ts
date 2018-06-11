import { get } from 'https';

export const getFileHttps = (fileUrl) => {
  return new Promise<String>((resolve, reject) => {
    let fileData = '';
    get(fileUrl, (res) => {
      res.on('data', (data) => { fileData += data; });
      res.on('end', () => resolve(fileData));
    }).on('error', reject);
  });
};

