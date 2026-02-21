import servicesSeed from "../../../data/services.json";
import { clone } from "./helpers";
import type { ServicesResponse } from "./types";

export async function fetchServices(): Promise<ServicesResponse> {
  return clone(servicesSeed as ServicesResponse);
}
