"use client";

/**
 * CollapsibleColumnBody — wraps a kanban column's card list with optional
 * collapse for older items.
 *
 * Use case: the Published column accumulates indefinitely. After 7 weeks
 * the kanban becomes unscrollable. This component renders only the
 * `visibleChildren` by default; if `hiddenChildren` is non-empty, a
 * "+ Show N older" button reveals them.
 *
 * Server-side responsibility: the parent (Kanban) splits items by age and
 * passes the two slices. This component is intentionally dumb about WHICH
 * column or WHICH cutoff — just renders what it's given + the expand state.
 *
 * Kept as a separate file so Kanban itself can stay a server component.
 */

import { useState, type ReactNode } from "react";

export function CollapsibleColumnBody({
  visibleChildren,
  hiddenChildren,
  hiddenLabel,
}: {
  visibleChildren: ReactNode;
  hiddenChildren: ReactNode;
  hiddenLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const nothingHidden = !hiddenChildren || (Array.isArray(hiddenChildren) && hiddenChildren.length === 0);

  return (
    <>
      {visibleChildren}
      {!nothingHidden && (
        <>
          {expanded && hiddenChildren}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full px-3 py-2 my-2 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 rounded transition-colors"
          >
            {expanded ? "Hide older" : `+ Show ${hiddenLabel}`}
          </button>
        </>
      )}
    </>
  );
}
