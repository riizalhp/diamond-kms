# Diamond KMS Design System

Panduan ini berisi aturan desain (UI Kit) untuk project Diamond KMS. Seluruh styling di dalam project harus mengacu pada token dan komponen di bawah ini untuk menjaga konsistensi visual.

## 🎨 1. Color Palette

### Primary — Deep Navy
Merepresentasikan kepercayaan, otoritas, dan kedalaman (Enterprise bedrock). Digunakan untuk elemen dominan seperti sidebar, header, dan CTA (Call to Action) utama.

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `navy-50` | `#EEF2FF` | Background subtle |
| `navy-100` | `#E0E7FF` | Hover state |
| `navy-200` | `#C7D2FE` | Border aktif |
| `navy-400` | `#818CF8` | Icon, accent ringan |
| `navy-600` | `#4F46E5` | CTA, link aktif (Primary) |
| `navy-700` | `#4338CA` | CTA hover |
| `navy-800` | `#1E1B4B` | Sidebar bg |
| `navy-900` | `#0F0E2A` | Heading, text utama |

### Accent — Amber Gold
Merepresentasikan pengetahuan, premium, dan highlight. Digunakan untuk gamifikasi, badge poin, notifikasi penting, dan fitur premium.

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `amber-50` | `#FFFBEB` | Alert background |
| `amber-100` | `#FEF3C7` | Highlight bg |
| `amber-300` | `#FCD34D` | Star, trophy |
| `amber-400` | `#FBBF24` | Badge premium |
| `amber-500` | `#F59E0B` | Accent primary |
| `amber-600` | `#D97706` | Accent hover |

### Surface — Neutral
Warna netral yang clean dan tidak membuat mata lelah untuk pemakaian jangka panjang (8+ jam).

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `surface-0` | `#FFFFFF` | Card, modal bg |
| `surface-50` | `#F8F9FE` | Page bg |
| `surface-100` | `#F1F2FA` | Input bg, table row alt |
| `surface-200` | `#E4E6F0` | Divider, border default |
| `surface-300` | `#C8CBDC` | Border strong, skeleton |

### Semantic — Status
Konsisten untuk status lintas modul seperti approval workflow, billing status, notifikasi.

| Status | Background | Text/Dot | Hex | Usage |
| :--- | :--- | :--- | :--- | :--- |
| Success | `success-bg` (`#D1FAE5`) | `success` (`#10B981`) | `#10B981` | Published, approved |
| Warning | `warning-bg` (`#FEF3C7`) | `warning` (`#F59E0B`) | `#F59E0B` | Pending, expiring |
| Danger | `danger-bg` (`#FEE2E2`) | `danger` (`#EF4444`) | `#EF4444` | Rejected, quota low |
| Info | `info-bg` (`#DBEAFE`) | `info` (`#3B82F6`) | `#3B82F6` | Draft, info |

---

## 📐 2. Radius & Shadows

### Border Radius
- `sm`: `6px`
- `md`: `10px`
- `lg`: `16px`
- `xl`: `24px`
- `full`: `9999px`

### Shadows
- `sm`: `0 1px 3px 0 rgba(15,14,42,0.08), 0 1px 2px -1px rgba(15,14,42,0.06)`
- `md`: `0 4px 16px -2px rgba(15,14,42,0.10), 0 2px 8px -2px rgba(15,14,42,0.06)` (Default Card)
- `lg`: `0 12px 40px -4px rgba(15,14,42,0.14), 0 4px 16px -4px rgba(15,14,42,0.08)` (Hover Card)
- `glow`: `0 0 0 3px rgba(79,70,229,0.18)` (Focus Input)
- `amber`: `0 0 0 3px rgba(245,158,11,0.20)`

---

## 🔤 3. Typography

Kami menggunakan kombinasi 3 font family:
1. **Sora**: Untuk Display & Headings (h1 - h6).
2. **DM Sans**: Untuk Body, paragraf, label.
3. **JetBrains Mono**: Untuk Code snippet.

```html
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
```

**Type Scale:**
- **Display**: 42px / 800 (Sora)
- **H1**: 28px / 700 (Sora)
- **H2**: 20px / 600 (Sora)
- **H3**: 16px / 600 (Sora)
- **Body L**: 16px / 400 (DM Sans)
- **Body M**: 14px / 400 (DM Sans) — *Default size*
- **Label**: 12px / 500 (DM Sans)
- **Micro**: 11px / 600 (DM Sans) — *Uppercase, Tracking*

---

## 🧩 4. UI Components

### 🔘 Buttons
- **Primary**: Background `#4F46E5`, Color `white`
- **Secondary**: Background `#F1F2FA`, Color `#374151`
- **Amber**: Background `#F59E0B`, Color `white`
- **Ghost**: Background `transparent`, Border `1.5px solid #4F46E5`, Color `#4F46E5`
- **Danger**: Background `#EF4444`, Color `white`
- **Dark**: Background `#0F0E2A`, Color `white`

### 📦 Cards
**Default State:**
- Background: `white`
- Border: `1px solid #E4E6F0`
- Radius: `16px`
- Shadow: `md` (`0 4px 16px -2px rgba(15,14,42,0.08)`)

**Hover State (`.card-hover`):**
- Transition: `all 0.2s ease`
- Transform: `translateY(-2px)`
- Border Color: `#818CF8`
- Shadow: `lg` (`0 12px 40px -4px rgba(15,14,42,0.14)`)

### 📝 Form Inputs
- Border Reguler: `1.5px solid #E4E6F0`
- Background: `white`
- Focus State: Border menjadi `#4F46E5`, Box Shadow `glow` (`0 0 0 3px rgba(79,70,229,0.12)`)
- Radius: `8px`
- Error State: Border `#EF4444`, Box Shadow `0 0 0 3px rgba(239,68,68,0.1)`

### 🏷️ Status Badges
Digunakan untuk Approval Workflow.
Kombinasi antara warna Background yang soft dan Text yang contrast dikoordinasikan oleh Semantic status.
- **Published**: Bg `#D1FAE5`, Text `#065F46`, Dot `#10B981`
- **Pending/Expiring**: Bg `#FEF3C7`, Text `#92400E`, Dot `#F59E0B`
- **Draft**: Bg `#DBEAFE`, Text `#1E40AF`, Dot `#3B82F6`
- **Rejected**: Bg `#FEE2E2`, Text `#991B1B`, Dot `#EF4444`

---

## 🧠 5. Design Rationale (Filosofi Desain)

- 🎯 **Target User:** Knowledge Worker Enterprise, desain yang bersih dan tidak melelahkan mata meski digunakan berjam-jam. Aksi utama dibuat mudah ditemukan.
- 🎨 **Deep Navy + Amber:** Mengkomunikasikan impresi otoritas, enterprise bedrock, dipadukan kontras premium "knowledge is gold".
- 🔤 **Sora + DM Sans:** Sora memiliki presisi geometri yang warm untuk heading. DM Sans memiliki keterbacaan tinggi di berbagai ukuran tanpa kesan terlalu korporat/dingin.
- 🏗️ **Dark Sidebar:** Mengurangi eye strain serta menciptakan orientasi konteks bagi pengguna (navigasi terfokus agar tidak tercampur dengan konten).
- ⚡ **Amber Accent untuk Gamifikasi:** Asosiasi bahwa Amber adalah nilai, poin, trofi, maupun achievment/reward.
- 🔐 **Semantic Colors:** Menjamin pengguna paham dengan sekali lihat arti warna lintas modul (contoh: merah untuk rejected).
