import { useEffect, useState } from "react";
import { Download, Search, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "../ui/button";
import { ticketService } from "../../services/firestore";
import { db, functions } from "../../firebaseConfig";
import type { Ticket } from "../../types";

interface AttendeeListProps {
  eventId: string;
  eventName: string;
  onClose: () => void;
}

export default function AttendeeList({
  eventId,
  eventName,
  onClose,
}: AttendeeListProps) {
  const [attendees, setAttendees] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const fetchAttendees = async () => {
    try {
      const data = await ticketService.getTicketsByEvent(eventId);
      setAttendees(data);
    } catch (error) {
      console.error("Erro ao buscar participantes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, [eventId]);

  const filteredAttendees = attendees.filter((a) =>
    a.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefund = async (ticket: Ticket) => {
    if (!ticket.purchaseId) {
      toast.error("Compra não encontrada para este ingresso.");
      return;
    }

    if (!window.confirm(`Reembolsar o ingresso de ${ticket.userEmail}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setRefundingId(ticket.id);
    try {
      const purchaseSnap = await getDoc(doc(db, "purchases", ticket.purchaseId));
      if (!purchaseSnap.exists()) {
        toast.error("Compra não encontrada no banco de dados.");
        return;
      }

      const purchaseData = purchaseSnap.data() as { paymentId?: string };
      if (!purchaseData.paymentId) {
        toast.error("ID de pagamento não encontrado.");
        return;
      }

      const refundPayment = httpsCallable(functions, "refundPayment");
      await refundPayment({ paymentId: purchaseData.paymentId });

      toast.success(`Reembolso processado para ${ticket.userEmail}`);
      await fetchAttendees();
    } catch (error) {
      console.error("Erro ao reembolsar:", error);
      toast.error("Erro ao processar reembolso. Verifique suas permissões.");
    } finally {
      setRefundingId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ["E-mail", "Tipo", "Preço", "Data da Compra", "Status"];
    const rows = attendees.map((a) => [
      a.userEmail,
      a.ticketType,
      a.price.toFixed(2),
      a.purchaseDate?.toDate().toLocaleDateString("pt-BR") || "",
      a.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `participantes_${eventName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "valid": return "Válido";
      case "used": return "Usado";
      case "cancelled": return "Reembolsado";
      default: return status;
    }
  };

  const statusStyle = (status: string) => {
    switch (status) {
      case "valid": return "bg-green-500/10 text-green-500";
      case "used": return "bg-blue-500/10 text-blue-500";
      case "cancelled": return "bg-red-500/10 text-red-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-muted/50">
          <div>
            <h2 className="text-xl font-bold">Participantes: {eventName}</h2>
            <p className="text-sm text-muted-foreground">
              {attendees.length} ingressos vendidos
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 border-b flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por e-mail..."
              className="w-full bg-background border rounded-lg py-2 pl-10 pr-4 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={exportToCSV}
            disabled={attendees.length === 0}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <p className="text-center py-8">Carregando participantes...</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground font-medium sticky top-0">
                <tr>
                  <th className="p-3">Participante (E-mail)</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Preço</th>
                  <th className="p-3">Comprado em</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAttendees.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30 group">
                    <td className="p-3 font-medium">{a.userEmail}</td>
                    <td className="p-3 capitalize">{a.ticketType}</td>
                    <td className="p-3 font-mono">R$ {a.price.toFixed(2)}</td>
                    <td className="p-3">
                      {a.purchaseDate?.toDate().toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusStyle(a.status)}`}
                      >
                        {statusLabel(a.status)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {a.status === "valid" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRefund(a)}
                          disabled={refundingId === a.id}
                        >
                          <RotateCcw className={`h-3 w-3 mr-1 ${refundingId === a.id ? "animate-spin" : ""}`} />
                          {refundingId === a.id ? "Processando..." : "Reembolsar"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredAttendees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Nenhum participante encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
