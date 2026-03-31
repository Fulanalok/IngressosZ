import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, X, ImageIcon, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { storageService } from "../../services/storage";
const TICKET_TYPE_LABELS = {
    standard: "Padrão",
    vip: "VIP",
    premium: "Premium",
};
const CATEGORIES = [
    "Entretenimento",
    "Música",
    "Gastronomia",
    "Tecnologia",
    "Educação",
    "Esporte",
];
function SectionTitle({ children }) {
    return (_jsxs("div", { className: "flex items-center gap-2 pt-2 pb-1", children: [_jsx(ChevronRight, { className: "h-4 w-4 text-primary shrink-0" }), _jsx("h3", { className: "text-sm font-semibold text-foreground uppercase tracking-wide", children: children }), _jsx("div", { className: "flex-1 h-px bg-border" })] }));
}
export function EventForm({ initialData, onSave, onCancel }) {
    const [formData, setFormData] = useState({
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
        inventory: { standard: 0, vip: 0, premium: 0 },
        pricing: { standard: 0, vip: 0, premium: 0 },
    });
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("idle");
    const fileInputRef = useRef(null);
    useEffect(() => {
        if (initialData) {
            const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = initialData;
            setFormData({
                ...rest,
                inventory: rest.inventory || { standard: 0, vip: 0, premium: 0 },
                pricing: rest.pricing || { standard: 0, vip: 0, premium: 0 },
            });
            if (rest.image)
                setPreviewUrl(rest.image);
        }
    }, [initialData]);
    const validateAndSetFile = useCallback((file) => {
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
    }, []);
    const handleFileChange = (e) => {
        if (e.target.files?.[0])
            validateAndSetFile(e.target.files[0]);
    };
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file)
            validateAndSetFile(file);
    }, [validateAndSetFile]);
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = () => setIsDragging(false);
    const removeImage = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setFormData((prev) => ({ ...prev, image: "" }));
        setUploadProgress("idle");
        if (fileInputRef.current)
            fileInputRef.current.value = "";
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "price" || name === "maxTickets" || name === "availableTickets"
                ? Number(value)
                : value,
        }));
    };
    const handleNestedChange = (category, type, value) => {
        setFormData((prev) => ({
            ...prev,
            [category]: {
                ...(prev[category] || { standard: 0, vip: 0, premium: 0 }),
                [type]: Number(value),
            },
        }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let imageUrl = formData.image;
            if (selectedFile) {
                setUploadProgress("uploading");
                imageUrl = await storageService.uploadEventImage(selectedFile);
                setUploadProgress("done");
            }
            const dataToSave = { ...formData, image: imageUrl };
            if (dataToSave.pricing) {
                const cleanedPricing = {};
                let hasPricing = false;
                ["standard", "vip", "premium"].forEach((type) => {
                    const val = dataToSave.pricing?.[type];
                    if (val && val > 0) {
                        cleanedPricing[type] = val;
                        hasPricing = true;
                    }
                });
                if (hasPricing) {
                    dataToSave.pricing = cleanedPricing;
                }
                else {
                    delete dataToSave.pricing;
                }
            }
            const totalInventory = (dataToSave.inventory?.standard || 0) +
                (dataToSave.inventory?.vip || 0) +
                (dataToSave.inventory?.premium || 0);
            if (totalInventory > 0) {
                dataToSave.availableTickets = totalInventory;
                dataToSave.maxTickets = Math.max(dataToSave.maxTickets, totalInventory);
            }
            else if (!initialData) {
                dataToSave.availableTickets = dataToSave.maxTickets;
            }
            await onSave(dataToSave);
            toast.success("Evento salvo com sucesso!");
        }
        catch (err) {
            console.error(err);
            toast.error("Erro ao salvar evento");
        }
        finally {
            setLoading(false);
            setUploadProgress("idle");
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-5", children: [_jsx(SectionTitle, { children: "Informa\u00E7\u00F5es B\u00E1sicas" }), _jsxs("div", { children: [_jsx("label", { htmlFor: "title", className: "block text-sm font-medium mb-1", children: "T\u00EDtulo do Evento" }), _jsx(Input, { id: "title", name: "title", value: formData.title, onChange: handleChange, placeholder: "Ex: Festival de Ver\u00E3o 2025", required: true })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "description", className: "block text-sm font-medium mb-1", children: "Descri\u00E7\u00E3o" }), _jsx("textarea", { id: "description", name: "description", value: formData.description, onChange: handleChange, className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none", rows: 3, placeholder: "Descreva o evento para os participantes...", required: true })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "category", className: "block text-sm font-medium mb-1", children: "Categoria" }), _jsx("select", { id: "category", name: "category", value: formData.category, onChange: handleChange, className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", children: CATEGORIES.map((cat) => (_jsx("option", { value: cat, children: cat }, cat))) })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "price", className: "block text-sm font-medium mb-1", children: "Pre\u00E7o Base (R$)" }), _jsx(Input, { id: "price", type: "number", name: "price", value: formData.price, onChange: handleChange, min: "0", step: "0.01", placeholder: "0,00", required: true })] })] }), _jsx(SectionTitle, { children: "Data e Local" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "date", className: "block text-sm font-medium mb-1", children: "Data" }), _jsx(Input, { id: "date", type: "date", name: "date", value: formData.date, onChange: handleChange, required: true })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "time", className: "block text-sm font-medium mb-1", children: "Hora" }), _jsx(Input, { id: "time", type: "time", name: "time", value: formData.time, onChange: handleChange, required: true })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "location", className: "block text-sm font-medium mb-1", children: "Nome do Local" }), _jsx(Input, { id: "location", name: "location", value: formData.location, onChange: handleChange, placeholder: "Ex: Arena Multiuso", required: true })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "address", className: "block text-sm font-medium mb-1", children: "Endere\u00E7o Completo" }), _jsx(Input, { id: "address", name: "address", value: formData.address, onChange: handleChange, placeholder: "Rua, n\u00FAmero, bairro, cidade - UF", required: true })] }), _jsx(SectionTitle, { children: "Ingressos e Pre\u00E7os" }), _jsxs("div", { className: "rounded-lg border border-border overflow-hidden", children: [_jsxs("div", { className: "grid grid-cols-3 gap-0 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider", children: [_jsx("div", { className: "px-4 py-2", children: "Tipo" }), _jsx("div", { className: "px-4 py-2 border-l", children: "Pre\u00E7o (R$)" }), _jsx("div", { className: "px-4 py-2 border-l", children: "Estoque" })] }), ["standard", "vip", "premium"].map((type) => (_jsxs("div", { className: "grid grid-cols-3 gap-0 border-b last:border-b-0 items-center", children: [_jsxs("div", { className: "px-4 py-3 flex items-center gap-2 text-sm font-medium", children: [_jsx("span", { className: `w-2 h-2 rounded-full ${type === "standard"
                                            ? "bg-slate-400"
                                            : type === "vip"
                                                ? "bg-amber-400"
                                                : "bg-purple-500"}` }), TICKET_TYPE_LABELS[type]] }), _jsx("div", { className: "px-3 py-2 border-l", children: _jsx(Input, { type: "number", min: "0", step: "0.01", "aria-label": `Preço ${type}`, value: formData.pricing?.[type] || 0, onChange: (e) => handleNestedChange("pricing", type, e.target.value), className: "h-8 text-sm" }) }), _jsx("div", { className: "px-3 py-2 border-l", children: _jsx(Input, { type: "number", min: "0", "aria-label": `Estoque ${type}`, value: formData.inventory?.[type] || 0, onChange: (e) => handleNestedChange("inventory", type, e.target.value), className: "h-8 text-sm" }) })] }, type)))] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "maxTickets", className: "block text-sm font-medium mb-1", children: "Capacidade Total" }), _jsx(Input, { id: "maxTickets", type: "number", name: "maxTickets", value: formData.maxTickets, onChange: handleChange, min: "1", required: true })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "availableTickets", className: "block text-sm font-medium mb-1", children: "Dispon\u00EDvel Agora" }), _jsx(Input, { id: "availableTickets", type: "number", name: "availableTickets", value: formData.availableTickets, onChange: handleChange, min: "0", required: true })] })] }), _jsx("p", { className: "text-xs text-muted-foreground -mt-2", children: "Se o estoque por tipo for maior que 0, ele sobrescrever\u00E1 a capacidade total." }), _jsx(SectionTitle, { children: "Banner do Evento" }), previewUrl ? (_jsxs("div", { className: "relative w-full h-52 rounded-lg overflow-hidden border border-border group", children: [_jsx("img", { src: previewUrl, alt: "Preview do banner", className: "w-full h-full object-cover" }), _jsxs("div", { className: "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3", children: [_jsx("button", { type: "button", onClick: () => fileInputRef.current?.click(), className: "bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-md border border-white/30 transition-colors", children: "Trocar imagem" }), _jsxs("button", { type: "button", onClick: removeImage, className: "bg-red-500/80 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors flex items-center gap-1", children: [_jsx(X, { className: "h-3 w-3" }), "Remover"] })] }), uploadProgress === "uploading" && (_jsx("div", { className: "absolute bottom-0 inset-x-0 h-1 bg-muted", children: _jsx("div", { className: "h-full bg-primary animate-pulse w-full" }) })), selectedFile && uploadProgress !== "uploading" && (_jsx("div", { className: "absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded", children: selectedFile.name }))] })) : (_jsxs("div", { onDrop: handleDrop, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onClick: () => fileInputRef.current?.click(), className: `w-full h-40 rounded-lg border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-3 select-none
            ${isDragging
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"}`, children: [_jsx("div", { className: `p-3 rounded-full transition-colors ${isDragging ? "bg-primary/20" : "bg-muted"}`, children: _jsx(Upload, { className: `h-5 w-5 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}` }) }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-sm font-medium text-foreground", children: isDragging ? "Solte a imagem aqui" : "Arraste ou clique para enviar" }), _jsx("p", { className: "text-xs text-muted-foreground mt-0.5", children: "PNG, JPG, WEBP \u00B7 m\u00E1x. 5MB" })] }), _jsxs("div", { className: "flex items-center gap-1.5 text-xs text-muted-foreground", children: [_jsx(ImageIcon, { className: "h-3 w-3" }), _jsx("span", { children: "Ou cole uma URL abaixo" })] })] })), _jsx("input", { ref: fileInputRef, id: "imageFile", type: "file", accept: "image/*", onChange: handleFileChange, className: "hidden" }), _jsx(Input, { name: "image", value: formData.image, onChange: handleChange, placeholder: "https://exemplo.com/banner.jpg", "aria-label": "URL da Imagem" }), _jsxs("div", { className: "flex justify-end gap-3 pt-4 border-t", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: onCancel, disabled: loading, children: "Cancelar" }), _jsx(Button, { type: "submit", disabled: loading, className: "min-w-28", children: loading ? (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { className: "h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" }), uploadProgress === "uploading" ? "Enviando imagem..." : "Salvando..."] })) : (`${initialData ? "Atualizar" : "Criar"} Evento`) })] })] }));
}
