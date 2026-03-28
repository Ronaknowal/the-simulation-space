/** Anime / Cel-Shading post-processing shader — Studio Ghibli-style toon rendering */
export const ANIME_CEL_FRAGMENT_SHADER = `
  uniform sampler2D colorTexture;
  uniform vec2 resolution;
  in vec2 v_textureCoordinates;

  void main() {
    vec2 uv = v_textureCoordinates;
    vec2 texelSize = 1.0 / resolution;

    vec4 color = texture(colorTexture, uv);

    // ── Color Quantization (Posterize) ──
    // Reduce to N discrete color levels for cel-shaded look
    float levels = 6.0;
    vec3 posterized = floor(color.rgb * levels + 0.5) / levels;

    // Warm up the palette slightly (Ghibli films have warm tones)
    posterized *= vec3(1.05, 1.0, 0.95);

    // Increase saturation slightly
    float luma = dot(posterized, vec3(0.299, 0.587, 0.114));
    posterized = mix(vec3(luma), posterized, 1.3);

    // ── Edge Detection (Sobel) ──
    // Sample 3x3 neighborhood for Sobel operator
    float tl = dot(texture(colorTexture, uv + vec2(-1.0, -1.0) * texelSize).rgb, vec3(0.299, 0.587, 0.114));
    float tc = dot(texture(colorTexture, uv + vec2( 0.0, -1.0) * texelSize).rgb, vec3(0.299, 0.587, 0.114));
    float tr = dot(texture(colorTexture, uv + vec2( 1.0, -1.0) * texelSize).rgb, vec3(0.299, 0.587, 0.114));
    float ml = dot(texture(colorTexture, uv + vec2(-1.0,  0.0) * texelSize).rgb, vec3(0.299, 0.587, 0.114));
    float mr = dot(texture(colorTexture, uv + vec2( 1.0,  0.0) * texelSize).rgb, vec3(0.299, 0.587, 0.114));
    float bl = dot(texture(colorTexture, uv + vec2(-1.0,  1.0) * texelSize).rgb, vec3(0.299, 0.587, 0.114));
    float bc = dot(texture(colorTexture, uv + vec2( 0.0,  1.0) * texelSize).rgb, vec3(0.299, 0.587, 0.114));
    float br = dot(texture(colorTexture, uv + vec2( 1.0,  1.0) * texelSize).rgb, vec3(0.299, 0.587, 0.114));

    // Sobel kernels
    float gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
    float gy = -tl - 2.0*tc - tr + bl + 2.0*bc + br;
    float edge = sqrt(gx*gx + gy*gy);

    // Threshold edge detection
    float edgeStrength = smoothstep(0.05, 0.15, edge);

    // Dark outline color
    vec3 outlineColor = vec3(0.08, 0.06, 0.1);

    // Blend posterized color with edge outline
    vec3 final = mix(posterized, outlineColor, edgeStrength * 0.9);

    out_FragColor = vec4(final, 1.0);
  }
`;
