import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { storageService } from "../../services/storage";
import type { Event } from "../../types";
import { EventForm } from "./EventForm";

// Mock dependencies
vi.mock("../../services/storage", () => ({
  storageService: {
    uploadEventImage: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("EventForm Component", () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    onSave: mockOnSave,
    onCancel: mockOnCancel,
  };

  const initialData: Event = {
    id: "1",
    title: "Existing Event",
    description: "Description",
    date: "2023-12-31",
    time: "20:00",
    location: "Venue",
    address: "Address",
    price: 100,
    maxTickets: 200,
    availableTickets: 200,
    category: "Música",
    image: "https://example.com/existing.jpg",
    organizerId: "admin",
    createdAt: "2023-01-01",
    updatedAt: "2023-01-01",
    inventory: {
      standard: 100,
      vip: 50,
      premium: 50,
    },
    pricing: {
      standard: 100,
      vip: 200,
      premium: 300,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (storageService.uploadEventImage as any).mockResolvedValue(
      "https://example.com/image.jpg"
    );
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => "blob:test");
  });

  it("renders correctly with empty form for new event", () => {
    render(<EventForm {...defaultProps} />);
    expect(screen.getByLabelText(/Título/i)).toHaveValue("");
    expect(screen.getByText("Salvar Evento")).toBeInTheDocument();
  });

  it("renders correctly with initial data for editing", () => {
    render(<EventForm {...defaultProps} initialData={initialData} />);
    expect(screen.getByLabelText(/Título/i)).toHaveValue("Existing Event");
    expect(screen.getByLabelText(/Preço Base/i)).toHaveValue(100);
    expect(screen.getAllByDisplayValue("100").length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("200").length).toBeGreaterThan(0);
  });

  it("updates nested inventory and pricing correctly", () => {
    render(<EventForm {...defaultProps} />);
    const numberInputs = screen.getAllByRole("spinbutton");
    expect(numberInputs).toHaveLength(9);
    const standardPricingInput = numberInputs[1];
    const standardInventoryInput = numberInputs[2];
    fireEvent.change(standardPricingInput, { target: { value: "150" } });
    fireEvent.change(standardInventoryInput, { target: { value: "500" } });
    expect(standardPricingInput).toHaveValue(150);
    expect(standardInventoryInput).toHaveValue(500);
  });

  it("submits form with correct data including cleaned pricing", async () => {
    render(<EventForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Título/i), {
      target: { value: "New Event" },
    });
    fireEvent.change(screen.getByLabelText(/Descrição/i), {
      target: { value: "Desc" },
    });
    fireEvent.change(screen.getByLabelText(/Data/i), {
      target: { value: "2024-01-01" },
    });
    fireEvent.change(screen.getByLabelText(/Hora/i), {
      target: { value: "20:00" },
    });
    fireEvent.change(screen.getByLabelText(/Local \(Nome\)/i), {
      target: { value: "Venue" },
    });
    fireEvent.change(screen.getByLabelText(/Endereço Completo/i), {
      target: { value: "Addr" },
    });
    fireEvent.change(screen.getByLabelText(/Preço Base/i), {
      target: { value: "50" },
    });

    const numberInputs = screen.getAllByRole("spinbutton");
    fireEvent.change(numberInputs[1], { target: { value: "60" } });
    fireEvent.change(numberInputs[2], { target: { value: "100" } });

    const submitBtn = screen.getByText("Salvar Evento");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });

    const savedData = mockOnSave.mock.calls[0][0];
    expect(savedData.title).toBe("New Event");
    expect(savedData.pricing).toEqual({ standard: 60 });
    expect(savedData.inventory.standard).toBe(100);
    expect(savedData.availableTickets).toBe(100);
  });

  it("handles file upload successfully", async () => {
    render(<EventForm {...defaultProps} />);
    const file = new File(["(⌐□_□)"], "chucknorris.png", { type: "image/png" });
    const input = screen.getByLabelText(/Imagem do Evento/i);

    fireEvent.change(input, { target: { files: [file] } });

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);

    // Submit form to trigger upload
    fireEvent.change(screen.getByLabelText(/Título/i), {
      target: { value: "Image Event" },
    });
    fireEvent.change(screen.getByLabelText(/Descrição/i), {
      target: { value: "Desc" },
    });
    fireEvent.change(screen.getByLabelText(/Data/i), {
      target: { value: "2024-01-01" },
    });
    fireEvent.change(screen.getByLabelText(/Hora/i), {
      target: { value: "20:00" },
    });
    fireEvent.change(screen.getByLabelText(/Local \(Nome\)/i), {
      target: { value: "Venue" },
    });
    fireEvent.change(screen.getByLabelText(/Endereço Completo/i), {
      target: { value: "Addr" },
    });

    const submitBtn = screen.getByText("Salvar Evento");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(storageService.uploadEventImage).toHaveBeenCalledWith(file);
    });
  });

  it("validates file size", () => {
    render(<EventForm {...defaultProps} />);
    const file = new File(["a".repeat(6 * 1024 * 1024)], "large.png", {
      type: "image/png",
    });
    const input = screen.getByLabelText(/Imagem do Evento/i);

    fireEvent.change(input, { target: { files: [file] } });

    expect(toast.error).toHaveBeenCalledWith(
      "O arquivo deve ter no máximo 5MB."
    );
  });

  it("validates file type", () => {
    render(<EventForm {...defaultProps} />);
    const file = new File(["text"], "test.txt", { type: "text/plain" });
    const input = screen.getByLabelText(/Imagem do Evento/i);

    fireEvent.change(input, { target: { files: [file] } });

    expect(toast.error).toHaveBeenCalledWith(
      "Apenas arquivos de imagem são permitidos."
    );
  });

  it("handles save error", async () => {
    mockOnSave.mockRejectedValueOnce(new Error("Save failed"));
    render(<EventForm {...defaultProps} />);

    // Fill minimum required
    fireEvent.change(screen.getByLabelText(/Título/i), {
      target: { value: "Error Event" },
    });
    fireEvent.change(screen.getByLabelText(/Descrição/i), {
      target: { value: "Desc" },
    });
    fireEvent.change(screen.getByLabelText(/Data/i), {
      target: { value: "2024-01-01" },
    });
    fireEvent.change(screen.getByLabelText(/Hora/i), {
      target: { value: "20:00" },
    });
    fireEvent.change(screen.getByLabelText(/Local \(Nome\)/i), {
      target: { value: "Venue" },
    });
    fireEvent.change(screen.getByLabelText(/Endereço Completo/i), {
      target: { value: "Addr" },
    });

    const submitBtn = screen.getByText("Salvar Evento");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Erro ao salvar evento");
    });
  });

  it("handles image upload error", async () => {
    (storageService.uploadEventImage as any).mockRejectedValueOnce(
      new Error("Upload failed")
    );
    render(<EventForm {...defaultProps} />);

    const file = new File(["(⌐□_□)"], "chucknorris.png", { type: "image/png" });
    const input = screen.getByLabelText(/Imagem do Evento/i);
    fireEvent.change(input, { target: { files: [file] } });

    // Fill form
    fireEvent.change(screen.getByLabelText(/Título/i), {
      target: { value: "Upload Error Event" },
    });
    fireEvent.change(screen.getByLabelText(/Descrição/i), {
      target: { value: "Desc" },
    });
    fireEvent.change(screen.getByLabelText(/Data/i), {
      target: { value: "2024-01-01" },
    });
    fireEvent.change(screen.getByLabelText(/Hora/i), {
      target: { value: "20:00" },
    });
    fireEvent.change(screen.getByLabelText(/Local \(Nome\)/i), {
      target: { value: "Venue" },
    });
    fireEvent.change(screen.getByLabelText(/Endereço Completo/i), {
      target: { value: "Addr" },
    });

    const submitBtn = screen.getByText("Salvar Evento");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Erro ao salvar evento");
    });
  });

  it("syncs availableTickets with maxTickets for new event when inventory is empty", async () => {
    render(<EventForm {...defaultProps} />);

    // Fill basic fields only
    fireEvent.change(screen.getByLabelText(/Título/i), {
      target: { value: "Simple Event" },
    });
    fireEvent.change(screen.getByLabelText(/Descrição/i), {
      target: { value: "Desc" },
    });
    fireEvent.change(screen.getByLabelText(/Data/i), {
      target: { value: "2024-01-01" },
    });
    fireEvent.change(screen.getByLabelText(/Hora/i), {
      target: { value: "20:00" },
    });
    fireEvent.change(screen.getByLabelText(/Local \(Nome\)/i), {
      target: { value: "Venue" },
    });
    fireEvent.change(screen.getByLabelText(/Endereço Completo/i), {
      target: { value: "Addr" },
    });

    // Set max tickets manually if needed, but default is 100.
    // Ensure inventory inputs are 0 (default).

    const submitBtn = screen.getByText("Salvar Evento");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });

    const savedData = mockOnSave.mock.calls[0][0];
    expect(savedData.availableTickets).toBe(savedData.maxTickets);
  });

  it("handles initial data with missing nested fields", () => {
    const incompleteData: Event = {
      ...initialData,
      inventory: undefined as any,
      pricing: undefined as any,
    };
    render(<EventForm {...defaultProps} initialData={incompleteData} />);

    // Check if defaults are applied (0 values)
    const numberInputs = screen.getAllByRole("spinbutton");
    // Standard Pricing (index 1) should be 0
    expect(numberInputs[1]).toHaveValue(0);
    // Standard Inventory (index 2) should be 0
    expect(numberInputs[2]).toHaveValue(0);
  });

  it("cancels form", () => {
    render(<EventForm {...defaultProps} />);
    const cancelBtn = screen.getByText("Cancelar");
    fireEvent.click(cancelBtn);
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
