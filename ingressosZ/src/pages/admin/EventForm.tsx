import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, X, ImageIcon, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Event } from "@/types";
import { storageService } from "@/services/storage";

type EventFormData = Omit<Event, "id" | "createdAt" | "updatedAt">;
type TicketType = "standard" | "vip" | "premium";
type UploadProgress = "idle" | "uploading" | "done";

interface EventFormProps {
  initialData?: Event | null;
  onValidate?: (data: EventFormData) => Promise<void> | void;
  onSave: (data: EventFormData) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const TICKET_TYPE_LABELS: Record<string, string> = {
  standard: "Padrão",
  vip: "VIP",
  premium: "Premium",
};

const TICKET_TYPE_COLORS: Record<TicketType, string> = {
  standard: "bg-slate-400",
  vip: "bg-amber-400",
  premium: "bg-purple-500",
};

const CATEGORIES = [
  "Entretenimento",
  "Música",
  "Gastronomia",
  "Tecnologia",
  "Educação",
  "Esporte",
];

const TICKET_TYPES: TicketType[] = ["standard", "vip", "premium"];
const EMPTY_TICKET_VALUES: Record<TicketType, number> = {
  standard: 0,
  vip: 0,
  premium: 0,
};

function createDefaultFormData(): EventFormData {
  return {
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
    inventory: { ...EMPTY_TICKET_VALUES },
    pricing: { ...EMPTY_TICKET_VALUES },
  };
}

function getInputValue(name: string, value: string) {
  if (["price", "maxTickets", "availableTickets"].includes(name)) {
    return Number(value);
  }
  if (name !== "maxPerPurchase") return value;
  return value === "" ? undefined : Number(value);
}

function getDateValidationError(date: string) {
  if (!date) return "A data do evento é obrigatória.";

  const eventDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(eventDate.getTime())) return "Data do evento inválida.";
  if (eventDate < today) return "A data do evento não pode ser no passado.";
  return null;
}

function cleanPricing(data: EventFormData) {
  const cleanedPricing: Record<string, number> = {};

  TICKET_TYPES.forEach((type) => {
    const value = data.pricing?.[type];
    if (value && value > 0) cleanedPricing[type] = value;
  });

  return Object.keys(cleanedPricing).length > 0 ? cleanedPricing : undefined;
}

function getTotalInventory(data: EventFormData) {
  return TICKET_TYPES.reduce(
    (total, type) => total + (data.inventory?.[type] || 0),
    0
  );
}

function prepareEventData(
  formData: EventFormData,
  imageUrl: string,
  isEditing: boolean
): EventFormData {
  const dataToSave = { ...formData };
  if (imageUrl || "image" in formData) dataToSave.image = imageUrl;
  if (isEditing) return dataToSave;

  const pricing = cleanPricing(dataToSave);
  const totalInventory = getTotalInventory(dataToSave);

  if (pricing) dataToSave.pricing = pricing;
  if (!pricing) delete dataToSave.pricing;

  if (totalInventory > 0) {
    dataToSave.availableTickets = totalInventory;
    dataToSave.maxTickets = Math.max(dataToSave.maxTickets, totalInventory);
  } else {
    dataToSave.availableTickets = dataToSave.maxTickets;
  }

  return dataToSave;
}

async function resolveImageUrl(
  currentImage: string | undefined,
  selectedFile: File | null,
  setUploadProgress: (progress: UploadProgress) => void
) {
  if (!selectedFile) return currentImage || "";

  setUploadProgress("uploading");
  const imageUrl = await storageService.uploadEventImage(selectedFile);
  setUploadProgress("done");
  return imageUrl;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      <ChevronRight className="h-4 w-4 text-primary shrink-0" />
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
        {children}
      </h3>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function TicketInventoryRows({
  formData,
  onNestedChange,
}: {
  formData: EventFormData;
  onNestedChange: (
    category: "inventory" | "pricing",
    type: TicketType,
    value: string
  ) => void;
}) {
  return (
    <>
      {TICKET_TYPES.map((type) => (
        <div
          key={type}
          className="grid grid-cols-3 gap-0 border-b last:border-b-0 items-center"
        >
          <div className="px-4 py-3 flex items-center gap-2 text-sm font-medium">
            <span className={`w-2 h-2 rounded-full ${TICKET_TYPE_COLORS[type]}`} />
            {TICKET_TYPE_LABELS[type]}
          </div>
          <div className="px-3 py-2 border-l">
            <Input
              type="number"
              min="0"
              step="0.01"
              aria-label={`Preço ${type}`}
              value={formData.pricing?.[type] || 0}
              onChange={(e) => onNestedChange("pricing", type, e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="px-3 py-2 border-l">
            <Input
              type="number"
              min="0"
              aria-label={`Estoque ${type}`}
              value={formData.inventory?.[type] || 0}
              onChange={(e) => onNestedChange("inventory", type, e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      ))}
    </>
  );
}

function BannerPreview({
  fileInputRef,
  previewUrl,
  removeImage,
  selectedFile,
  uploadProgress,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  previewUrl: string;
  removeImage: () => void;
  selectedFile: File | null;
  uploadProgress: UploadProgress;
}) {
  return (
    <div className="relative w-full h-52 rounded-lg overflow-hidden border border-border group">
      <img
        src={previewUrl}
        alt="Preview do banner"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-background hover:bg-muted text-foreground text-xs font-semibold px-3 py-1.5 rounded-none border border-border transition-colors"
        >
          Trocar imagem
        </button>
        <button
          type="button"
          onClick={removeImage}
          className="bg-red-500/80 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-none transition-colors flex items-center gap-1"
        >
          <X className="h-3 w-3" />
          Remover
        </button>
      </div>
      {uploadProgress === "uploading" && (
        <div className="absolute bottom-0 inset-x-0 h-1 bg-muted">
          <div className="h-full bg-primary animate-pulse w-full" />
        </div>
      )}
      {selectedFile && uploadProgress !== "uploading" && (
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
          {selectedFile.name}
        </div>
      )}
    </div>
  );
}

function BannerDropZone({
  fileInputRef,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  isDragging,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleDragLeave: () => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging: boolean;
}) {
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      className={`w-full h-40 rounded-lg border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 select-none
        ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
        }`}
    >
      <div
        className={`p-3 rounded-full transition-colors ${
          isDragging ? "bg-primary/20" : "bg-muted"
        }`}
      >
        <Upload
          className={`h-5 w-5 transition-colors ${
            isDragging ? "text-primary" : "text-muted-foreground"
          }`}
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {isDragging ? "Solte a imagem aqui" : "Arraste ou clique para enviar"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          PNG, JPG, WEBP · máx. 5MB
        </p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ImageIcon className="h-3 w-3" />
        <span>Ou cole uma URL abaixo</span>
      </div>
    </div>
  );
}

function BannerField({
  fileInputRef,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  isDragging,
  previewUrl,
  removeImage,
  selectedFile,
  uploadProgress,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleDragLeave: () => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging: boolean;
  previewUrl: string | null;
  removeImage: () => void;
  selectedFile: File | null;
  uploadProgress: UploadProgress;
}) {
  return previewUrl ? (
    <BannerPreview
      fileInputRef={fileInputRef}
      previewUrl={previewUrl}
      removeImage={removeImage}
      selectedFile={selectedFile}
      uploadProgress={uploadProgress}
    />
  ) : (
    <BannerDropZone
      fileInputRef={fileInputRef}
      handleDragLeave={handleDragLeave}
      handleDragOver={handleDragOver}
      handleDrop={handleDrop}
      isDragging={isDragging}
    />
  );
}

function getSubmitLabel(
  initialData: Event | null | undefined,
  loading: boolean,
  uploadProgress: UploadProgress
) {
  if (!loading) return `${initialData ? "Atualizar" : "Criar"} Evento`;
  return uploadProgress === "uploading" ? "Enviando imagem..." : "Salvando...";
}

function FormActions({
  initialData,
  isDirty,
  loading,
  onCancel,
  uploadProgress,
}: {
  initialData?: Event | null;
  isDirty: boolean;
  loading: boolean;
  onCancel: () => void;
  uploadProgress: UploadProgress;
}) {
  const submitLabel = getSubmitLabel(initialData, loading, uploadProgress);
  const handleCancel = () => {
    if (isDirty && !window.confirm("Há alterações não salvas. Deseja descartá-las?")) {
      return;
    }
    onCancel();
  };

  return (
    <div className="flex justify-end gap-3 pt-4 border-t">
      <Button
        type="button"
        variant="secondary"
        onClick={handleCancel}
        disabled={loading}
      >
        Cancelar
      </Button>
      <Button type="submit" disabled={loading} className="min-w-28">
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            {submitLabel}
          </span>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  );
}

export function EventForm({
  initialData,
  onValidate,
  onSave,
  onCancel,
  onDirtyChange,
}: EventFormProps) {
  const [formData, setFormData] = useState<EventFormData>(
    createDefaultFormData()
  );

  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke blob URL to prevent memory leaks when preview changes or component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const markDirty = () => {
    if (!isDirty) {
      setIsDirty(true);
      onDirtyChange?.(true);
    }
  };

  useEffect(() => {
    if (initialData) {
      const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = initialData;
      setFormData(rest);
      if (rest.image) setPreviewUrl(rest.image);
    }
  }, [initialData]);

  const validateAndSetFile = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 5MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas arquivos de imagem são permitidos.");
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setUploadProgress("idle");
    markDirty();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) validateAndSetFile(e.target.files[0]);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSetFile(file);
    },
    [validateAndSetFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const removeImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData((prev) => ({ ...prev, image: "" }));
    setUploadProgress("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    markDirty();
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: getInputValue(name, value),
    }));
  };

  const handleNestedChange = (
    category: "inventory" | "pricing",
    type: TicketType,
    value: string
  ) => {
    markDirty();
    setFormData((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || { ...EMPTY_TICKET_VALUES }),
        [type]: Number(value),
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dateError = getDateValidationError(formData.date);
    if (dateError) {
      toast.error(dateError);
      return;
    }

    setLoading(true);
    try {
      const isEditing = Boolean(initialData);
      const dataToValidate = prepareEventData(
        formData,
        formData.image || "",
        isEditing
      );
      await onValidate?.(dataToValidate);

      const imageUrl = await resolveImageUrl(
        formData.image,
        selectedFile,
        setUploadProgress
      );
      const dataToSave = prepareEventData(formData, imageUrl, isEditing);
      await onSave(dataToSave);
      setIsDirty(false);
      onDirtyChange?.(false);
      toast.success("Evento salvo com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar evento");
    } finally {
      setLoading(false);
      setUploadProgress("idle");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Informações Básicas */}
      <SectionTitle>Informações Básicas</SectionTitle>

      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Título do Evento
        </label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Ex: Festival de Verão 2025"
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
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          rows={3}
          placeholder="Descreva o evento para os participantes..."
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
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
            placeholder="0,00"
            required
          />
        </div>
      </div>

      {/* Data e Local */}
      <SectionTitle>Data e Local</SectionTitle>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium mb-1">
            Data
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
          Nome do Local
        </label>
        <Input
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="Ex: Arena Multiuso"
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
          placeholder="Rua, número, bairro, cidade - UF"
          required
        />
      </div>

      {/* Ingressos */}
      <SectionTitle>Ingressos e Preços</SectionTitle>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-3 gap-0 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="px-4 py-2">Tipo</div>
          <div className="px-4 py-2 border-l">Preço (R$)</div>
          <div className="px-4 py-2 border-l">Estoque</div>
        </div>
        <TicketInventoryRows
          formData={formData}
          onNestedChange={handleNestedChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="maxTickets" className="block text-sm font-medium mb-1">
            Capacidade Total
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
          <label htmlFor="availableTickets" className="block text-sm font-medium mb-1">
            Disponível Agora
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
      <p className="text-xs text-muted-foreground -mt-2">
        Se o estoque por tipo for maior que 0, ele sobrescreverá a capacidade total.
      </p>

      <div>
        <label
          htmlFor="maxPerPurchase"
          className="block text-sm font-medium mb-1"
        >
          Máximo por compra (opcional)
        </label>
        <Input
          id="maxPerPurchase"
          type="number"
          name="maxPerPurchase"
          value={formData.maxPerPurchase ?? ""}
          onChange={handleChange}
          min="1"
          max="50"
          placeholder="Padrão: 5"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Limite de ingressos por transação. Deixe vazio para usar o padrão (5).
        </p>
      </div>

      {/* Banner */}
      <SectionTitle>Banner do Evento</SectionTitle>

      <BannerField
        fileInputRef={fileInputRef}
        handleDragLeave={handleDragLeave}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        isDragging={isDragging}
        previewUrl={previewUrl}
        removeImage={removeImage}
        selectedFile={selectedFile}
        uploadProgress={uploadProgress}
      />

      <input
        ref={fileInputRef}
        id="imageFile"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <Input
        name="image"
        value={formData.image}
        onChange={handleChange}
        placeholder="https://exemplo.com/banner.jpg"
        aria-label="URL da Imagem"
      />

      <FormActions
        initialData={initialData}
        isDirty={isDirty}
        loading={loading}
        onCancel={onCancel}
        uploadProgress={uploadProgress}
      />
    </form>
  );
}
