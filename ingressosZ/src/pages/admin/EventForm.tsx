import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import type { Event } from "../../types";

interface EventFormProps {
  initialData?: Event | null;
  onSave: (
    data: Omit<Event, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  onCancel: () => void;
}

export function EventForm({ initialData, onSave, onCancel }: EventFormProps) {
  const [formData, setFormData] = useState<
    Omit<Event, "id" | "createdAt" | "updatedAt">
  >({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    address: "",
    price: 0,
    maxTickets: 100,
    availableTickets: 100,
    category: "Entretenimento",
    image: "",
    organizerId: "admin", // Será sobrescrito ou ignorado dependendo da lógica
  });

  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validações
      if (file.size > 5 * 1024 * 1024) {
        alert("O arquivo deve ter no máximo 5MB.");
        e.target.value = ""; // Limpa o input
        return;
      }

      if (!file.type.startsWith("image/")) {
        alert("Apenas arquivos de imagem são permitidos.");
        e.target.value = "";
        return;
      }

      setSelectedFile(file);
      // Create local preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  useEffect(() => {
    if (initialData) {
      const { id, createdAt, updatedAt, ...rest } = initialData;
      setFormData(rest);
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "price" || name === "maxTickets" || name === "availableTickets"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Sincronizar availableTickets com maxTickets na criação se não especificado diferente
      const dataToSave = { ...formData };
      if (!initialData) {
        dataToSave.availableTickets = dataToSave.maxTickets;
      }
      await onSave(dataToSave);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar evento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Título</label>
        <Input
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Descrição</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Data (AAAA-MM-DD)
          </label>
          <Input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Hora</label>
          <Input
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Local (Nome)</label>
        <Input
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Endereço Completo
        </label>
        <Input
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Preço (R$)</label>
          <Input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Categoria</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="Entretenimento">Entretenimento</option>
            <option value="Música">Música</option>
            <option value="Gastronomia">Gastronomia</option>
            <option value="Tecnologia">Tecnologia</option>
            <option value="Educação">Educação</option>
            <option value="Esporte">Esporte</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Estoque Máximo
          </label>
          <Input
            type="number"
            name="maxTickets"
            value={formData.maxTickets}
            onChange={handleChange}
            min="1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Estoque Atual
          </label>
          <Input
            type="number"
            name="availableTickets"
            value={formData.availableTickets}
            onChange={handleChange}
            min="0"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Imagem do Evento
        </label>

        {previewUrl && (
          <div className="mb-2 relative w-full h-48 bg-muted rounded-md overflow-hidden">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex gap-2 items-center">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Ou cole uma URL externa abaixo:
        </p>
        <Input
          name="image"
          value={formData.image}
          onChange={handleChange}
          placeholder="https://exemplo.com/imagem.jpg"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Evento"}
        </Button>
      </div>
    </form>
  );
}
