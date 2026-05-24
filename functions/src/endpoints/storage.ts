import * as fs from "fs";
import admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as os from "os";
import * as path from "path";
import sharp from "sharp";

export const optimizeImage = onObjectFinalized(
  { region: "southamerica-east1" },
  async (event) => {
    const { bucket, name, contentType } = event.data;
    if (!contentType?.startsWith("image/")) {
      logger.log("This is not an image.");
      return;
    }
    if (name.endsWith("_1080.webp")) {
      logger.log("Image is already optimized.");
      return;
    }

    const storageBucket = admin.storage().bucket(bucket);
    const tempFilePath = path.join(os.tmpdir(), path.basename(name));
    const metadata = { contentType: "image/webp" };
    await storageBucket.file(name).download({ destination: tempFilePath });

    const newFileName = `${path.basename(name, path.extname(name))}_1080.webp`;
    const newFilePath = path.join(path.dirname(name), newFileName);
    const optimizedPath = path.join(os.tmpdir(), newFileName);

    await sharp(tempFilePath)
      .resize(1080, 1080, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(optimizedPath);

    await storageBucket.upload(optimizedPath, {
      destination: newFilePath,
      metadata,
    });

    fs.unlinkSync(tempFilePath);
  }
);
