import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import type { Event } from "../../types";

import { storageService } from "../../services/storage";

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
    organizerId: "admin",
    inventory: {
      standard: 0,
      vip: 0,
      premium: 0,
    },
    pricing: {
      standard: 0,
      vip: 0,
      premium: 0,
    },
  });

  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validações
      if (file.size > 5 * 1024 * 1024) {
        toast.error("O arquivo deve ter no máximo 5MB.");
        e.target.value = ""; // Limpa o input
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Apenas arquivos de imagem são permitidos.");
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
      setFormData({
        ...rest,
        inventory: rest.inventory || { standard: 0, vip: 0, premium: 0 },
        pricing: rest.pricing || { standard: 0, vip: 0, premium: 0 },
      });
      if (rest.image) {
        setPreviewUrl(rest.image);
      }
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

  const handleNestedChange = (
    category: "inventory" | "pricing",
    type: "standard" | "vip" | "premium",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || { standard: 0, vip: 0, premium: 0 }),
        [type]: Number(value),
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl = formData.image;

      if (selectedFile) {
        imageUrl = await storageService.uploadEventImage(selectedFile);
      }

      // Sincronizar availableTickets com maxTickets na criação se não especificado diferente
      const dataToSave = { ...formData, image: imageUrl };

      // Limpar pricing zerado para permitir fallback automático no backend/frontend
      if (dataToSave.pricing) {
        const cleanedPricing: Record<string, number> = {};
        let hasPricing = false;

        (["standard", "vip", "premium"] as const).forEach((type) => {
          const val = dataToSave.pricing?.[type];
          if (val && val > 0) {
            cleanedPricing[type] = val;
            hasPricing = true;
          }
        });

        if (hasPricing) {
          dataToSave.pricing = cleanedPricing;
        } else {
          delete dataToSave.pricing;
        }
      }

      // Opcional: Calcular totais com base nos tipos se eles forem maiores que 0
      const totalInventory =
        (dataToSave.inventory?.standard || 0) +
        (dataToSave.inventory?.vip || 0) +
        (dataToSave.inventory?.premium || 0);

      if (totalInventory > 0) {
        dataToSave.availableTickets = totalInventory;
        dataToSave.maxTickets = Math.max(dataToSave.maxTickets, totalInventory);
      } else if (!initialData) {
        dataToSave.availableTickets = dataToSave.maxTickets;
      }

      await onSave(dataToSave);
      toast.success("Evento salvo com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar evento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Título
        </label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Descrição
        </label>
        <textarea
          id="description"
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
          <label htmlFor="date" className="block text-sm font-medium mb-1">
            Data (AAAA-MM-DD)
          </label>
          <Input
            id="date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="time" className="block text-sm font-medium mb-1">
            Hora
          </label>
          <Input
            id="time"
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium mb-1">
          Local (Nome)
        </label>
        <Input
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium mb-1">
          Endereço Completo
        </label>
        <Input
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="block text-sm font-medium mb-1">
            Preço Base (R$)
          </label>
          <Input
            id="price"
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
          <label htmlFor="category" className="block text-sm font-medium mb-1">
            Categoria
          </label>
          <select
            id="category"
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

      <div className="border p-4 rounded-md bg-muted/20">
        <h3 className="font-semibold mb-3">Preços e Estoque por Tipo</h3>

        <div className="grid grid-cols-3 gap-4 mb-2">
          <div className="font-medium text-sm text-center">Tipo</div>
          <div className="font-medium text-sm text-center">Preço (R$)</div>
          <div className="font-medium text-sm text-center">Estoque</div>
        </div>

        {["standard", "vip", "premium"].map((type) => (
          <div key={type} className="grid grid-cols-3 gap-4 mb-2 items-center">
            <div className="capitalize text-sm">{type}</div>
            <Input
              type="number"
              min="0"
              step="0.01"
              aria-label={`Preço ${type}`}
              value={
                formData.pricing?.[type as "standard" | "vip" | "premium"] || 0
              }
              onChange={(e) =>
                handleNestedChange(
                  "pricing",
                  type as "standard" | "vip" | "premium",
                  e.target.value
                )
              }
            />
            <Input
              type="number"
              min="0"
              aria-label={`Estoque ${type}`}
              value={
                formData.inventory?.[type as "standard" | "vip" | "premium"] ||
                0
              }
              onChange={(e) =>
                handleNestedChange(
                  "inventory",
                  type as "standard" | "vip" | "premium",
                  e.target.value
                )
              }
            />
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-2">
          * Se o estoque total dos tipos for maior que 0, ele sobrescreverá o
          estoque total abaixo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="maxTickets"
            className="block text-sm font-medium mb-1"
          >
            Estoque Máximo (Total)
          </label>
          <Input
            id="maxTickets"
            type="number"
            name="maxTickets"
            value={formData.maxTickets}
            onChange={handleChange}
            min="1"
            required
          />
        </div>
        <div>
          <label
            htmlFor="availableTickets"
            className="block text-sm font-medium mb-1"
          >
            Estoque Atual (Total)
          </label>
          <Input
            id="availableTickets"
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
        <label htmlFor="imageFile" className="block text-sm font-medium mb-1">
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
            id="imageFile"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
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
          aria-label="URL da Imagem"
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
