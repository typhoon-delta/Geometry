# Hình học động

Công cụ hình học động chạy hoàn toàn trên trình duyệt, dùng để dạy Olympic Toán (ôn thi VMO) trên máy
chiếu và chuẩn bị bài. Giao diện tiếng Việt, không cần máy chủ, **chạy được offline** (không tải gì từ
mạng: bộ vẽ canvas tự viết, toàn bộ mã nằm trong `dist/app.js`).

* Dựng hình kiểu Geometer's Sketchpad, kéo thả điểm mượt 60 khung hình/giây kể cả với hình dày. Điểm vừa dựng
  **gõ chữ là đặt tên ngay**, dải **công cụ vừa dùng** chọn lại bằng một lần bấm.
* Phong cách đơn sắc như Sketchpad (nét mảnh, điểm tròn rỗng, nhãn nghiêng có chỉ số dưới `I_A`, `B'`)
  hoặc bộ màu "Sách giáo khoa". Nhãn tự đặt tránh đường, điểm và nhãn khác; đường thẳng vẽ "vừa đủ" như trong sách.
* Menu **Ví dụ**: 23 bài dựng sẵn theo nhóm (IMO 2008–2025, VMO, cấu hình hay gặp, hình dày) – kết quả đợt dùng thử
  bản 1.2 ([`reports/dung-thu.html`](reports/dung-thu.html)).
* Menu **Công cụ** theo thư mục công cụ riêng: dựng hình, đường đặc biệt, đường tròn, điểm đặc biệt, phép
  biến hình, mô hình – và **tự tạo công cụ** từ hình đã dựng.
* Tua từng bước dựng khi giảng, chế độ trình chiếu nét đậm chữ to.
* Đánh dấu kiểu sách giáo khoa (cung góc, vạch đoạn bằng nhau, tô nền).
* Chia sẻ bằng link, lưu/mở tệp `.json`, tự lưu nháp.
* **Khám phá**: tự tìm các quan hệ ẩn (thẳng hàng, đồng viên, đồng quy, tiếp xúc…).
* Xuất mã **TikZ** để dán vào LaTeX.
* **Phòng thí nghiệm** (`lab/`, Python, chạy trên máy cá nhân): tự khám phá qua đêm các sự kiện hình học "lạ"
  để chế đề, thử chứng minh bằng Newclid, sáng hôm sau có báo cáo HTML kèm link mở thẳng hình trong công cụ.
  Hướng dẫn cài đặt cho Windows: [`lab/HUONG_DAN.md`](lab/HUONG_DAN.md).

---

## 1. Mở chương trình

**Trên mạng (GitHub Pages)** – sau khi bật Pages (mục 4): `https://typhoon-delta.github.io/Geometry/`

**Không có mạng** – tải cả thư mục về máy (nút *Code → Download ZIP* trên GitHub), giải nén rồi
nháy đúp `index.html`. Mọi tính năng đều chạy, chỉ riêng *link chia sẻ* tạo ra khi mở từ tệp
trên máy thì chỉ dùng được trên chính máy đó.

Trình duyệt khuyên dùng: Chrome, Edge, Firefox hoặc Safari bản mới.

## 2. Hướng dẫn sử dụng

### Giao diện

* Thanh menu mỏng trên cùng: **Tệp** (mới, mở, lưu, chia sẻ link, xuất TikZ), **Sửa** (hoàn tác,
  làm lại, xoá), **Hiển thị** (bộ kiểu *Đơn sắc* / *Sách giáo khoa*, lưới, đường thẳng vừa đủ, thu phóng vừa hình,
  bảng các bước), **Ví dụ** (thư viện bài dựng sẵn theo nhóm và các hình mẫu).
  Các nút biểu tượng bên phải: hoàn tác, làm lại, 🔍 khám phá, ▶ trình bày, ⛶ trình chiếu, ◫ bảng các bước.
* **Thanh công cụ dọc** bên trái: mỗi biểu tượng là một nhóm (chọn/kéo, điểm, đường tròn, đoạn/tia/đường thẳng,
  dựng, đánh dấu, **Công cụ**). Bấm biểu tượng để dùng công cụ đang chọn của nhóm, đồng thời danh sách công cụ
  trong nhóm hiện ra để đổi. Gợi ý thao tác nằm ở thanh trạng thái dưới đáy. Dưới cùng là dải **công cụ vừa dùng**
  (6 công cụ gần nhất, bấm một lần là chọn lại – đỡ phải mở menu nhiều tầng).
* Bảng **các bước dựng** ẩn mặc định để dành chỗ cho bảng vẽ (nút ◫ để mở). Khi chọn một đối tượng bằng công cụ
  Chọn, thẻ **thuộc tính** nổi lên ở góc phải (tự dời xuống nếu che đối tượng đang chọn; khi đang dựng thì không hiện).

### Dựng hình

Chọn công cụ rồi bấm lên bảng vẽ; thanh trạng thái cho biết cần chọn gì tiếp.

* **Bấm vào chỗ trống** khi công cụ cần một điểm: tạo **điểm tự do**.
* **Bấm lên một đường thẳng/đường tròn**: tạo **điểm trên đối tượng** (kéo được nhưng chỉ chạy trên đối tượng đó).
* **Bấm gần chỗ hai đường cắt nhau**: tạo **giao điểm**.
* Công cụ *Giao điểm*: bấm thẳng vào chỗ cắt, hoặc chọn lần lượt hai đường (tạo mọi giao điểm còn thiếu).
  Nếu một giao điểm đã có sẵn (vd đường thẳng qua A cắt đường tròn qua A), điểm còn lại được dựng là
  "giao điểm thứ hai, khác A" – luôn đúng điểm đó dù kéo hình thế nào.
* *Trung điểm, Trung trực, Đánh dấu đoạn, Đường tròn đường kính*: có thể bấm thẳng vào một đoạn thẳng.
* *Đường vuông góc, song song, Hình chiếu, Tiếp tuyến*: chọn các đối tượng theo thứ tự nào cũng được.
* Mọi công cụ vẽ đường tròn đều **dựng kèm tâm** (không tạo thêm nếu tâm đã có). Tâm tự đặt tên O, O₁, O₂…
  (đường tròn ngoại tiếp/nội tiếp/Euler/bàng tiếp: O, I, N, I_A) để không chiếm các chữ cái của đề.
* **Đặt tên ngay**: điểm vừa dựng được chọn sẵn – cứ gõ tên (vd `M_a` rồi Enter) mà không cần đổi công cụ.
* Bấm vào chỗ nhiều đường cùng đi qua: giao điểm dựng từ hai đường **dựng sau cùng**. Hai điểm trùng chỗ: bấm chọn
  điểm dựng sau (nằm trên).
* Điểm vừa dựng nằm ngoài khung nhìn: chương trình nhắc; phím `Home` thu phóng vừa hình.
* `Esc`: huỷ thao tác đang dở / về công cụ Chọn.

### Menu Công cụ

Biểu tượng cuối của thanh công cụ dọc (▶⋮) mở menu nhiều tầng:

| Nhóm | Công cụ |
|---|---|
| 1. Dựng hình | tam giác, tam giác vuông, vuông cân, đều, hình thang, thang cân, bình hành, chữ nhật, thoi, vuông, tứ giác điều hoà, đường tròn tiếp xúc AB tại A và qua C, tam giác Cevian, tứ giác, tứ giác nội tiếp |
| 2. Đường đặc biệt | đường cao, trung tuyến, trung trực, đẳng giác, đối trung, phân giác ngoài, phân giác trong và ngoài, tiếp tuyến tại một điểm, giao điểm hai tiếp tuyến, tiếp tuyến kẻ từ một điểm, tiếp tuyến chung, đường thẳng Euler, Simson, Steiner |
| 3. Đường tròn | ngoại tiếp, pedal, pedal chi tiết, nội tiếp, bàng tiếp, đường kính, mixtilinear nội, mixtilinear ngoại, trục đẳng phương, tâm đẳng phương, đường tròn Euler |
| 4. Điểm đặc biệt | trọng tâm (và chi tiết), trực tâm (và chi tiết), liên hợp đẳng giác, Lemoine, chân đường vuông góc xuống ba cạnh, tâm vị tự ngoài/trong, Kosnita, tâm Euler; *bổ sung*: tâm ngoại tiếp, nội tiếp, bàng tiếp, tiếp điểm nội tiếp, điểm chính giữa cung (chứa/không chứa đỉnh), chân đường cao |
| 5. Phép biến hình | đối xứng tâm, đối xứng trục, quay (góc nhập ở thẻ tuỳ chọn), vị tự (tỉ số nhập ở thẻ tuỳ chọn), tịnh tiến, nghịch đảo (điểm, đường thẳng, đường tròn – ảnh là đường thẳng hay đường tròn được chọn tự động), **quay theo góc trên hình** (góc ABC), **vị tự theo tỉ số trên hình** (AB/CD), **đồng dạng tâm O biến A thành B**, chiếu vuông góc |
| 6. Mô hình | tam giác với tâm nội tiếp – bàng tiếp, đường thẳng & đường tròn Euler, tam giác orthic, tam giác trung bình, điểm Miquel, đường tròn mixtilinear và tâm nội tiếp |
| 7. Công cụ của tôi | công cụ tự tạo |

Với công cụ tam giác, đỉnh chọn **đầu tiên** là đỉnh "A" (vd đường cao/đối trung/bàng tiếp *từ A*). Bản
**chi tiết** giữ lại các đường dựng phụ (nét đứt xám); bản thường thì ẩn chúng.

**Tự tạo công cụ** (giống *Create New Tool*): chọn các đối tượng **kết quả** trên hình (giữ `Shift` để chọn
nhiều; có thể chọn thêm các đối tượng **ban đầu** làm đầu vào), rồi vào *Công cụ › 7. Công cụ của tôi ›
＋ Tạo công cụ…* và đặt tên. Nếu chỉ chọn kết quả, đầu vào là các điểm gốc mà kết quả phụ thuộc. Công cụ được
lưu trong trình duyệt; *Xuất/Nhập* để mang sang máy khác. Nút ✕ cạnh tên để xoá.

### Kéo thả, chọn, sửa

* Công cụ **Chọn / kéo**: kéo điểm tự do hoặc điểm trên đối tượng; kéo **nhãn** để dời nhãn; kéo nền để dời cả
  hình; lăn chuột (hoặc chụm hai ngón trên màn hình cảm ứng) để phóng to/thu nhỏ.
* Bấm vào đối tượng (trên hình hoặc trong bảng các bước) để chọn; giữ `Shift` để chọn nhiều. Thẻ thuộc tính
  cho đổi **tên**, **màu**, nét đứt, độ dày, tô nền nhạt, số cung/số vạch của dấu, ẩn đối tượng…
* **Đổi tên**: chọn điểm rồi gõ tên (hoặc `F2`, hoặc nháy đúp) – ô tên hiện ngay cạnh nhãn, `Enter` để lưu. Gõ như
  công thức: `I_A` → I với chỉ số A, `X_{AB}`, `B'` → B phẩy, `A'_1`; chữ số cuối tự thành chỉ số dưới (`A1` → A₁).
  Đổi sang tên đang thuộc điểm khác thì hai điểm **đổi chỗ tên** cho nhau.
* **Xoá**: phím `Delete` (hoặc *Sửa › Xoá*). Nếu có đối tượng phụ thuộc, chương trình liệt kê và hỏi lại.
* **Hoàn tác / Làm lại**: `Ctrl+Z` / `Ctrl+Y` (hoặc `Ctrl+Shift+Z`).

### Bộ kiểu

*Hiển thị › Bộ kiểu*: **Đơn sắc** (mặc định – đen, nét 1px, điểm tròn rỗng ruột trắng, nhãn serif nghiêng
sát điểm, giống bản vẽ Sketchpad) hoặc **Sách giáo khoa** (màu dịu). Màu đặt riêng cho từng đối tượng được giữ
ở cả hai bộ. Xuất TikZ theo bộ kiểu đang chọn.

### Đánh dấu kiểu sách giáo khoa

Nhóm **Đánh dấu**: *Đánh dấu góc* (chọn điểm–đỉnh–điểm), *Đánh dấu đoạn*, *Tô miền đa giác* (chọn các đỉnh,
bấm lại đỉnh đầu hoặc `Enter` để kết thúc). Trước khi bấm, chọn màu và số cung/số vạch ở mục *Kiểu dấu mới*
(thẻ nổi góc trái bảng vẽ): các góc bằng nhau nên dùng cùng màu và cùng số cung; góc vuông tự vẽ ô vuông.
Tô nền đường tròn quan trọng: chọn đường tròn → kéo thanh *Tô nền nhạt*.

### Tua bước khi giảng

* Nút **▶ Trình bày**: hình hiện dần từng **khung**. Dùng nút *Trước/Sau* hoặc phím `←` `→`
  (`PageUp`/`PageDown` – dùng được với bút trình chiếu), `Home`/`End`. Vẫn kéo được điểm để minh hoạ.
* Gộp nhiều bước vào một khung: mở bảng các bước (◫), bấm nút ⤒ ở cuối dòng bước (gộp với bước ngay trên).
  Số khung hiện ở cột trái của danh sách bước.
* Ẩn đối tượng phụ: bấm chấm tròn đầu dòng (●/◌). Đối tượng ẩn không chiếm khung riêng.

### Trình chiếu

Nút **⛶ Trình chiếu**: toàn màn hình, nét đậm, chữ to, ẩn các bảng. Kết hợp với *Trình bày* để tua bước
trên máy chiếu. Thoát: `Esc` hoặc nút ✕ ở góc trên.

### Lưu và chia sẻ

* *Tệp › Chia sẻ bằng link*: toàn bộ hình được nén vào chính đường link – gửi link là người nhận mở ra đúng hình.
* *Tệp › Lưu tệp* (`Ctrl+S`): tải về tệp `.json`. *Tệp › Mở tệp* (`Ctrl+O`): mở lại tệp đó.
* Hình đang làm được **tự lưu nháp** trong trình duyệt và khôi phục khi mở lại trang.
* Menu **Ví dụ**: 13 bài IMO (2008–2025), 2 bài VMO, 7 cấu hình hay gặp (bổ đề tâm nội tiếp – bàng tiếp, Feuerbach,
  mixtilinear, nghịch đảo √(bc), Brocard, Monge, đồng dạng xoắn), một hình dày với I_A, I_B, I_C; cùng các hình mẫu
  cũ. Rê chuột lên tên bài để xem đề tóm tắt. Các hình được dựng qua giao diện trong đợt dùng thử bản 1.2 và đã kiểm
  chứng kết luận bằng số; tệp JSON ở `examples/thu-vien/`.

### Hiển thị

* *Hiển thị › Đường thẳng vừa đủ (kiểu sách)* (bật sẵn): đường thẳng/tia chỉ vẽ qua các điểm nằm trên nó và nhô ra
  một đoạn ngắn; khi đang dùng công cụ dựng, phần kéo dài hiện mờ để vẫn thấy chỗ cắt. Xuất TikZ theo cùng kiểu.

### Khám phá hình

Nút **🔍** (Khám phá) trên thanh trên. Chương trình xê dịch ngẫu nhiên các điểm tự do nhiều lần,
chỉ giữ những quan hệ **đúng trên mọi lần**: thẳng hàng, đồng viên, đồng quy, song song, vuông góc, tiếp xúc
(hai đường tròn, đường thẳng – đường tròn), điểm nằm trên đường thẳng/đường tròn, trùng nhau.
Các quan hệ hiển nhiên từ cách dựng (vd giao điểm thì nằm trên hai đường đã cắt) bị loại. Kết quả xếp theo
điểm: ưu tiên quan hệ dính tới đường tròn ngoại tiếp, nội tiếp, Euler và các điểm O, I, H (tự nhận ra cả khi
bạn dựng chúng bằng tay). Bấm một kết quả để tô sáng các đối tượng liên quan (kèm đường tròn/đường thẳng
phụ đứt nét).

> Đây là kiểm tra bằng số, không phải chứng minh. Kết quả rất đáng tin (đúng tới sai số 10⁻⁶ trên 12 cấu
> hình ngẫu nhiên) nhưng vẫn là *giả thuyết* cần chứng minh.

### Xuất TikZ

*Tệp › Xuất TikZ*: mã TikZ của hình (đang hiện trên màn hình; ở chế độ trình bày là tới khung hiện tại),
theo **bộ kiểu đang chọn**; nhãn đúng cú pháp LaTeX (`$I_A$`, `$X_{AB}$`, `$B'$`). Bấm *Sao chép* rồi dán vào
LaTeX. Chỉ cần `\usepackage{tikz}`. Đổi kích thước bằng cách sửa `x=…, y=…` ở dòng `\begin{tikzpicture}`.

### Phím tắt

| Phím | Tác dụng |
|---|---|
| `Ctrl+Z` / `Ctrl+Y` | Hoàn tác / làm lại |
| gõ chữ / `F2` | Đặt tên điểm đang chọn (vd điểm vừa dựng) |
| `Home` | Thu phóng vừa hình |
| `Delete` | Xoá đối tượng đang chọn |
| `Esc` | Huỷ thao tác / bỏ chọn / thoát trình chiếu |
| `Enter` | Kết thúc miền đa giác |
| `Ctrl+S` / `Ctrl+O` | Lưu / mở tệp |
| `←` `→` `PageUp` `PageDown` `Home` `End` | Chuyển khung khi trình bày |

## 3. Cấu trúc mã nguồn

```
index.html            trang chính (mở trực tiếp được)
dist/app.js           giao diện đã đóng gói (sinh bằng `npm run build`, CÓ commit để chạy không cần build)
src/core/             LÕI hình học thuần JS: bước dựng, tính toạ độ (cả tính lại từng phần khi kéo), mô hình JSON,
                      tên/nhãn, bộ kiểu, công cụ tự tạo (macro.js), chạy công cụ ngoài giao diện (apply.js)
src/explore/          BỘ KHÁM PHÁ thuần JS
src/export/tikz.js    xuất TikZ
src/io/codec.js       mã hoá hình vào URL
src/ui/               GIAO DIỆN: view.js + render.js (bộ vẽ canvas), tools.js (công cụ cơ bản),
                      library.js (menu Công cụ), app.js, panels.js…
src/core/thu-vien.js  mục lục thư viện ví dụ (tự sinh, nhập các tệp examples/thu-vien/*.json)
scripts/              công cụ dòng lệnh: kham-pha.mjs, tikz.mjs
lab/                  PHÒNG THÍ NGHIỆM Python (vòng khám phá tự chạy, cầu nối Newclid, báo cáo) – lab/HUONG_DAN.md
reports/              báo cáo HTML do phòng thí nghiệm sinh ra (không đưa lên git), trừ reports/dung-thu.html
                      (kết quả dùng thử bản 1.2: ảnh từng bài, số thao tác, vấn đề và đã sửa chưa)
examples/             hình mẫu dạng JSON; examples/thu-vien/: thư viện ví dụ (menu Ví dụ)
tests/                test lõi, khám phá, TikZ, từng công cụ trong menu, công cụ tự tạo (node --test);
                      test trình duyệt và test hiệu năng (Playwright);
                      tests/browser/dung-thu/: "người dùng ảo" dựng 23 bài qua giao diện (bản 1.2)
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

```bash
npm run test:perf      # đo hiệu năng kéo điểm trên hình dày (CPU thật và giả lập chậm ×4), có ngưỡng
```

```bash
node tests/browser/dung-thu/chay.mjs --luu   # dùng thử: dựng lại 23 bài qua giao diện, ghi thư viện ví dụ
```

```bash
node tests/browser/dung-thu/bao-cao.mjs      # sinh reports/dung-thu.html từ kết quả dùng thử
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

## 5. Thư viện bên ngoài

Từ bản 1.1 trang không dùng thư viện bên ngoài nào khi chạy (bộ vẽ canvas tự viết). Khi phát triển chỉ cần
`esbuild` để đóng gói.
