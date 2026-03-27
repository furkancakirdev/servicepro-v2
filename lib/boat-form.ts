import type { JobFormBoatOption } from "@/lib/jobs";

export type CreateBoatFieldName = "name" | "type";

export type CreateBoatFormState = {
  error: string | null;
  fieldErrors: Partial<Record<CreateBoatFieldName, string>>;
  createdBoat: JobFormBoatOption | null;
};

export const initialCreateBoatFormState: CreateBoatFormState = {
  error: null,
  fieldErrors: {},
  createdBoat: null,
};
