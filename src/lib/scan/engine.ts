import type { CameraSelection } from '../camera'

/** What a running scan engine exposes: only the ability to stop it. */
export interface ScanEngine {
  stop(): Promise<void>
}

/** Which implementation produced a set of measurements. */
export type EngineName = 'wasm' | 'legacy'

/** Geometry the engine settled on once the camera was running. */
export interface EngineReadyInfo {
  width: number
  height: number
  /** Side of the square actually decoded, or null when the engine does not choose one. */
  roiSize: number | null
}

export interface EngineCallbacks {
  /** A capture that decoded to something. */
  onText(text: string): void
  /**
   * Every capture that was decoded, whatever the outcome. `decodeMs` is the measured cost, or null
   * for an engine that cannot time its own decode.
   */
  onAttempt(outcome: 'decoded' | 'empty', decodeMs: number | null): void
  onReady(info: EngineReadyInfo): void
}

export interface EngineOptions extends EngineCallbacks {
  container: HTMLElement
  camera: CameraSelection
}

export type StartEngine = (options: EngineOptions) => Promise<ScanEngine>
