export type MonthlyEvaluationActionState = {
  success: boolean;
  error: string | null;
  updatedCount: number;
};

export const initialMonthlyEvaluationActionState: MonthlyEvaluationActionState = {
  success: false,
  error: null,
  updatedCount: 0,
};
