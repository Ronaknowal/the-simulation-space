/** Sharpening post-processing shader — unsharp mask convolution */
export const SHARPEN_FRAGMENT_SHADER = `
  uniform sampler2D colorTexture;
  uniform vec2 resolution;
  uniform float strength;
  in vec2 v_textureCoordinates;

  void main() {
    vec2 texelSize = 1.0 / resolution;

    vec4 center = texture(colorTexture, v_textureCoordinates);

    // 4-tap neighbor sampling
    vec4 top    = texture(colorTexture, v_textureCoordinates + vec2( 0.0, -1.0) * texelSize);
    vec4 bottom = texture(colorTexture, v_textureCoordinates + vec2( 0.0,  1.0) * texelSize);
    vec4 left   = texture(colorTexture, v_textureCoordinates + vec2(-1.0,  0.0) * texelSize);
    vec4 right  = texture(colorTexture, v_textureCoordinates + vec2( 1.0,  0.0) * texelSize);

    // Unsharp mask: center + strength * (center - average_neighbors)
    vec4 avg = (top + bottom + left + right) * 0.25;
    vec4 sharpened = center + (center - avg) * strength;

    out_FragColor = clamp(sharpened, 0.0, 1.0);
  }
`;
