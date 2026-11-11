import { Check } from "lucide-react";

// Checkmarks in a pricing table are exempt from the checkmark-list tell.
export function Pricing() {
  return (
    <table>
      <tbody>
        <tr><td>Bank feeds</td><td><Check strokeWidth={1.5} /></td><td><Check strokeWidth={1.5} /></td></tr>
        <tr><td>Audit trail</td><td></td><td><Check strokeWidth={1.5} /></td></tr>
        <tr><td>SSO</td><td></td><td><Check strokeWidth={1.5} /></td></tr>
      </tbody>
    </table>
  );
}
