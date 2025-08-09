// shaders/pour/sharedShader.frag
precision mediump float;

varying vec2 vUV;

// Pixi v8 "resources.pour" altında tanımlanacak
uniform vec4  uColor;
uniform float uTime;
uniform float uFlowSpeed;
uniform float uEdgeSoftness;
uniform float uWobbleAmp;
uniform float uWobbleFreq;
uniform float uTail;
uniform float uHead;
uniform float uFoamWidth;
uniform float uFoamBoost;

void main() {
    // Görünür segment [uTail, uHead]
    float visA = smoothstep(uTail, uTail + 0.01, vUV.x);
    float visB = 1.0 - smoothstep(uHead - 0.01, uHead, vUV.x);
    float vis = visA * visB;
    if (vis <= 0.0) discard;

    // Akış ve dalga
    float flow = vUV.x + uTime * uFlowSpeed;
    float wobble = sin(flow * 6.28318 * uWobbleFreq) * uWobbleAmp;

    // Kenarlara (vUV.y: 0..1) yumuşak alpha
    float distToEdge = min(vUV.y, 1.0 - vUV.y);
    float edge = smoothstep(0.0, uEdgeSoftness, distToEdge);
    float alpha = uColor.a * edge * vis;
    alpha *= clamp(1.0 - abs(wobble) * 4.0, 0.0, 1.0);

    // Köpük vurgusu (baş/kuyruk)
    float headFoam = 1.0 - smoothstep(uHead - uFoamWidth, uHead, vUV.x);
    float tailFoam = 1.0 - smoothstep(uTail, uTail + uFoamWidth, vUV.x);
    float foam = max(headFoam, tailFoam) * uFoamBoost * edge;

    vec3 col = uColor.rgb + foam;
    gl_FragColor = vec4(col, alpha);
}
