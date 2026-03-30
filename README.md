# ServicePRO

ServicePRO, Marlin Yachting servis operasyonları için geliştirilmiş bir saha uygulamasıdır. Uygulama; iş emri planlama, dispatch, teknisyen iş takibi, saha teslim raporu, puanlama ve yönetim ekranlarını tek Next.js kod tabanında toplar.

## Ne Yapar?

- Tekne, müşteri ve servis işi kayıtlarını merkezi olarak yönetir.
- Yatmarin, Netsel ve saha ekipleri için günlük / haftalık dispatch planı üretir.
- Teknisyenlerin `My Jobs` akışında saha raporu göndermesini, fotoğraf yüklemesini ve iş kapatmasını sağlar.
- Koordinatör ve atölye şefi için Form-1 / Form-2 / Form-3 benzeri puanlama ve leaderboard ekranları sunar.
- PWA ve çevrimdışı kuyruk mantığı ile zayıf bağlantıda saha raporunu cihazda tutup bağlantı gelince senkronize eder.

## Temel Modüller

- `app/`
  App Router sayfaları, auth akışları, dashboard ekranları ve API route'lar.
- `components/`
  Dispatch, job detail, scoring, settings ve layout UI bileşenleri.
- `lib/`
  Auth, dispatch, scoring, storage, queue, notifications ve domain yardımcıları.
- `prisma/`
  Veri modeli, migration'lar ve seed script'i.
- `infra/`
  Reverse proxy konfigürasyonu. Şu anda Caddy dosyası burada tutulur.
- `public/`
  PWA manifest'i, ikonlar ve statik asset'ler.

## Lokal Kurulum

1. Node.js 20+ ve npm kurulu olsun.
2. `.env.example` dosyasını `.env.local` veya `.env` olarak kopyalayın.
3. Gerekli değişkenleri kendi lokal servislerinize göre düzenleyin.
4. Bağımlılıkları kurun:

```bash
npm ci
```

5. Prisma client üretin ve veritabanını hazırlayın:

```bash
npm run prisma:generate
npm run db:push
```

6. Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

Lokal adres varsayılan olarak [http://localhost:3000](http://localhost:3000) olur.

## Environment Değişkenleri

Minimum geliştirme kurulumu için aşağıdaki değişkenler gerekir:

- `DATABASE_URL`
  PostgreSQL bağlantısı.
- `AUTH_SECRET`
  Auth.js oturum imzalama anahtarı.
- `AUTH_URL`
  Auth callback ve session origin'i. Lokal için `http://localhost:3000`.
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_USE_SSL`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_PUBLIC_URL`
  Fotoğraf yükleme ve servis görselleri için MinIO erişimi.
- `DB_PASSWORD`
  `docker-compose.yml` içindeki Postgres servisi için örnek değişken.
- `APP_URL`
  Uygulamanın public origin'i.
- `APP_DOMAIN`
  `infra/Caddyfile` tarafından kullanılan host adı.

Not:
- Production ortamında `AUTH_URL` ve `APP_URL` aynı HTTPS origin'i göstermelidir.
- PWA kurulumunun gerçekten çalışması için HTTPS gerekir; düz IP + HTTP üzerinde service worker installable PWA davranışı beklenmemelidir.

## Komutlar

```bash
npm run dev
npm run lint
npm run test
npm run build
npm run check:encoding
npm run prisma:generate
npm run db:push
npm run db:seed
```

`npm run db:seed` demo verisi yazar. Canlı veritabanında kullanılmamalıdır.

## Mimari Özeti

### Rol bazlı erişim

Rol ve yetki kontrolü `lib/auth.ts`, `lib/next-auth.ts` ve ilgili server action'lar içinde yapılır. Teknisyen, koordinatör, atölye şefi ve admin akışları dashboard route'larında ayrılır; özellikle job aksiyonları ve puanlama ekranları rol bazlı filtrelenir.

### Dispatch

Dispatch ekranları `app/(dashboard)/dispatch` altında yaşar ve plan verisini `lib/dispatch.ts` üretir. Günlük plan yayınlama akışı WhatsApp şablonları, published log kaydı ve placeholder push bildirimi ile birlikte çalışır.

### Saha raporu kuyruğu

Saha teslim formu `components/scoring/FieldReportFlow.tsx` üzerinden çalışır. Offline durumda rapor `lib/field-report-queue.ts` içinde `localStorage` tabanlı kuyrukta tutulur; bağlantı geri geldiğinde `app/api/field-reports/queue/route.ts` üzerinden senkronize edilir.

### PWA / offline davranışı

Service worker tanımı `app/sw.ts`, manifest ise `public/manifest.json` içinde bulunur. Ana navigasyon ve statik asset'ler cache'lenir; belge istekleri için offline fallback ekranı `app/~offline/page.tsx` ile sağlanır.

## Operasyon ve Deploy Dokümanları

- QNAP canlı deploy akışı: [QNAP_DEPLOY.md](./QNAP_DEPLOY.md)
- Reverse proxy: [infra/Caddyfile](./infra/Caddyfile)
- Container orkestrasyonu: [docker-compose.yml](./docker-compose.yml)
- Uygulama image build'i: [Dockerfile](./Dockerfile)
- Örnek ortam değişkenleri: [.env.example](./.env.example)

README ürün ve geliştirme perspektifini anlatır. `QNAP_DEPLOY.md` ise canlı sunucu prosedürleri için tutulur; aynı bilgiyi iki yerde ayrıntılı tekrar etmeyin.

## Encoding Politikası

Repo standardı:

- UTF-8
- LF satır sonu
- tercihen BOM'suz kayıt

Koruyucu dosyalar:

- `.editorconfig`
- `.gitattributes`
- `npm run check:encoding`

Yeni metin veya doküman eklerken bozuk karakter kontrolü için:

```bash
npm run check:encoding
```

Bu komut mojibake desenleri görürse non-zero exit code döner.

## Bakım Notu

Infra, environment veya kurulum akışında değişiklik yapıldığında şu dosyaları birlikte güncelleyin:

- `README.md`
- `.env.example`
- `QNAP_DEPLOY.md`
- gerekirse `docker-compose.yml` ve `infra/Caddyfile`

Bu küçük senkronizasyon, dokümantasyonun koddan kopmasını ve encoding / operasyon borcunun tekrar oluşmasını engeller.
