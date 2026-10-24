// Shows a change the assistant proposed. Nothing changes until the user clicks Approve.

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export interface PendingAction {
  id: string;
  org_id: string;
  setting: string;
  old_value: number;
  new_value: number;
  status: "pending" | "approved" | "rejected" | "failed";
  error: string | null;
}

export function ApprovalCard({ action: initial, orgName }: { action: PendingAction; orgName: string }) {
  const [action, setAction] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      setAction(await apiFetch<PendingAction>(`/api/assistant/actions/${action.id}/${decision}`, { method: "POST" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-sm">
      <p className="font-semibold text-slate-900">Approval needed</p>
      <p className="mt-1 text-slate-700">
        Change <strong>{action.setting}</strong> for <strong>{orgName}</strong> from <strong>{action.old_value}</strong> to{" "}
        <strong>{action.new_value}</strong>.
      </p>

      {action.status === "pending" ? (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => decide("approve")}
            disabled={busy}
            className="rounded-md bg-slate-900 px-4 py-1.5 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => decide("reject")}
            disabled={busy}
            className="rounded-md border border-slate-300 bg-white px-4 py-1.5 font-medium hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <p role="status" className="mt-3 font-medium text-slate-900">
          {action.status === "approved" && `Approved. The threshold is now ${action.new_value}.`}
          {action.status === "rejected" && "Cancelled. Nothing was changed."}
          {action.status === "failed" && `The change failed: ${action.error}`}
        </p>
      )}
      {error && <p className="mt-2 text-red-700">{error}</p>}
    </div>
  );
}
