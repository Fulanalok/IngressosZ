import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebaseConfig";

export const storageService = {
  /**
   * Uploads an event image to Firebase Storage.
   * Returns the download URL.
   * @param file The file to upload
   * @param pathPrefix Optional prefix for the storage path (default: 'events')
   */
  async uploadEventImage(file: File, pathPrefix = "events"): Promise<string> {
    if (!file) throw new Error("No file provided");

    // Create a unique filename using timestamp and random string to avoid collisions
    const fileExtension = file.name.split(".").pop();
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const timestamp = Date.now();
    const fileName = `${timestamp}_${uniqueId}.${fileExtension}`;
    
    const storageRef = ref(storage, `${pathPrefix}/${fileName}`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  },
};
