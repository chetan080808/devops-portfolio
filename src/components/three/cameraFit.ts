/**
 * Hero framing constants, shared by the camera (CameraRig) and the DOM still that stands in for
 * the scene before it loads (HeroStage). Plain module: no three import.
 */

/** Horizontal FOV the desktop frame always gets, with the vertical FOV clamped to this range. */
export const CAMERA_FIT = { hfov: 46, minVfov: 33, maxVfov: 50 };

/** The desktop frame = the right-column stage plus this bleed per side (share of its size). */
export const FRAME_BLEED = { x: 0.09, y: 0.07 };

const tanHalf = (deg: number) => Math.tan((deg * Math.PI) / 360);

/**
 * Width of the desktop still (rendered at the fixed horizontal FOV) relative to the frame, as
 * multiples of the frame's width and height: across the unclamped range it fills the frame's
 * width; where the vertical FOV clamps, its size follows the frame's height instead.
 * width = clamp(minH * frameH, frameW, maxH * frameH)
 */
export const STILL_FIT = {
  minH: tanHalf(CAMERA_FIT.hfov) / tanHalf(CAMERA_FIT.maxVfov),
  maxH: tanHalf(CAMERA_FIT.hfov) / tanHalf(CAMERA_FIT.minVfov),
};
