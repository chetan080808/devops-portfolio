import { MathUtils, Plane, Raycaster, Vector2, Vector3, type Camera, type PerspectiveCamera } from "three";

const ndc = new Vector2();
const ray = new Raycaster();
const plane = new Plane(new Vector3(0, 0, 1), 0);
const tmp = new Vector3();

/** World point → canvas px (x right, y down). */
export function toCanvasPx(world: Vector3, camera: Camera, w: number, h: number, out = new Vector2()) {
  tmp.copy(world).project(camera);
  return out.set(((tmp.x + 1) / 2) * w, ((1 - tmp.y) / 2) * h);
}

/** Canvas px → world point on the vertical plane z = `z` (facing the camera). */
export function fromCanvasPx(px: number, py: number, z: number, camera: Camera, w: number, h: number, out = new Vector3()) {
  ndc.set((px / w) * 2 - 1, 1 - (py / h) * 2);
  ray.setFromCamera(ndc, camera);
  plane.constant = -z;
  return ray.ray.intersectPlane(plane, out) ?? out.set(0, 0, z);
}

/** World size of one px of the composed frame at `distance` from the camera. */
export function worldPerPixel(camera: PerspectiveCamera, distance: number, canvasH: number) {
  const frameH = camera.view?.enabled ? camera.view.fullHeight : canvasH;
  return (2 * distance * Math.tan(MathUtils.degToRad(camera.fov) / 2)) / frameH;
}
