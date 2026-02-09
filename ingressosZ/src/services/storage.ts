import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebaseConfig";

export const storageService = {
  /**
   * Carrega a imagem de um evento para o Firebase Storage.
   * Retorna a URL da imagem otimizada (WebP).
   */
  async uploadEventImage(file: File, pathPrefix = "events"): Promise<string> {
    if (!storage) throw new Error("Firebase Storage não inicializado");
    if (!file) throw new Error("Nenhum arquivo fornecido");

    const fileExtension = file.name.split(".").pop();
    const baseFileName = `${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const originalFileName = `${baseFileName}.${fileExtension}`;
    const storageRef = ref(storage, `${pathPrefix}/${originalFileName}`);

    try {
      // 1. Fazer o upload do arquivo original
      const snapshot = await uploadBytes(storageRef, file);

      // 2. Obter a URL de download
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 3. Modificar a URL para apontar para a versão otimizada .webp
      // A Cloud Function irá criar um arquivo com o mesmo nome base + _1080.webp
      const optimizedFileName = `${baseFileName}_1080.webp`;
      const url = new URL(downloadURL);
      const newPath = url.pathname.replace(originalFileName, optimizedFileName);

      // Recria a URL com o novo caminho e mantém o token de acesso
      const optimizedUrl = `https://${
        url.hostname
      }${newPath}?${url.searchParams.toString()}`;

      // Decodifica a URL para um formato mais limpo
      return decodeURIComponent(optimizedUrl);
    } catch (error) {
      console.error("Erro ao carregar a imagem:", error);
      throw error;
    }
  },

  /**
   * Carrega o avatar do usuário para o Firebase Storage.
   */
  async uploadUserAvatar(userId: string, file: File): Promise<string> {
    if (!storage) throw new Error("Firebase Storage não inicializado");
    if (!file) throw new Error("Nenhum arquivo fornecido");

    // Limitar tamanho (ex: 2MB)
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("A imagem deve ter no máximo 2MB");
    }

    const fileExtension = file.name.split(".").pop();
    const fileName = `avatar_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `users/${userId}/${fileName}`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Erro ao carregar avatar:", error);
      throw error;
    }
  },
};
