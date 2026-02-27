import { redirect } from "next/navigation";
import { ROUTES } from "@/shared/config";

export default function GoalsPage() {
  redirect(ROUTES.planning);
}
