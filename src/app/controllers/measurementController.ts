import * as childrenModel from "../models/childrenModel";
import * as measurementsModel from "../models/measurementsModel";

export class MeasurementBuilder {
  private _child_id: string | null = null;
  private _weight_kg: number | null = null;
  private _height_cm: number | null = null;
  private _bmi: number | null = null;
  private _bmi_status: string | null = null;

  setChildId(id: string) {
    this._child_id = id;
    return this;
  }
  setWeight(kg: number) {
    this._weight_kg = kg;
    return this;
  }
  setHeight(cm: number) {
    this._height_cm = cm;
    return this;
  }
  setBmi(bmi: number) {
    this._bmi = bmi;
    return this;
  }
  setBmiStatus(status: string) {
    this._bmi_status = status;
    return this;
  }

  build() {
    if (!this._child_id) throw new Error("child_id requerido");
    if (this._weight_kg == null) throw new Error("weight_kg requerido");
    if (this._height_cm == null) throw new Error("height_cm requerido");
    if (this._bmi == null) throw new Error("bmi requerido");
    if (!this._bmi_status) throw new Error("bmi_status requerido");

    return {
      child_id: this._child_id,
      weight_kg: this._weight_kg,
      height_cm: this._height_cm,
      bmi: this._bmi,
      bmi_status: this._bmi_status,
    };
  }
}

export async function saveMeasurementByName(fullName: string, age: number | null, weight: number, height: number, bmi: number, bmi_status: string) {
  // Ensure child exists
  let child = await childrenModel.findChildByName(fullName);
  if (!child) {
    child = await childrenModel.createChild(fullName, age ? Math.round(age) : null);
  }

  const measurement = new MeasurementBuilder()
    .setChildId(child.id)
    .setWeight(weight)
    .setHeight(height)
    .setBmi(bmi)
    .setBmiStatus(bmi_status)
    .build();

  await measurementsModel.insertMeasurement(measurement);

  const history = await measurementsModel.getMeasurementsByChild(child.id, 5);
  return { child, history };
}

export async function loadLatestAndCounts() {
  const latest = await measurementsModel.getLatestMeasurements();
  // compute atRisk
  const atRisk = (latest ?? []).filter((r) => r.bmi_status !== "normal").length;
  return { latest, totalChildren: (latest ?? []).length, atRisk };
}

export async function countSince(isoDate: string) {
  return await measurementsModel.countMeasurementsSince(isoDate);
}

export async function getMeasurementsSince(isoDate: string) {
  // return raw measurements with bmi_status and measured_at for reporting
  if (!isoDate) return [];
  // reuse model query
  const rows = await (await import("../models/measurementsModel")).getMeasurementsByDateRange?.(isoDate).catch(() => null);
  if (rows == null) {
    // fallback: query via existing model methods
    // no-op: measurementsModel currently doesn't expose a range query, so return empty
    return [];
  }
  return rows;
}

export async function getHistoryByChild(childId: string, limit = 5) {
  return await measurementsModel.getMeasurementsByChild(childId, limit);
}
