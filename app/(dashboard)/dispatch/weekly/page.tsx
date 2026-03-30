import { format, isValid, parseISO, startOfDay } from "date-fns";
import { redirect } from "next/navigation";

type WeeklyDispatchPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function takeFirstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDispatchDate(input?: string) {
  if (!input) {
    return startOfDay(new Date());
  }

  const parsed = parseISO(input);
  return isValid(parsed) ? startOfDay(parsed) : startOfDay(new Date());
}

export default function WeeklyDispatchPage({ searchParams }: WeeklyDispatchPageProps) {
  const date = parseDispatchDate(takeFirstValue(searchParams?.date));
  redirect(`/dispatch?date=${format(date, "yyyy-MM-dd")}&view=weekly`);
}
