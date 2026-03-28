/** CRT Scanline post-processing shader — simulates cathode-ray tube monitor */
export const CRT_FRAGMENT_SHADER = `
  uniform sampler2D colorTexture;
  uniform float time;
  uniform vec2 resolution;
  in vec2 v_textureCoordinates;

  void main() {
    vec2 uv = v_textureCoordinates;

    // Slight barrel distortion (CRT curvature)
    vec2 centered = uv * 2.0 - 1.0;
    float r2 = dot(centered, centered);
    vec2 distorted = uv + centered * r2 * 0.02;

    // Chromatic aberration — slight RGB channel offset
    float aberration = 0.001;
    float r = texture(colorTexture, distorted + vec2(aberration, 0.0)).r;
    float g = texture(colorTexture, distorted).g;
    float b = texture(colorTexture, distorted - vec2(aberration, 0.0)).b;
    vec3 color = vec3(r, g, b);

    // Horizontal scanlines
    float scanline = sin(uv.y * resolution.y * 1.5) * 0.04 + 1.0;
    color *= scanline;

    // Subtle vertical line pattern (RGB sub-pixel simulation)
    float subpixel = sin(uv.x * resolution.x * 3.0) * 0.02 + 1.0;
    color *= subpixel;

    // Vignette — darken edges
    float vignette = smoothstep(0.85, 0.35, length(centered));
    color *= vignette;

    // Slight green/blue tint (classic terminal feel)
    color *= vec3(0.92, 1.0, 0.95);

    // Flicker (very subtle)
    float flicker = 1.0 - sin(time * 8.0) * 0.005;
    color *= flicker;

    out_FragColor = vec4(color, 1.0);
  }
`;
