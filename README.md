# Hình học động

Công cụ hình học động chạy hoàn toàn trên trình duyệt, dùng để dạy Olympic Toán (ôn thi VMO) trên máy
chiếu và chuẩn bị bài. Giao diện tiếng Việt, không cần máy chủ, **chạy được offline** (mọi thư viện đã
nằm sẵn trong thư mục `vendor/`).

* Dựng hình kiểu Geometer's Sketchpad, kéo thả điểm, hình cập nhật liên tục.
* Tua từng bước dựng khi giảng, chế độ trình chiếu nét đậm chữ to.
* Đánh dấu kiểu sách giáo khoa (cung góc, vạch đoạn bằng nhau, tô nền).
* Chia sẻ bằng link, lưu/mở tệp `.json`, tự lưu nháp.
* **Khám phá**: tự tìm các quan hệ ẩn (thẳng hàng, đồng viên, đồng quy, tiếp xúc…).
* Xuất mã **TikZ** để dán vào LaTeX.

---

## 1. Mở chương trình

**Trên mạng (GitHub Pages)** – sau khi bật Pages (mục 4): `https://typhoon-delta.github.io/Geometry/`

**Không có mạng** – tải cả thư mục về máy (nút *Code → Download ZIP* trên GitHub), giải nén rồi
nháy đúp `index.html`. Mọi tính năng đều chạy, chỉ riêng *link chia sẻ* tạo ra khi mở từ tệp
trên máy thì chỉ dùng được trên chính máy đó.

Trình duyệt khuyên dùng: Chrome, Edge, Firefox hoặc Safari bản mới.

## 2. Hướng dẫn sử dụng

### Dựng hình

Chọn công cụ ở cột trái rồi bấm lên bảng vẽ; dòng gợi ý phía trên bảng vẽ cho biết cần chọn gì tiếp.

* **Bấm vào chỗ trống** khi công cụ cần một điểm: tạo **điểm tự do** (chấm đỏ).
* **Bấm lên một đường thẳng/đường tròn**: tạo **điểm trên đối tượng** (chấm cam, kéo được nhưng chỉ chạy trên đối tượng đó).
* **Bấm gần chỗ hai đường cắt nhau**: tạo **giao điểm**.
* Công cụ *Giao điểm*: bấm thẳng vào chỗ cắt, hoặc chọn lần lượt hai đường (tạo mọi giao điểm còn thiếu).
  Nếu một giao điểm đã có sẵn (vd đường thẳng qua A cắt đường tròn qua A), điểm còn lại được dựng là
  "giao điểm thứ hai, khác A" – luôn đúng điểm đó dù kéo hình thế nào.
* *Trung điểm, Trung trực, Đánh dấu đoạn*: có thể bấm thẳng vào một đoạn thẳng.
* *Đường vuông góc, song song, Hình chiếu*: chọn điểm và đường theo thứ tự nào cũng được.
* Nhóm **Tam giác**: chọn 3 đỉnh. Với *Chân đường cao, Tiếp điểm nội tiếp, Điểm giữa cung*, đỉnh chọn
  **đầu tiên** là đỉnh A, cạnh tương ứng là BC. Có hai công cụ điểm chính giữa cung BC: cung **không chứa** A
  và cung **chứa** A.
* `Esc`: huỷ thao tác đang dở / về công cụ Chọn.

### Kéo thả, chọn, sửa

* Công cụ **Chọn / kéo** (↖): kéo điểm đỏ/cam; kéo **nhãn** để dời nhãn; kéo nền để dời cả hình;
  lăn chuột để phóng to/thu nhỏ. *Vừa khung* thu phóng cho vừa hình. *Lưới* bật lưới và bắt điểm theo lưới.
* Bấm vào đối tượng (trên hình hoặc trong danh sách *Các bước dựng*) để chọn; giữ `Shift` để chọn nhiều.
  Bảng thuộc tính bên dưới cho đổi **tên**, **màu**, nét đứt, độ dày, tô nền nhạt (đường tròn, miền đa giác),
  số cung/số vạch của dấu, ẩn đối tượng, đổi sang giao điểm còn lại…
* **Đổi tên**: nháy đúp vào điểm (hoặc vào dòng trong danh sách). Chữ số ở cuối thành chỉ số dưới (`A1` → A₁).
* **Xoá**: phím `Delete` hoặc nút 🗑. Nếu có đối tượng phụ thuộc, chương trình liệt kê và hỏi lại trước khi xoá kèm.
* **Hoàn tác / Làm lại**: `Ctrl+Z` / `Ctrl+Y` (hoặc `Ctrl+Shift+Z`).

### Đánh dấu kiểu sách giáo khoa

Nhóm **Đánh dấu**: *Đánh dấu góc* (chọn điểm–đỉnh–điểm), *Đánh dấu đoạn*, *Tô miền đa giác* (chọn các đỉnh,
bấm lại đỉnh đầu hoặc `Enter` để kết thúc). Trước khi bấm, chọn màu và số cung/số vạch ở mục *Kiểu dấu mới*
cuối cột trái: các góc bằng nhau nên dùng cùng màu và cùng số cung; góc vuông tự vẽ ô vuông.
Tô nền đường tròn quan trọng: chọn đường tròn → kéo thanh *Tô nền nhạt*.

### Tua bước khi giảng

* Nút **▶ Trình bày**: hình hiện dần từng **khung**. Dùng nút *Trước/Sau* hoặc phím `←` `→`
  (`PageUp`/`PageDown` – dùng được với bút trình chiếu), `Home`/`End`. Vẫn kéo được điểm để minh hoạ.
* Gộp nhiều bước vào một khung: bấm nút ⤒ ở cuối dòng bước (gộp với bước ngay trên).
  Số khung hiện ở cột trái của danh sách bước.
* Ẩn đối tượng phụ: bấm chấm tròn đầu dòng (●/◌). Đối tượng ẩn không chiếm khung riêng.

### Trình chiếu

Nút **⛶ Trình chiếu**: toàn màn hình, nét đậm, chữ to, ẩn các bảng. Kết hợp với *Trình bày* để tua bước
trên máy chiếu. Thoát: `Esc` hoặc nút ✕ ở góc trên.

### Lưu và chia sẻ

* **🔗 Chia sẻ link**: toàn bộ hình được nén vào chính đường link – gửi link là người nhận mở ra đúng hình.
* **💾 Lưu** (`Ctrl+S`): tải về tệp `.json`. **📂 Mở** (`Ctrl+O`): mở lại tệp đó.
* Hình đang làm được **tự lưu nháp** trong trình duyệt và khôi phục khi mở lại trang.
* Menu **Ví dụ…** có sẵn: đường thẳng Euler, đường tròn Euler, đường thẳng Simson, định lý Miquel.

### Khám phá hình

Nút **🔍 Khám phá** (hoặc thẻ *Khám phá* bên phải). Chương trình xê dịch ngẫu nhiên các điểm tự do nhiều lần,
chỉ giữ những quan hệ **đúng trên mọi lần**: thẳng hàng, đồng viên, đồng quy, song song, vuông góc, tiếp xúc
(hai đường tròn, đường thẳng – đường tròn), điểm nằm trên đường thẳng/đường tròn, trùng nhau.
Các quan hệ hiển nhiên từ cách dựng (vd giao điểm thì nằm trên hai đường đã cắt) bị loại. Kết quả xếp theo
điểm: ưu tiên quan hệ dính tới đường tròn ngoại tiếp, nội tiếp, Euler và các điểm O, I, H (tự nhận ra cả khi
bạn dựng chúng bằng tay). Bấm một kết quả để tô sáng các đối tượng liên quan (kèm đường tròn/đường thẳng
phụ đứt nét).

> Đây là kiểm tra bằng số, không phải chứng minh. Kết quả rất đáng tin (đúng tới sai số 10⁻⁶ trên 12 cấu
> hình ngẫu nhiên) nhưng vẫn là *giả thuyết* cần chứng minh.

### Xuất TikZ

Nút **TikZ**: hiện mã TikZ của hình (đang hiện trên màn hình; ở chế độ trình bày là tới khung hiện tại),
bấm *Sao chép* rồi dán vào LaTeX. Chỉ cần `\usepackage{tikz}`. Đổi kích thước bằng cách sửa `x=…, y=…`
ở dòng `\begin{tikzpicture}`.

### Phím tắt

| Phím | Tác dụng |
|---|---|
| `Ctrl+Z` / `Ctrl+Y` | Hoàn tác / làm lại |
| `Delete` | Xoá đối tượng đang chọn |
| `Esc` | Huỷ thao tác / bỏ chọn / thoát trình chiếu |
| `Enter` | Kết thúc miền đa giác |
| `Ctrl+S` / `Ctrl+O` | Lưu / mở tệp |
| `←` `→` `PageUp` `PageDown` `Home` `End` | Chuyển khung khi trình bày |

## 3. Cấu trúc mã nguồn

```
index.html            trang chính (mở trực tiếp được)
dist/app.js           giao diện đã đóng gói (sinh bằng `npm run build`, CÓ commit để chạy không cần build)
vendor/jsxgraph/      thư viện JSXGraph (đóng gói sẵn, không dùng CDN)
src/core/             LÕI hình học thuần JS: bước dựng, tính toạ độ, mô hình JSON, đặt nhãn
src/explore/          BỘ KHÁM PHÁ thuần JS
src/export/tikz.js    xuất TikZ
src/io/codec.js       mã hoá hình vào URL
src/ui/               GIAO DIỆN (JSXGraph chỉ dùng để vẽ, pan/zoom)
scripts/              công cụ dòng lệnh: kham-pha.mjs, tikz.mjs, vendor.mjs
examples/             hình mẫu dạng JSON
tests/                test lõi + khám phá + TikZ (node --test), test trình duyệt (Playwright)
docs/DINH_DANG_JSON.md  đặc tả định dạng JSON, gợi ý dịch sang Newclid/AlphaGeometry
```

Phát triển (cần Node.js ≥ 18):

```bash
npm install
```

```bash
npm run build          # đóng gói src/ → dist/app.js (nhớ chạy lại và commit dist/ sau khi sửa src/)
```

```bash
npm test               # test lõi, bộ khám phá, TikZ (biên dịch thử bằng pdflatex nếu máy có)
```

```bash
npm run test:browser   # chạy thử trên Chromium headless, ảnh chụp ở tests/browser/out/
```

## 4. Bật GitHub Pages

1. Đưa mã lên nhánh `main` (gộp pull request của nhánh phát triển vào `main`).
2. Trên GitHub, vào repo → **Settings** → **Pages**.
3. Mục **Build and deployment** → *Source*: chọn **Deploy from a branch**.
4. *Branch*: chọn **main**, thư mục **/ (root)** → **Save**.
5. Đợi 1–2 phút, trang sẽ có tại `https://<tên-tài-khoản>.github.io/<tên-repo>/`
   (với repo này: `https://typhoon-delta.github.io/Geometry/`).

Không cần bước build nào trên GitHub vì `dist/app.js` đã được commit sẵn. Tệp `.nojekyll` báo cho GitHub
phục vụ nguyên trạng các tệp tĩnh.

## 5. Giấy phép thư viện

JSXGraph được dùng theo giấy phép LGPL/MIT (xem `vendor/jsxgraph/LICENSE.*`).
