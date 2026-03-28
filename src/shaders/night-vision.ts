/** Night Vision (NVG) post-processing shader — green phosphor image intensification */
export const NVG_FRAGMENT_SHADER = `
  uniform sampler2D colorTexture;
  uniform float time;
  uniform vec2 resolution;
  in vec2 v_textureCoordinates;

  // Pseudo-random noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = v_textureCoordinates;
    vec4 color = texture(colorTexture, uv);

    // Convert to luminance
    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Amplify brightness (image intensification)
    luma = pow(luma, 0.8) * 1.8;
    luma = clamp(luma, 0.0, 1.0);

    // Film grain noise
    float noise = hash(uv * resolution + time * 100.0);
    float grain = (noise - 0.5) * 0.12;
    luma += grain;

    // Green phosphor color palette
    // Real NVG has slight variation: bright areas more yellow-green, dark areas deeper green
    vec3 nvgColor;
    nvgColor.r = luma * 0.08;
    nvgColor.g = luma * 0.95;
    nvgColor.b = luma * 0.12;

    // Vignette — circular darkening at edges (simulates tube optics)
    vec2 centered = uv * 2.0 - 1.0;
    float vignette = 1.0 - dot(centered, centered) * 0.6;
    vignette = clamp(vignette, 0.0, 1.0);
    nvgColor *= vignette;

    // Subtle scanline artifact
    float scanline = sin(uv.y * resolution.y * 0.8) * 0.03 + 1.0;
    nvgColor *= scanline;

    out_FragColor = vec4(nvgColor, 1.0);
  }
`;
