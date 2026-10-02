import { redirect } from "next/navigation";

/**
 * Tanker Arrivals have been relocated to the Worker terminal.
 * Workers enter tanker delivery data; the Owner monitors via Inventory & Tanks.
 */
export default function AdminTankerArrivalsRedirectPage() {
  redirect("/admin/inventory");
}