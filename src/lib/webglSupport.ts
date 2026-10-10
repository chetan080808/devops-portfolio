/**
 * Software-rendered WebGL (SwiftShader / llvmpipe / Microsoft Basic Render Driver: no GPU,
 * blocklisted drivers, VMs). Shader compiles alone take seconds there and every frame burns the
 * CPU, so the hero keeps its static fallback instead. Checked on the scene's own context (a
 * separate probe context would cost another ~250 ms of main thread on Windows/D3D).
 * Plain module (no three import).
 */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render driver/i;

export function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
  return SOFTWARE_RENDERER.test(renderer);
}
