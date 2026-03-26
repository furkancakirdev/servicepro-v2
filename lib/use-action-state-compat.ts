"use client";

import { useFormState } from "react-dom";

type ServerAction<State, Payload> = (
  state: Awaited<State>,
  payload: Payload
) => State | Promise<State>;

// Next 14 on React 18 does not expose React.useActionState at runtime yet.
// Keep component call sites on the action-state abstraction so the eventual
// framework upgrade is a single-file change.
export function useActionStateCompat<State, Payload>(
  action: ServerAction<State, Payload>,
  initialState: Awaited<State>,
  permalink?: string
) {
  const [state, dispatch] = useFormState(action, initialState, permalink);
  return [state, dispatch, false] as const;
}
