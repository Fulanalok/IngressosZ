import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { EventForm } from "../EventForm";
import type { Event } from "../../../types";

// Mock do serviço de storage
vi.mock("../../../services/storage", () => ({
  storageService: {
    uploadEventImage: vi.fn().mockResolvedValue("https://example.com/image.jpg"),
  },
}));

// Mock do Sonner (notificações)
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Componente EventForm", () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve renderizar campos de informações básicas", () => {
    render(<EventForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    
    expect(screen.getByLabelText(/Título do Evento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preço Base/i)).toBeInTheDocument();
  });

  it("deve preencher informações de ingressos VIP e Premium", () => {
    render(<EventForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    
    const vipPriceInput = screen.getByLabelText("Preço vip");
    const vipStockInput = screen.getByLabelText("Estoque vip");
    
    fireEvent.change(vipPriceInput, { target: { value: "300" } });
    fireEvent.change(vipStockInput, { target: { value: "50" } });
    
    expect(vipPriceInput).toHaveValue(300);
    expect(vipStockInput).toHaveValue(50);
  });

  it("deve chamar onSave com os dados corretos ao submeter o formulário", async () => {
    render(<EventForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    
    // Preenchendo campos obrigatórios
    fireEvent.change(screen.getByLabelText(/Título do Evento/i), { target: { value: "Festa de Gala" } });
    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: "Um evento exclusivo" } });
    fireEvent.change(screen.getByLabelText(/Preço Base/i), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2025-12-25" } });
    fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "21:00" } });
    fireEvent.change(screen.getByLabelText(/Nome do Local/i), { target: { value: "Teatro Municipal" } });
    fireEvent.change(screen.getByLabelText(/Endereço Completo/i), { target: { value: "Praça Ramos" } });

    // Submetendo
    fireEvent.click(screen.getByRole("button", { name: /Criar Evento/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
      const savedData = mockOnSave.mock.calls[0][0];
      expect(savedData.title).toEqual("Festa de Gala");
      expect(savedData.price).toEqual(100);
      expect(savedData.location).toEqual("Teatro Municipal");
    });
  });

  it("deve carregar dados iniciais corretamente no modo edição", () => {
    const initialData: Partial<Event> = {
      id: "e1",
      title: "Evento Existente",
      description: "Desc",
      price: 50,
      availableTickets: 100,
      maxTickets: 100,
      category: "Entretenimento",
      pricing: { standard: 50, vip: 150 },
      inventory: { standard: 80, vip: 20 },
    };

    render(<EventForm initialData={initialData as Event} onSave={mockOnSave} onCancel={mockOnCancel} />);
    
    expect(screen.getByLabelText(/Título do Evento/i)).toHaveValue("Evento Existente");
    expect(screen.getByLabelText("Preço vip")).toHaveValue(150);
    expect(screen.getByLabelText("Estoque vip")).toHaveValue(20);
  });
});
