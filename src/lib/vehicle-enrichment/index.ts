// Public entry for the vehicle enrichment module. Call sites import
// from "@/lib/vehicle-enrichment" — never from the concrete clients.

export { decodeVin, getRecallsForVin } from "./vpic";
export { getSpecsByVin, getImagesByVin, getCarsXEMode } from "./carsxe";

export type {
  CarsXEImage,
  CarsXESpecs,
  ComparableInput,
  VehicleComparable,
  VehicleRecall,
  VinDecodeResult,
} from "./types";
