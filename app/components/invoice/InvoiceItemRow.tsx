// components/invoice/InvoiceItemRow.tsx
import { Trash2, Edit } from "lucide-react";
import { Button } from "../ui/button";

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

interface InvoiceItemRowProps {
  item: InvoiceItem;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}

export const InvoiceItemRow = ({ item, onEdit, onRemove }: InvoiceItemRowProps) => {
  return (
    <div className="grid grid-cols-12 gap-3 items-center mb-3 p-3 border rounded-md hover:bg-accent/5 transition-colors">
      <div className="col-span-5">
        <div className="font-medium truncate" title={item.description}>
          {item.description || "No description"}
        </div>
      </div>

      <div className="col-span-1">
        <div className="text-muted-foreground text-center">{item.quantity}</div>
      </div>

      <div className="col-span-2">
        <div className="text-muted-foreground text-right">
          ₦{item.unitPrice.toLocaleString()}
        </div>
      </div>

      <div className="col-span-2">
        <div className="font-semibold text-right">
          ₦{item.total.toLocaleString()}
        </div>
      </div>

      <div className="col-span-2 flex justify-end space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(item.id)}
          className="h-8 w-8 hover:bg-primary/10"
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};