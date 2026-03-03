import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { storageService } from "../../services/storage";
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
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const handleFileChange = (e) => {
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
                imageUrl = await storageService.uploadEventImage(selectedFile);
            }
            // Sincronizar availableTickets com maxTickets na criação se não especificado diferente
            const dataToSave = { ...formData, image: imageUrl };
            // Limpar pricing zerado para permitir fallback automático no backend/frontend
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
            // Opcional: Calcular totais com base nos tipos se eles forem maiores que 0
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
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "title", className: "block text-sm font-medium mb-1", children: "T\u00EDtulo" }), _jsx(Input, { id: "title", name: "title", value: formData.title, onChange: handleChange, required: true })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "description", className: "block text-sm font-medium mb-1", children: "Descri\u00E7\u00E3o" }), _jsx("textarea", { id: "description", name: "description", value: formData.description, onChange: handleChange, className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", rows: 3, required: true })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "date", className: "block text-sm font-medium mb-1", children: "Data (AAAA-MM-DD)" }), _jsx(Input, { id: "date", type: "date", name: "date", value: formData.date, onChange: handleChange, required: true })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "time", className: "block text-sm font-medium mb-1", children: "Hora" }), _jsx(Input, { id: "time", type: "time", name: "time", value: formData.time, onChange: handleChange, required: true })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "location", className: "block text-sm font-medium mb-1", children: "Local (Nome)" }), _jsx(Input, { id: "location", name: "location", value: formData.location, onChange: handleChange, required: true })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "address", className: "block text-sm font-medium mb-1", children: "Endere\u00E7o Completo" }), _jsx(Input, { id: "address", name: "address", value: formData.address, onChange: handleChange, required: true })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "price", className: "block text-sm font-medium mb-1", children: "Pre\u00E7o Base (R$)" }), _jsx(Input, { id: "price", type: "number", name: "price", value: formData.price, onChange: handleChange, min: "0", step: "0.01", required: true })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "category", className: "block text-sm font-medium mb-1", children: "Categoria" }), _jsxs("select", { id: "category", name: "category", value: formData.category, onChange: handleChange, className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", children: [_jsx("option", { value: "Entretenimento", children: "Entretenimento" }), _jsx("option", { value: "M\u00FAsica", children: "M\u00FAsica" }), _jsx("option", { value: "Gastronomia", children: "Gastronomia" }), _jsx("option", { value: "Tecnologia", children: "Tecnologia" }), _jsx("option", { value: "Educa\u00E7\u00E3o", children: "Educa\u00E7\u00E3o" }), _jsx("option", { value: "Esporte", children: "Esporte" })] })] })] }), _jsxs("div", { className: "border p-4 rounded-md bg-muted/20", children: [_jsx("h3", { className: "font-semibold mb-3", children: "Pre\u00E7os e Estoque por Tipo" }), _jsxs("div", { className: "grid grid-cols-3 gap-4 mb-2", children: [_jsx("div", { className: "font-medium text-sm text-center", children: "Tipo" }), _jsx("div", { className: "font-medium text-sm text-center", children: "Pre\u00E7o (R$)" }), _jsx("div", { className: "font-medium text-sm text-center", children: "Estoque" })] }), ["standard", "vip", "premium"].map((type) => (_jsxs("div", { className: "grid grid-cols-3 gap-4 mb-2 items-center", children: [_jsx("div", { className: "capitalize text-sm", children: type }), _jsx(Input, { type: "number", min: "0", step: "0.01", "aria-label": `Preço ${type}`, value: formData.pricing?.[type] || 0, onChange: (e) => handleNestedChange("pricing", type, e.target.value) }), _jsx(Input, { type: "number", min: "0", "aria-label": `Estoque ${type}`, value: formData.inventory?.[type] ||
                                    0, onChange: (e) => handleNestedChange("inventory", type, e.target.value) })] }, type))), _jsx("p", { className: "text-xs text-muted-foreground mt-2", children: "* Se o estoque total dos tipos for maior que 0, ele sobrescrever\u00E1 o estoque total abaixo." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "maxTickets", className: "block text-sm font-medium mb-1", children: "Estoque M\u00E1ximo (Total)" }), _jsx(Input, { id: "maxTickets", type: "number", name: "maxTickets", value: formData.maxTickets, onChange: handleChange, min: "1", required: true })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "availableTickets", className: "block text-sm font-medium mb-1", children: "Estoque Atual (Total)" }), _jsx(Input, { id: "availableTickets", type: "number", name: "availableTickets", value: formData.availableTickets, onChange: handleChange, min: "0", required: true })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "imageFile", className: "block text-sm font-medium mb-1", children: "Imagem do Evento" }), previewUrl && (_jsx("div", { className: "mb-2 relative w-full h-48 bg-muted rounded-md overflow-hidden", children: _jsx("img", { src: previewUrl, alt: "Preview", className: "w-full h-full object-cover" }) })), _jsx("div", { className: "flex gap-2 items-center", children: _jsx(Input, { id: "imageFile", type: "file", accept: "image/*", onChange: handleFileChange, className: "file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" }) }), _jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "Ou cole uma URL externa abaixo:" }), _jsx(Input, { name: "image", value: formData.image, onChange: handleChange, placeholder: "https://exemplo.com/imagem.jpg", "aria-label": "URL da Imagem" })] }), _jsxs("div", { className: "flex justify-end space-x-2 pt-4 border-t", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: onCancel, children: "Cancelar" }), _jsx(Button, { type: "submit", disabled: loading, children: loading ? "Salvando..." : "Salvar Evento" })] })] }));
}
