import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventForm } from "./EventForm";
import type { Event } from "@/types";
import { storageService } from "@/services/storage";

// Mock storageService
vi.mock("../../services/storage", () => ({
  storageService: {
    uploadEventImage: vi.fn().mockResolvedValue("https://example.com/image.jpg"),
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
    date: "2027-12-31",
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

  it("renders correctly with empty form for new event", () => {
    render(<EventForm {...defaultProps} />);
    
    expect(screen.getByLabelText(/Título/i)).toHaveValue("");
    expect(screen.getByText("Criar Evento")).toBeInTheDocument();
  });

  it("renders correctly with initial data for editing", () => {
    render(<EventForm {...defaultProps} initialData={initialData} />);
    
    expect(screen.getByLabelText(/Título/i)).toHaveValue("Existing Event");
    expect(screen.getByLabelText(/Preço Base/i)).toHaveValue(100);
    
    // Check nested fields
    // We need to usegetAllByRole or similar because there are multiple inputs with type number
    // But specific labels might be tricky with the current structure.
    // The current structure has labels "Tipo", "Preço (R$)", "Estoque" headers, and then rows.
    // Let's rely on values being present in inputs.
    
    const inputs = screen.getAllByRole("spinbutton"); // type="number"
    // We expect multiple inputs. Let's filter by value if needed, or check specific ones.
    
    // Check if standard inventory (100) is present
    expect(screen.getAllByDisplayValue("100").length).toBeGreaterThan(0);
    // Check if vip pricing (200) is present
    expect(screen.getAllByDisplayValue("200").length).toBeGreaterThan(0);
  });

  it("updates nested inventory and pricing correctly", () => {
    render(<EventForm {...defaultProps} />);
    
    // Find inputs for standard pricing/inventory.
    // Since we don't have unique labels for each row's inputs easily accessible by label text,
    // we can traverse the DOM or add test-ids. 
    // However, we can try to find them by their initial value (0) and change them.
    
    // Actually, let's use the container to find inputs within specific rows if possible,
    // or just assume order (standard, vip, premium).
    
    // Easier way: The component maps ["standard", "vip", "premium"].
    // First row: standard.
    // Inputs in order: pricing input, inventory input.
    
    const numberInputs = screen.getAllByRole("spinbutton");
    // Index 0: Base Price
    // Index 1-3 (Pricing): standard, vip, premium (Wait, let's check the render order)
    
    // Form structure:
    // Base Price input
    // ...
    // Map loop:
    // standard: pricing input, inventory input
    // vip: pricing input, inventory input
    // premium: pricing input, inventory input
    // ...
    // Max Tickets input
    // Available Tickets input
    
    // Total number inputs: 1 (base) + 3*2 (nested) + 2 (total stock) + 1 (maxPerPurchase) = 10 inputs.

    // Let's verify this count
    expect(numberInputs).toHaveLength(10);
    
    const standardPricingInput = numberInputs[1];
    const standardInventoryInput = numberInputs[2];
    
    fireEvent.change(standardPricingInput, { target: { value: "150" } });
    fireEvent.change(standardInventoryInput, { target: { value: "500" } });
    
    expect(standardPricingInput).toHaveValue(150);
    expect(standardInventoryInput).toHaveValue(500);
  });

  it("submits form with correct data including cleaned pricing", async () => {
    render(<EventForm {...defaultProps} />);
    
    // Fill basic fields
    fireEvent.change(screen.getByLabelText(/Título/i), { target: { value: "New Event" } });
    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: "Desc" } });
    fireEvent.change(screen.getByLabelText(/Data/i), { target: { value: "2027-01-01" } });
    fireEvent.change(screen.getByLabelText(/Hora/i), { target: { value: "20:00" } });
    fireEvent.change(screen.getByLabelText(/Nome do Local/i), { target: { value: "Venue" } });
    fireEvent.change(screen.getByLabelText(/Endereço Completo/i), { target: { value: "Addr" } });
    fireEvent.change(screen.getByLabelText(/Preço Base/i), { target: { value: "50" } });
    
    // Fill nested fields
    const numberInputs = screen.getAllByRole("spinbutton");
    // Standard Pricing (index 1) -> 60
    fireEvent.change(numberInputs[1], { target: { value: "60" } });
    // Standard Inventory (index 2) -> 100
    fireEvent.change(numberInputs[2], { target: { value: "100" } });
    
    // Leave VIP and Premium as 0 to test cleanup
    
    // Max Tickets (index 7) -> auto update logic might change this, but let's set it manually just in case
    // The component updates max/available tickets if total nested inventory > 0 on submit
    
    const submitBtn = screen.getByText("Criar Evento");
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
    
    const savedData = mockOnSave.mock.calls[0][0];
    
    expect(savedData.title).toBe("New Event");
    
    // Check pricing cleanup: only standard should be present
    expect(savedData.pricing).toEqual({ standard: 60 });
    
    // Check inventory sync: standard should be 100
    expect(savedData.inventory.standard).toBe(100);
    
    // Check automatic total inventory update
    // Logic: if totalInventory > 0, set availableTickets and maxTickets (if max < total)
    expect(savedData.availableTickets).toBe(100);
    expect(savedData.maxTickets).toBeGreaterThan(0); // Should be at least 100 or default 100 depending on logic
  });

  it("na edicao nao recalcula estoque ao alterar apenas o titulo", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EventForm
        {...defaultProps}
        onSave={onSave}
        initialData={{ ...initialData, availableTickets: 120 }}
      />
    );

    fireEvent.change(screen.getByLabelText(/Título/i), {
      target: { value: "Updated title" },
    });
    fireEvent.click(screen.getByText("Atualizar Evento"));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      title: "Updated title",
      availableTickets: 120,
      inventory: initialData.inventory,
    });
  });
});
