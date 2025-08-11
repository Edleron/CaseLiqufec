// Bu kod, geometrinin içindeki her bir piksel için çalışır.
// Görevi, o pikselin nihai rengini belirlemektir.

// Değişkenlerin hassasiyetini belirler.
precision mediump float;

// --- Girdiler (Varyings/In) ---
// Bu, Vertex Shader'dan gelen enterpolasyonlu UV koordinatıdır.
// (0,0) sol üst, (1,1) sağ alt.
varying vec2 vUV;       // in vec2 -> varying vec2
varying vec3 vColor;    // in vec3 -> varying vec3

// --- Uniform'lar ---
// Bunlar, TypeScript/JavaScript tarafından gönderilen kontrol değişkenleridir.
// uniform vec4 uColor;      // Sıvının rengi (R, G, B, A)
uniform float uFill;      // Doluluk oranı (0.0 = boş, 1.0 = dolu)
uniform float uRotation;  // Kabın dönüş açısı (radyan cinsinden)
uniform float uTime;      // Dalgalanma animasyonu için geçen zaman

// Dalga efektini kontrol etmek için ek uniform'lar
uniform float uWaveSpeed;     // Dalganın hızı
uniform float uWaveFrequency; // Dalga sıklığı (ne kadar sık dalga olacağı)
uniform float uWaveAmplitude; // Dalga yüksekliği

// PI sabiti
const float PI = 3.14159265359;

void main() {
    // 1. Temel Sıvı Seviyesini Hesapla
    // vUV.y 0 (üst) ile 1 (alt) arasında olduğu için, seviyeyi alttan başlatıyoruz.
    float baseLevel = 1.0 - uFill;

    // 2. Dönüş (Rotation) Etkisini Hesapla
    // tan(açı) bize eğimi verir.
    // (vUV.x - 0.5) ifadesi, dönüşün merkezden (0.5) olmasını sağlar.
    // tan() fonksiyonu 90 derecede sonsuza gittiği için, JavaScript tarafında
    // açıyı sınırlamak önemlidir.
    float rotationOffset = (vUV.x - 0.5) * tan(uRotation);

    // 3. Dalga (Wave) Etkisini Hesapla
    // Basit bir sinüs dalgası oluşturuyoruz.
    // vUV.x'e bağlı olması, dalganın yatayda oluşmasını sağlar.
    // uTime'a bağlı olması, animasyonu sağlar.
    float wave = sin(vUV.x * uWaveFrequency + uTime * uWaveSpeed) * uWaveAmplitude;

    // 4. Nihai Yüzey Seviyesini Belirle
    // Tüm efektleri birleştir.
    float finalSurfaceLevel = baseLevel - rotationOffset + wave;

    // 5. Pikseli Renklendir veya At
    // Eğer mevcut pikselin dikey konumu (vUV.y), hesaplanan yüzey seviyesinin
    // altındaysa, o piksel sıvının içindedir.
    if (vUV.y > finalSurfaceLevel) {
        // Pikseli belirlenen renkle boya.
        // gl_FragColor = uColor;
        gl_FragColor = vec4(vColor, 1.0);
    } else {
        // Bu piksel sıvının dışında, bu yüzden onu çizme.
        // discard komutu, o pikseli tamamen atar ve performansı artırır.
        discard;
    }
}