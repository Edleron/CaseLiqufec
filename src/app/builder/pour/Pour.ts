import { Container, Shader, Geometry, Mesh, Point, Color } from "pixi.js";

import fragment from '../../../shaders/pour/sharedShader.frag?raw';
import vertex   from '../../../shaders/pour/sharedShader.vert?raw';

export interface PourOptions  {
  start             : Point;
  end               : Point;
  color             : string;
  segments?         : number;           // default 32
  width?            : number;           // şerit kalınlığı (px), default 18
  gravity?          : number;           // 0..1 arası düşüş etkisi, default 0.4
  anchorBias?       : number;           // C2'nin x-yerleşimi (kaynağa yakınlık), 0..1, default 0.15
  sourceAngleRad?   : number | null;    // şişe ağzı yönü; verilmezse start->end vektörü
};

export class Pour {
    public mainConfig   : PourOptions;
    public reference    : any;
    public setPour      : boolean = false;
    public tail         : number = 0.0;
    public head         : number = 0.0;
   
    /**
     *
     */
    constructor(config: PourOptions) {
        this.mainConfig = config;
        this.reference = this.createPourMeshV8(config);
    }

    public onBottlesMoved(newStart: Point, newEnd: Point) {
        this.reference.rebuildGeometry(0, newStart, newEnd);
    }
    
    public setVisibleRange(tail: number, head: number) {
        const u = this.reference.shader.resources.pour.uniforms;
        u.uTail = Math.max(0, Math.min(tail, 1));
        u.uHead = Math.max(0, Math.min(head, 1));
    }

    public update(dt: number) { 
        if (!this.setPour) { return; }           
        this.head = Math.min(1, this.head + dt * 0.9); // akış uzuyor
        this.reference.setVisibleRange(this.tail, this.head);
        this.reference.rebuildGeometry(dt);
    }

    private createPourMeshV8(opts: PourOptions) {
        const startWorld = opts.start.clone();
        const endWorld = opts.end.clone();
        const segments = opts.segments ?? 32;
        const baseWidth = opts.width ?? 18;
        const gravity = opts.gravity ?? 0.4;
        const anchorBias = Math.max(0, Math.min(opts.anchorBias ?? 0.15, 1));

        const vertexCount = (segments + 1) * 2;

        // Geometry buffers
        const positions = new Float32Array(vertexCount * 2); // x,y per vertex
        const uvs       = new Float32Array(vertexCount * 2); // u,v per vertex
        const indices   = new Uint16Array(segments * 6);

        //#region Set Indices
        // index buffer (triangle strip -> triangles)
        for (let i = 0; i < segments; i++) {
            const i0 = i * 2, i1 = i0 + 1, i2 = i0 + 2, i3 = i0 + 3;
            const idx = i * 6;
            indices[idx + 0] = i0;
            indices[idx + 1] = i2;
            indices[idx + 2] = i1;
            indices[idx + 3] = i2;
            indices[idx + 4] = i3;
            indices[idx + 5] = i1;
        }

        
        const baseRgb = new Color('rgba(100, 0, 80, 1.0)').toRgbArray(); // [r,g,b] 0..1
        const colors = new Float32Array(vertexCount * 3);
        for (let i = 0; i < vertexCount; i++) {
            const o = i * 3;
            colors[o + 0] = baseRgb[0];
            colors[o + 1] = baseRgb[1];
            colors[o + 2] = baseRgb[2];
        }

        const geometry = new Geometry({
            attributes: {
            aPosition: positions,   // Float32Array
            aUV:       uvs,         // Float32Array
            aColor:     colors,
            },
            indexBuffer: indices,     // Uint16Array
        });

        // Shader.from — Pixi v8 kullanımı
        const shader = Shader.from({
            gl: { vertex: vertex, fragment: fragment },
            resources: {
            pour: {
                // uColor:        { value: [0.15, 0.55, 0.95, 0.85], type: "vec4<f32>" },
                uTime:         { value: 0.0,  type: "f32" },
                uFlowSpeed:    { value: 0.35, type: "f32" },
                uEdgeSoftness: { value: 0.12, type: "f32" },
                uWobbleAmp:    { value: 0.02, type: "f32" },
                uWobbleFreq:   { value: 1.30, type: "f32" },
                uTail:         { value: 0.00, type: "f32" },
                uHead:         { value: 0.00, type: "f32" },
                uFoamWidth:    { value: 0.05, type: "f32" },
                uFoamBoost:    { value: 0.25, type: "f32" },
            },
            },
        });

        const mesh = new Mesh({ geometry, shader });
        mesh.position.set(50, 50)
        const container = new Container();
        container.addChild(mesh);
        //#endregion

        // Geometry rebuild (asıl iş burada)
        function rebuildGeometry(dtSec: number, newStart?: Point, newEnd?: Point, sourceAngleRad?: number | null) {
            if (newStart) startWorld.copyFrom(newStart);
            if (newEnd)   endWorld.copyFrom(newEnd);

            // Container'ı start noktasına oturt (lokal alan)
            container.position.set(startWorld.x, startWorld.y);

            const len = Math.hypot(endWorld.x - startWorld.x, endWorld.y - startWorld.y);

            // Kaynak ağzı yönü (şişe rotasyonu varsa onu ver; yoksa start->end)
            const angle = (sourceAngleRad ?? opts.sourceAngleRad) ?? Math.atan2(endWorld.y - startWorld.y, endWorld.x - startWorld.x);
            const pourDir = new Point(Math.cos(angle), Math.sin(angle)); // ekranda +Y aşağıya bakar

            // Düşme miktarı (dikey kilit). +Y aşağı olduğundan "drop" pozitif y'e eklenir.
            const drop = Math.max(40, Math.min(len * gravity * 1.5, 400));

            // Kontrol noktaları (asimetrik cubic)
            // C1: kısa handle – şişe yönüne, küçük bir ark için
            const c1Len = Math.min(len * 0.35, 140);
            const c1 = new Point(
            startWorld.x + pourDir.x * c1Len,
            startWorld.y + pourDir.y * c1Len
            );

            // C2: x kaynağa yakın (anchorBias), y aşağıya çekilerek dikeyleşme
            const c2 = new Point(
            startWorld.x * (1 - anchorBias) + endWorld.x * anchorBias,
            startWorld.y + drop
            );

            // Cubic Bezier üzerinden örnekleme
            for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const p  = bezier3(startWorld, c1, c2, endWorld, t);
            const tg = bezier3Tangent(startWorld, c1, c2, endWorld, t);

            // normal (perpendicular)
            let nx = -tg.y, ny = tg.x;
            const nLen = Math.hypot(nx, ny) || 1.0;
            nx /= nLen; ny /= nLen;

            // Kenarın "aşağı"ya bakmasını istiyorsan (alpha profilinde daha düzgün görünür)
            if (ny < 0.0) { nx = -nx; ny = -ny; }

            const w = thicknessProfile(t, baseWidth) * 0.5;

            const downX = p.x - nx * w - container.position.x;
            const downY = p.y - ny * w - container.position.y;
            const upX   = p.x + nx * w - container.position.x;
            const upY   = p.y + ny * w - container.position.y;

            const v0 = i * 4;
            positions[v0 + 0] = downX;
            positions[v0 + 1] = downY;
            positions[v0 + 2] = upX;
            positions[v0 + 3] = upY;

            const uv0 = i * 4;
            uvs[uv0 + 0] = t; uvs[uv0 + 1] = 0.0;
            uvs[uv0 + 2] = t; uvs[uv0 + 3] = 1.0;
            }

            geometry.getBuffer("aPosition")!.update();
            geometry.getBuffer("aUV")!.update();

            shader.resources.pour.uniforms.uTime += dtSec;
        }

        function setVisibleRange(tail: number, head: number) {
            const u = shader.resources.pour.uniforms;
            u.uTail = Math.max(0, Math.min(tail, 1));
            u.uHead = Math.max(0, Math.min(head, 1));
        }

        function setColor(r: number, g: number, b: number, a: number) {
            // Update per-vertex color buffer (shader does not use uColor)
            for (let i = 0; i < vertexCount; i++) {
            const o = i * 3;
            colors[o + 0] = r;
            colors[o + 1] = g;
            colors[o + 2] = b;
            }
            geometry.getBuffer("aColor")!.update();
        }

        function bezier3(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
            const u = 1 - t;
            const tt = t * t, uu = u * u, uuu = uu * u, ttt = tt * t;
            return new Point(
                uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
                uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
            );
        }

        function bezier3Tangent(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
            const u = 1 - t;
            const dx = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
            const dy = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
            return new Point(dx, dy);
        }

        function thicknessProfile(t: number, base: number): number {
            // baş/son hafif kalın, ortada biraz incelir (çok hafif)
            return base * (0.9 + 0.2 * Math.cos(t * 6.28318));
        }

        return { container, mesh, shader, rebuildGeometry, setVisibleRange, setColor };
    }


}





