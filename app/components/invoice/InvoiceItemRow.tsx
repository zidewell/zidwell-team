import { Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

// Use the same InvoiceItem type as main component
type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

interface InvoiceItemRowProps {
  item: InvoiceItem;
  onUpdate: (id: string, field: keyof InvoiceItem, value: string | number) => void;
  onRemove: (id: string) => void;
}

export const InvoiceItemRow = ({ item, onUpdate, onRemove }: InvoiceItemRowProps) => {
  return (
    <div className="grid grid-cols-12 gap-3 items-center mb-3">
      <div className="col-span-5">
        <Input
          placeholder="Item/Service name"
          value={item.description}
          onChange={(e) => onUpdate(item.id, "description", e.target.value)}
          className="border-border bg-background"
        />
      </div>

      <div className="col-span-2">
        <Input
          type="number"
          placeholder="Qty"
          value={item.quantity}
          onChange={(e) => {
            const value = e.target.value;
            onUpdate(item.id, "quantity", value === "" ? "" : parseFloat(value));
          }}
          className="border-border bg-background"
          min="0"
        />
      </div>

      <div className="col-span-2">
        <Input
          type="number"
          placeholder="Price"
          value={item.unitPrice}
          onChange={(e) => {
            const value = e.target.value;
            onUpdate(item.id, "unitPrice", value === "" ? "" : parseFloat(value));
          }}
          className="border-border bg-background"
          min="0"
        />
      </div>

      <div className="col-span-2">
        <Input
          type="text"
          value={`₦${item.total.toLocaleString()}`}
          disabled
          className="border-border bg-muted text-foreground"
        />
      </div>

      <div className="col-span-1 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(item.id)}
          className="hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
