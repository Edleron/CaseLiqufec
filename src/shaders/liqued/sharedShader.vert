// Bu kod, geometrinin her bir köşe noktası için çalışır.
// Görevi, köşe noktasının ekrandaki nihai pozisyonunu hesaplamak
// ve gerekli verileri Fragment Shader'a aktarmaktır.

// Değişkenlerin hassasiyetini belirler.
precision mediump float;

// --- Girdiler (Attributes) ---
// Bunlar, PIXI.Geometry'den gelen verilerdir.
attribute vec2 aPosition; // in vec2 -> attribute vec2
attribute vec2 aUV;       // in vec2 -> attribute vec2

// --- Çıktılar (Varyings/Out) ---
// Bu değişkenler, Fragment Shader'a gönderilir.
// Değerleri, pikseller arasında enterpolasyona uğrar.
varying vec2 vUV; // out vec2 -> varying vec2

// --- Uniform'lar ---
// Bunlar, PixiJS'in her çizim için otomatik olarak sağladığı matrislerdir.
// Objenin pozisyonunu, dönüşünü ve kamera açısını hesaplamak için kullanılır.
uniform mat3 uProjectionMatrix;     // Kamera/Ekran matrisi
uniform mat3 uWorldTransformMatrix; // Objenin dünyadaki pozisyon/dönüş/ölçek matrisi
uniform mat3 uTransformMatrix;      // Geometrinin kendi yerel matrisi

void main() {
    // Geometrinin yerel pozisyonunu, objenin dünya pozisyonu ve kamera ile birleştirerek
    // ekrandaki nihai piksel pozisyonunu hesapla.
    mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
    gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);

    // UV koordinatını Fragment Shader'a aktar.
    vUV = aUV;
}