/** Bloom post-processing shader — glowing highlights */
export const BLOOM_BRIGHT_EXTRACT_SHADER = `
  uniform sampler2D colorTexture;
  uniform float threshold;
  in vec2 v_textureCoordinates;

  void main() {
    vec4 color = texture(colorTexture, v_textureCoordinates);
    float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    if (brightness > threshold) {
      out_FragColor = color;
    } else {
      out_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
  }
`;

export const BLOOM_BLUR_SHADER = `
  uniform sampler2D colorTexture;
  uniform vec2 resolution;
  uniform vec2 direction;
  in vec2 v_textureCoordinates;

  void main() {
    vec2 texelSize = 1.0 / resolution;
    vec2 dir = direction * texelSize;

    // 9-tap Gaussian blur
    vec4 result = vec4(0.0);
    result += texture(colorTexture, v_textureCoordinates - 4.0 * dir) * 0.0162;
    result += texture(colorTexture, v_textureCoordinates - 3.0 * dir) * 0.0540;
    result += texture(colorTexture, v_textureCoordinates - 2.0 * dir) * 0.1216;
    result += texture(colorTexture, v_textureCoordinates - 1.0 * dir) * 0.1945;
    result += texture(colorTexture, v_textureCoordinates               ) * 0.2270;
    result += texture(colorTexture, v_textureCoordinates + 1.0 * dir) * 0.1945;
    result += texture(colorTexture, v_textureCoordinates + 2.0 * dir) * 0.1216;
    result += texture(colorTexture, v_textureCoordinates + 3.0 * dir) * 0.0540;
    result += texture(colorTexture, v_textureCoordinates + 4.0 * dir) * 0.0162;

    out_FragColor = result;
  }
`;

export const BLOOM_COMPOSITE_SHADER = `
  uniform sampler2D colorTexture;
  uniform sampler2D bloomTexture;
  uniform float strength;
  in vec2 v_textureCoordinates;

  void main() {
    vec4 original = texture(colorTexture, v_textureCoordinates);
    vec4 bloom = texture(bloomTexture, v_textureCoordinates);
    out_FragColor = original + bloom * strength;
  }
`;
