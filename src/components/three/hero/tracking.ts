import { Vector3 } from "three";

/** The whale's current world position, written by Whale each frame and read by CameraRig. */
export const whaleTrack = new Vector3();

/**
 * The whale's on-screen box (canvas px), written by the swim controller each frame. The hero mask
 * keeps this area visible wherever the whale goes (e.g. down over the Deployments cards in 4a).
 */
export const whaleScreen = { x0: 0, y0: 0, x1: 0, y1: 0, on: false };
