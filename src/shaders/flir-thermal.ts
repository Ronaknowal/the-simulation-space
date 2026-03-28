/** FLIR Thermal Imaging post-processing shader — false-color infrared with targeting reticle */
export const FLIR_FRAGMENT_SHADER = `
  uniform sampler2D colorTexture;
  uniform float time;
  uniform vec2 resolution;
  in vec2 v_textureCoordinates;

  // Iron/Black Body thermal color palette
  vec3 thermalPalette(float t) {
    // Black → Dark Blue → Purple → Red → Orange → Yellow → White
    t = clamp(t, 0.0, 1.0);

    vec3 c;
    if (t < 0.15) {
      c = mix(vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.4), t / 0.15);
    } else if (t < 0.3) {
      c = mix(vec3(0.0, 0.0, 0.4), vec3(0.5, 0.0, 0.5), (t - 0.15) / 0.15);
    } else if (t < 0.5) {
      c = mix(vec3(0.5, 0.0, 0.5), vec3(1.0, 0.0, 0.0), (t - 0.3) / 0.2);
    } else if (t < 0.7) {
      c = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 0.5, 0.0), (t - 0.5) / 0.2);
    } else if (t < 0.85) {
      c = mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 1.0, 0.0), (t - 0.7) / 0.15);
    } else {
      c = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), (t - 0.85) / 0.15);
    }
    return c;
  }

  void main() {
    vec2 uv = v_textureCoordinates;
    vec4 color = texture(colorTexture, uv);

    // Convert to thermal value (luminance-based approximation)
    float thermal = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Invert for "white hot" mode (hot = bright)
    // thermal = 1.0 - thermal; // Uncomment for "black hot" mode

    // Apply slight contrast enhancement
    thermal = smoothstep(0.05, 0.95, thermal);

    // Map through thermal palette
    vec3 thermalColor = thermalPalette(thermal);

    // ── Targeting Reticle ──
    vec2 center = vec2(0.5, 0.5);
    vec2 diff = uv - center;
    float dist = length(diff * vec2(resolution.x / resolution.y, 1.0));

    // Cross hairs
    float reticle = 0.0;
    float lineWidth = 1.0 / resolution.y;
    float gap = 0.03;

    // Horizontal line (with gap in center)
    if (abs(diff.y) < lineWidth && abs(diff.x) > gap && abs(diff.x) < 0.15) {
      reticle = 1.0;
    }
    // Vertical line (with gap in center)
    if (abs(diff.x) < lineWidth && abs(diff.y) > gap && abs(diff.y) < 0.15) {
      reticle = 1.0;
    }

    // Center circle
    float circleRadius = 0.025;
    float circleDist = abs(dist - circleRadius);
    if (circleDist < lineWidth * 1.5) {
      reticle = 1.0;
    }

    // Corner brackets
    float bracketSize = 0.08;
    float bracketThickness = lineWidth * 1.5;
    vec2 absD = abs(diff);
    if (absD.x > bracketSize - 0.02 && absD.x < bracketSize &&
        absD.y < bracketSize && absD.y > bracketSize - 0.02) {
      reticle = 1.0;
    }
    if (absD.y > bracketSize - 0.02 && absD.y < bracketSize &&
        absD.x < bracketSize && absD.x > bracketSize - 0.02) {
      reticle = 1.0;
    }

    // Reticle color: bright cyan-white
    vec3 reticleColor = vec3(0.7, 1.0, 0.7);
    thermalColor = mix(thermalColor, reticleColor, reticle * 0.8);

    out_FragColor = vec4(thermalColor, 1.0);
  }
`;
