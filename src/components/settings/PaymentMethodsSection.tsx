import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
}

interface PaymentMethodsProps {
  paymentMethods: PaymentMethod[];
  onPaymentMethodToggle: (id: string, enabled: boolean) => void;
}

export function PaymentMethodsSection({
  paymentMethods,
  onPaymentMethodToggle,
}: PaymentMethodsProps) {
  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Payment Methods</h2>
      <div className="space-y-3">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className="flex items-center justify-between p-3 rounded-md border"
          >
            <span className="font-medium">{method.name}</span>
            <Switch
              checked={method.enabled}
              onCheckedChange={(checked) =>
                onPaymentMethodToggle(method.id, checked)
              }
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
