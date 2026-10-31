# Báo cáo – Hình học động, bản 1

## 1. Đã làm được

Đã làm đủ 5 mốc, mỗi mốc một commit riêng, cộng thêm một commit hoàn thiện.

| Mốc | Nội dung |
|---|---|
| 1 | Lõi hình học thuần JS, mô hình "danh sách bước dựng" JSON, toàn bộ công cụ dựng hình, kéo thả, hoàn tác/làm lại, xoá kéo theo phụ thuộc (có cảnh báo), đổi tên, kéo nhãn, lưới + bắt điểm |
| 2 | Tua bước (khung trình bày, gộp khung, ẩn/hiện), đánh dấu (cung góc 1–3 cung, ô vuông góc vuông, vạch đoạn 1–3 vạch, tô miền, tô nền đường tròn, màu, nét đứt, độ dày), chế độ trình chiếu |
| 3 | Link chia sẻ chứa toàn bộ hình (nén deflate + base64url), lưu/mở tệp JSON, tự lưu nháp (localStorage, bọc try/catch) |
| 4 | Bộ khám phá bằng số: lấy mẫu ngẫu nhiên, loại cấu hình suy biến, loại quan hệ hiển nhiên, xếp hạng, tô sáng kết quả |
| 5 | Xuất TikZ sạch, giữ màu và đánh dấu, biên dịch được bằng pdflatex |

**Công cụ dựng hình**: điểm tự do; điểm trên đường thẳng/đoạn/tia/đường tròn; giao điểm (bấm thẳng vào
chỗ cắt hoặc chọn hai đường) và "giao điểm thứ hai khác điểm đã có"; trung điểm; đường thẳng, đoạn, tia;
đường vuông góc, song song, trung trực, phân giác trong/ngoài; đường tròn tâm + điểm, compa, qua 3 điểm;
đối xứng tâm/trục (cho điểm, đường thẳng, đường tròn); hình chiếu. Nhóm tam giác: tam giác, O, H, I, G,
tâm Euler N, đường tròn ngoại tiếp/nội tiếp/Euler, chân đường cao, tiếp điểm nội tiếp, điểm chính giữa
cung BC (chứa A / không chứa A).

**Tiện ích thêm** (nhỏ, không làm chậm các mốc): menu ví dụ (Euler, 9 điểm, Simson, Miquel), lưới + bắt
điểm, *Vừa khung*, zoom/dời hình, nhãn tự đặt tránh đè lên đường (dùng chung cho màn hình và TikZ),
chỉ số dưới cho nhãn (A1 → A₁), nút "đổi sang giao điểm còn lại", công cụ dòng lệnh
`scripts/kham-pha.mjs` và `scripts/tikz.mjs` (làm sẵn cầu nối cho vòng lặp Python sau này),
workflow GitHub Actions chạy test.

**Kiểm thử**

* `npm test` – 22 test (Node, `node --test`):
  * lõi: các điểm đặc biệt, đường tròn 9 điểm, điểm chính giữa cung, giao điểm/hình chiếu/đối xứng/phân giác,
    **giao điểm biến thiên liên tục** khi kéo tâm đường tròn đi trọn một vòng (400 bước, không bước nào nhảy nghiệm),
    xoá kéo theo, khung trình bày, kiểm tra hợp lệ, suy biến cho null thay vì NaN;
  * bộ khám phá **tự tìm ra**: đường thẳng Euler (O, G, H thẳng hàng, xếp đầu), đường tròn Euler (6 điểm còn lại
    nằm trên đường tròn qua 3 trung điểm, xếp đầu, ghi chú "là đường tròn Euler tam giác ABC"), đường thẳng
    Simson, điểm Miquel (cả hai dạng: M dựng sẵn nằm trên đường tròn thứ ba; và ba đường tròn đồng quy khi
    chưa dựng M), định lý Feuerbach trên hình ~30 điểm (xếp đầu), đường trung bình song song, ba đường cao
    đồng quy; hình "ngẫu nhiên" **không** báo quan hệ nào; các quan hệ hiển nhiên (A, H, chân đường cao
    thẳng hàng; tiếp điểm nằm trên đường tròn nội tiếp; …) **không** bị báo;
  * mã hoá/giải mã URL, TikZ (nội dung + biên dịch thật bằng pdflatex nếu máy có), công cụ dòng lệnh.
* `npm run test:browser` – thao tác như người dùng trên Chromium headless qua cả 5 mốc (dựng tam giác bằng
  chuột, kéo điểm, hoàn tác, xoá có cảnh báo, đổi tên, kéo nhãn, đánh dấu, tua khung, trình chiếu, link chia
  sẻ mở ở tab mới, tải/mở tệp, khôi phục nháp, khám phá + tô sáng, xuất TikZ, điểm trên đường tròn bị ràng
  buộc khi kéo…), chụp màn hình từng bước. Tôi đã xem lại các ảnh chụp sau mỗi mốc.

## 2. Chưa làm / ngoài phạm vi bản 1

* Vòng lặp khám phá tự chạy qua đêm bằng Python và cầu nối Newclid/AlphaGeometry: **chưa làm** (theo yêu cầu,
  để sau). Đã chuẩn bị: định dạng JSON có đặc tả + bảng gợi ý dịch (`docs/DINH_DANG_JSON.md`), công cụ dòng
  lệnh trả kết quả khám phá dạng JSON.
* Bộ khám phá chưa tìm: hai đoạn bằng nhau, hai góc bằng nhau, tỉ số, điểm "đẳng giác"… (không nằm trong yêu cầu).
* Chưa có: ô chữ/ghi chú trên hình, đo độ dài/góc, vết (trace), tâm bàng tiếp, tiếp tuyến, sắp xếp lại thứ tự
  bước khi trình bày (khung luôn theo thứ tự dựng).
* Nhãn của đường thẳng/đường tròn chưa kéo được (chỉ nhãn điểm).
* Chưa thử trên máy tính bảng thật (đã dùng Pointer Events nên chạm/kéo về nguyên tắc hoạt động).

## 3. Lỗi / hạn chế đã biết

* **Giao điểm dùng đường mang** của đoạn/tia: đoạn AB vẫn "cắt" đường tròn ở ngoài đoạn (giống GeoGebra,
  khác Sketchpad).
* **Chọn nghiệm theo thứ tự chuẩn** (xem mục 4): liên tục khi kéo, nhưng nếu kéo một điểm vượt qua điểm còn
  lại của chính đường thẳng đó (đổi chiều vectơ chỉ phương – một cấu hình suy biến) thì giao điểm đánh số theo
  chỉ số sẽ đổi sang nghiệm kia. Trường hợp hay gặp nhất (giao điểm thứ hai của đường qua A với đường tròn qua A)
  đã dùng "giao điểm khác A" nên không bị.
* **Khám phá là kiểm tra bằng số, không phải chứng minh.** Bộ lọc "hiển nhiên" chỉ dùng vài luật suy diễn đơn
  giản; một số quan hệ "gần như hiển nhiên" vẫn có thể được báo (vd IT ⊥ BC khi T là tiếp điểm), và các quan hệ
  quen thuộc nhưng không suy ra trực tiếp từ cách dựng (vd A, H, E, F đồng viên) được báo – đó là chủ ý.
* Quan hệ chỉ đúng trên một cung/một miền (phụ thuộc thứ tự điểm) có thể bị bỏ sót nếu mẫu ngẫu nhiên đi ra
  ngoài miền đó (điểm trên đường tròn chỉ xê dịch ±0,9 rad để hạn chế điều này).
* Bộ khám phá chạy trên luồng chính; hình trên ~90 điểm chỉ xét 90 điểm đầu (hình 30 điểm mất ~0,1 s).
* Link chia sẻ của hình rất lớn có thể dài vài nghìn ký tự (vẫn ổn với Zalo/Messenger/email); link tạo khi mở
  trang từ tệp trên máy (`file://`) chỉ dùng được trên máy đó.
* Lịch sử hoàn tác không được lưu khi tải lại trang (bản nháp thì có).
* Trên Chrome headless, tên tệp tải về có dấu bị bỏ qua nên tên tệp được chuyển thành không dấu
  (`Duong-thang-Euler.json`).
* Trong TikZ, màu mặc định của điểm tự do (đỏ trên màn hình) không xuất – điểm in ra màu đen, trừ khi đã đổi
  màu điểm.

## 4. Các quyết định thiết kế quan trọng và lý do

1. **JSXGraph chỉ dùng để vẽ (và pan/zoom)**; toạ độ do lõi tự tính. Lõi phải thuần JS để test bằng Node, dùng
   lại cho bộ khám phá, TikZ, dòng lệnh, và sau này dịch sang Python. Nếu để JSXGraph tự tính (glider,
   intersection của JSXGraph) thì sẽ có hai nguồn sự thật và không kiểm soát được việc chọn nghiệm. Chuột/chạm
   được bắt ở pha capture để tự xử lý chọn đối tượng và kéo điểm; bấm vào nền thì để JSXGraph dời hình.
2. **Mỗi bước sinh đúng một đối tượng**, tham chiếu bằng `id` bất biến (đổi tên không ảnh hưởng). Công cụ tạo
   nhiều đối tượng (tam giác, chân đường cao + đoạn) thêm nhiều bước gộp chung một khung.
3. **Chọn nghiệm giao điểm theo thứ tự chuẩn**, không theo "gần vị trí cũ": đường thẳng–đường tròn theo chiều
   vectơ chỉ phương; đường tròn–đường tròn theo phía trái/phải của hướng tâm₁→tâm₂. Thứ tự này là hàm liên
   tục của dữ liệu trên miền không suy biến ⇒ kéo hình không nhảy nghiệm, và *quan trọng hơn*: cùng một JSON
   luôn cho cùng một hình (tái lập được khi mở link, khi bộ khám phá lấy mẫu, khi dịch sang Python). Cách
   "bám nghiệm gần nhất" phụ thuộc lịch sử kéo nên không tái lập được. Bổ sung `intersection_other`
   (giao điểm khác Q) cho trường hợp phổ biến nhất trong toán Olympic, và công cụ tự dùng nó khi một giao điểm
   đã có sẵn.
4. **Điểm chính giữa cung** dựng trực tiếp từ tâm ngoại tiếp và pháp tuyến của BC, chọn phía theo vị trí của A,
   thay vì "giao của phân giác với đường tròn" – không có nhánh nghiệm nào để nhảy.
5. **Bộ khám phá** (`src/explore/`):
   * 12 mẫu ngẫu nhiên hợp lệ + cấu hình gốc, hạt giống cố định (kết quả tái lập được), tối đa 150 lần thử.
   * Điểm tự do xê dịch trong bán kính 30% kích thước hình; điểm trên đối tượng xê dịch tham số (đường tròn
     ±0,9 rad, đoạn trong [0,08; 0,92]).
   * Loại mẫu suy biến: đối tượng không xác định; hai điểm gần nhau hơn 1,2% kích thước hình *và* co lại còn
     < 30% so với hình gốc; tam giác có góc < 4°; đường tròn bán kính > 25 lần kích thước hình; giao điểm sắp
     tiếp xúc; hai đường gần song song.
   * Dung sai **tương đối** 10⁻⁶ × kích thước hình (đường chéo khung bao các điểm) cho mọi phép thử.
   * Loại quan hệ hiển nhiên bằng một "cơ sở tri thức" nhỏ: mỗi loại bước khai báo các sự kiện nó kéo theo
     (liên thuộc, thẳng hàng, vuông góc, song song, tiếp xúc), rồi áp dụng 4 luật đến khi ổn định (hai đường
     chung 2 điểm thì trùng; cùng phương và chung 1 điểm thì trùng; cùng vuông góc với một đường thì song
     song; hai đường tròn chung 3 điểm thì trùng).
   * Gộp thành tập tối đại (5 điểm đồng viên báo một lần); điểm nằm trên đường tròn/đường thẳng **đã dựng**
     được báo dạng "D, E, F … nằm trên (ω)" thay cho đồng viên/thẳng hàng; đồng quy chỉ báo khi chưa có điểm
     dựng sẵn ở chỗ đồng quy.
   * Xếp hạng = điểm cơ bản theo loại quan hệ (tiếp xúc 6; đồng viên/thẳng hàng/đồng quy/điểm trên đường tròn 5;
     điểm trên đường thẳng 3,5; song song/vuông góc 3) + tối đa 7 điểm cho các đối tượng đặc biệt (đường tròn
     ngoại/nội tiếp/Euler, O, I, H: 3; G, N: 2). Đối tượng đặc biệt được **nhận diện bằng số** trên các tam giác
     có trong hình, nên dựng tay (vd đường tròn qua 3 trung điểm) vẫn được ưu tiên.
6. **Định dạng URL**: JSON gọn → `deflate-raw` (CompressionStream có sẵn trong trình duyệt và Node) → base64url,
   đặt sau `#h=` (phần hash không gửi lên máy chủ). Có dạng dự phòng không nén.
7. **Đóng gói**: mã nguồn viết bằng ES module (test trực tiếp bằng Node), đóng gói bằng esbuild thành
   `dist/app.js` dạng IIFE và **commit luôn** – nhờ vậy nháy đúp `index.html` từ ổ đĩa vẫn chạy (Chrome chặn ES
   module trên `file://`) và GitHub Pages không cần bước build. Workflow CI kiểm tra `dist/` khớp mã nguồn.
8. **Hoàn tác bằng ảnh chụp toàn bộ JSON** (tối đa 200 bước): đơn giản, chắc chắn đúng, hình chỉ vài KB.
9. **Khung trình bày** = các bước liên tiếp, đánh dấu bằng cờ `joinPrev`; bước ẩn tự nhập vào khung kế tiếp.
   Đơn giản hơn một danh sách khung riêng, và luôn nhất quán khi thêm/xoá bước.
10. **TikZ** không dùng `scale` mà dùng `x=…cm, y=…cm` để chấm điểm (pt) và nhãn giữ nguyên cỡ khi đổi kích
    thước; không cần thư viện TikZ nào ngoài gói `tikz`; cung góc/vạch đoạn tính sẵn bằng số.

## 5. Gợi ý bước tiếp theo

1. **Cầu nối Python**: viết `hinh_hoc_dong.py` đọc JSON, tính toạ độ (dịch `src/core/geom.js` + `steps.js`,
   ~400 dòng) hoặc gọi `node scripts/kham-pha.mjs`; thêm bộ dịch sang DSL Newclid/AlphaGeometry theo bảng
   trong `docs/DINH_DANG_JSON.md`, dùng `relations[]` làm mục tiêu chứng minh và ghi độ sâu chứng minh.
2. **Vòng lặp khám phá qua đêm**: sinh ngẫu nhiên các chuỗi bước dựng (từ một tam giác, áp các phép dựng),
   chạy bộ khám phá, lọc quan hệ có điểm cao, chấm độ sâu bằng Newclid, lưu các hình "đẹp" dạng JSON để mở
   thẳng trong giao diện.
3. Mở rộng bộ khám phá: đoạn bằng nhau, góc bằng nhau, tỉ số, điểm trên đường tròn đặc biệt chưa dựng; chạy
   trong Web Worker cho hình lớn; tham số hoá số mẫu/dung sai trên giao diện.
4. Thêm phép dựng: tâm bàng tiếp, tiếp tuyến, giao điểm thứ hai của đường tròn với đường tròn qua 2 điểm đã
   biết, phép vị tự/quay, điểm đẳng giác, ô chữ ghi chú, đo góc/độ dài.
5. Trình bày: cho phép xếp lại thứ tự khung độc lập với thứ tự dựng; hiệu ứng làm nổi đối tượng mới xuất hiện.
6. Thử trên máy chiếu/máy tính bảng thật và tinh chỉnh cỡ nét/chữ theo phản hồi.

---

# Bản 1.1 – Hiệu năng, phong cách, thư viện công cụ

## A. Hiệu năng kéo điểm

**Hình đo** (`Ví dụ → Hình dày`, mô phỏng hình đề VMO): 28 điểm, 42 đường thẳng/đoạn, 5 đường tròn
(+ 6 đối tượng ẩn). Đo bằng `npm run test:perf` (`tests/browser/perf.mjs`): Chromium headless, khung
1366×768, nhấn chuột vào A rồi kéo 120 lần theo một vòng, sau mỗi lần chờ trình duyệt vẽ xong. Thời gian
luồng chính lấy từ Chrome DevTools Protocol (`Performance.getMetrics`). "CPU ×4" là chế độ giả lập CPU chậm
hơn 4 lần, gần với laptop phổ thông/cũ.

**Đo trước khi sửa (profiling)** – thủ phạm:

| | CPU ×1 | CPU ×4 |
|---|---|---|
| Luồng chính / khung | 15,3 ms | **75,0 ms** (≈ 13 khung/giây) |
| trong đó script | 4,6 ms | 27,5 ms |
| style + layout | 4,9 ms | 21,9 ms |
| p95 khoảng cách giữa hai khung | 16,8 ms | 83,3 ms |

CPU profile (×4, self time): `updateClipPath` của JSXGraph chiếm 22% toàn bộ thời gian (gần 2/3 thời gian
script), tiếp theo là `evalVisProp`, `setAttributeNS`, `updateText` – tức là việc cập nhật **cây SVG + nhãn
HTML của JSXGraph** ở mỗi khung (mỗi đường thẳng là 3 phần tử, nhãn là thẻ HTML gây tính lại style/layout).
Phần tính toán hình học của lõi gần như không đáng kể.

**Đã sửa:**
1. Thay JSXGraph bằng **bộ vẽ canvas tự viết** (`src/ui/view.js`, `src/ui/render.js`): một canvas, độ phân
   giải theo `devicePixelRatio`, tự dời/phóng (kéo nền, lăn chuột, chụm hai ngón). Lõi hình học không đổi.
   Bỏ `vendor/jsxgraph` (trang nhẹ hơn ~1 MB).
2. **Chỉ tính lại các bước phụ thuộc** vào điểm đang kéo (`makeUpdater` trong `src/core/model.js`, lập kế
   hoạch một lần khi nhấn chuột; test đối chiếu với tính lại toàn bộ).
3. **Gom cập nhật theo `requestAnimationFrame`**: sự kiện chuột chỉ ghi vị trí; tính lại + vẽ tối đa một lần
   mỗi khung. Di chuột (không kéo) cũng được gom theo khung.
4. Việc nặng chỉ làm khi thả chuột: ghi lịch sử hoàn tác, tính hướng nhãn tự động, vẽ lại danh sách bước,
   lưu nháp (có debounce), báo kết quả khám phá cũ. Đo chữ nhãn (`measureText`) được lưu đệm.

**Sau khi sửa:**

| | CPU ×1 | CPU ×4 |
|---|---|---|
| Luồng chính / khung | **4,3 ms** | **16–18 ms** |
| trong đó script (tính lại + vẽ) | 0,5 ms | 2,1 ms |
| style + layout | 0 | 0 |
| một lần vẽ toàn bộ hình (JS) | 0,2 ms | 0,5 ms |
| p95 khoảng cách giữa hai khung | 16,7 ms | **16,7 ms** (đủ 60 khung/giây) |

Thí nghiệm tách chi phí: tắt hẳn việc vẽ thì vòng đo vẫn tốn ~7,8 ms/khung ở ×4 – đó là chi phí Playwright bơm
sự kiện chuột qua DevTools, không có khi dùng chuột thật. Phần còn lại chủ yếu là rasterize canvas bằng phần
mềm (headless không có GPU); trên laptop thật canvas được GPU tăng tốc. Ngưỡng tự kiểm trong
`npm run test:perf`: p95 khoảng cách khung ≤ 25 ms ở ×4, JS mỗi khung < 6 ms ở ×4, một lần vẽ < 3 ms ở ×4,
luồng chính < 8 ms ở ×1.

## B. Phong cách (giống hình mẫu Sketchpad, không sao chép giao diện/biểu tượng)

* **Bộ kiểu "Đơn sắc" (mặc định)**: mọi đối tượng màu đen, nét 1px đều nhau (canvas khử răng cưa), điểm là
  vòng tròn nhỏ ruột trắng viền đen, nền trắng, tắt lưới. Nhãn serif nghiêng (Times/LaTeX), vẽ trực tiếp có
  **chỉ số dưới** và **dấu phẩy**: gõ `I_C`, `X_A`, `X_{AB}`, `B'`, `A'_1` hiển thị đúng như công thức; `A1` vẫn tự
  thành A₁. Nhãn đặt sát điểm (11 px) theo hướng tránh các đường đi qua điểm.
* **Bộ kiểu "Sách giáo khoa"**: màu dịu (đường tròn ngoại tiếp xanh, nội tiếp xanh lá, Euler tím, điểm kéo được
  tô đỏ/cam), nét 1,4px. Chuyển qua lại ở menu *Hiển thị*; lựa chọn được nhớ trong trình duyệt. Màu đặt riêng
  cho từng đối tượng luôn được giữ ở cả hai bộ.
* **Giao diện tối giản**: thanh menu mỏng (*Tệp / Sửa / Hiển thị*) + vài nút biểu tượng; **thanh công cụ dọc
  bằng biểu tượng SVG tự vẽ** ở bên trái, mỗi biểu tượng là một nhóm, bấm vào là mở danh sách công cụ của nhóm;
  bảng các bước dựng **ẩn mặc định** (nút ◫ để mở), thuộc tính đối tượng hiện thành thẻ nổi nhỏ khi đang chọn;
  gợi ý thao tác ở thanh trạng thái dưới đáy. Gần như toàn màn hình dành cho bảng vẽ.
* **TikZ theo bộ kiểu đang chọn**: Đơn sắc → `line width=0.4pt`, điểm `\filldraw[fill=white]`, không định nghĩa
  màu; Sách giáo khoa → màu dịu (`\definecolor`), điểm tô màu. Nhãn xuất đúng cú pháp LaTeX (`$I_C$`,
  `$X_{AB}$`, `$B'$`, `$A'_1$`), tên toạ độ được làm sạch (`I_C` → `(IC)`, `B'` → `(Bp)`). Tâm đường tròn dùng
  tên điểm nếu có.
* Mọi công cụ vẽ đường tròn (qua 3 điểm, ngoại tiếp, nội tiếp, Euler, …) **dựng kèm tâm** (bước `center`);
  nếu tâm đã có sẵn (vd đã dựng O trước) thì không dựng thêm điểm trùng.

## C. Thư viện công cụ (menu "Công cụ")

Menu **Công cụ** (biểu tượng cuối của thanh công cụ dọc) có đúng các nhóm và mục như thư mục công cụ của thầy/cô:

* **1. Dựng hình** (15): tam giác, tam giác vuông, vuông cân, đều, hình thang, thang cân, bình hành, chữ nhật,
  thoi, vuông, tứ giác điều hoà, đường tròn tiếp xúc AB tại A và qua C, tam giác Cevian, tứ giác, tứ giác nội tiếp.
  Các hình có bậc tự do (tam giác vuông, hình thang, chữ nhật, thoi, tứ giác nội tiếp) dựng đỉnh cuối là điểm
  ràng buộc kéo được, giữ đúng tính chất khi kéo.
* **2. Đường đặc biệt** (14): đường cao, trung tuyến, trung trực, đẳng giác, đối trung, phân giác ngoài, phân giác
  trong và ngoài, tiếp tuyến tại một điểm, giao điểm của hai tiếp tuyến, tiếp tuyến kẻ từ một điểm, tiếp tuyến
  chung (dựng mọi tiếp tuyến chung đang tồn tại), đường thẳng Euler, Simson, Steiner.
* **3. Đường tròn** (11): ngoại tiếp, pedal, pedal chi tiết, nội tiếp, bàng tiếp, đường kính, mixtilinear nội,
  mixtilinear ngoại, trục đẳng phương, tâm đẳng phương, đường tròn Euler – tất cả dựng kèm tâm.
* **4. Điểm đặc biệt** (11 + 7 bổ sung): trọng tâm (và chi tiết), trực tâm (và chi tiết), liên hợp đẳng giác,
  Lemoine, chân đường vuông góc hạ xuống ba cạnh, tâm vị tự ngoài, tâm vị tự trong, Kosnita, tâm Euler; bổ sung
  tâm ngoại tiếp, nội tiếp, bàng tiếp, tiếp điểm nội tiếp, hai điểm chính giữa cung, chân đường cao.
* **5. Phép biến hình** (tự bổ sung, 7): đối xứng tâm, đối xứng trục, quay (góc nhập ở thẻ tuỳ chọn), vị tự
  (tỉ số nhập ở thẻ tuỳ chọn), tịnh tiến, nghịch đảo (điểm), chiếu vuông góc. Quay/vị tự/tịnh tiến/đối xứng áp
  được cho điểm, đường thẳng và đường tròn.
* **6. Mô hình** (tự bổ sung, 6): tam giác với tâm nội tiếp – bàng tiếp (giống hình mẫu), đường thẳng và đường
  tròn Euler, tam giác orthic, tam giác trung bình, điểm Miquel, đường tròn mixtilinear và tâm nội tiếp.
* **7. Công cụ của tôi**: **tự tạo công cụ** từ hình đã dựng (giống *Create New Tool*) – chọn kết quả (và nếu
  muốn, đầu vào), đặt tên, dùng lại như mọi công cụ; lưu trong trình duyệt, xuất/nhập ra tệp JSON, xoá.

Bản **chi tiết** giữ các đường dựng phụ (nét đứt xám), bản thường ẩn chúng. Công cụ tự dùng lại điểm đã có
(vd đã có O thì "Đường tròn ngoại tiếp" không tạo O thứ hai) – có test kiểm tra không tạo điểm trùng.

**Kiểm thử theo định nghĩa toán học** (`tests/library.test.mjs`, 73 test): mỗi công cụ được chạy bằng Node trên
một hình mẫu rồi đối chiếu định nghĩa ở cấu hình gốc **và 4 cấu hình xê dịch ngẫu nhiên**, ví dụ: Lemoine là
liên hợp đẳng giác của trọng tâm và nằm trên đường đối trung; chân Simson của điểm trên (O) thẳng hàng; đường
Steiner qua trực tâm; Kosnita là điểm đồng quy của A–tâm(BOC)…; tứ giác điều hoà có AB·CD = BC·DA; mixtilinear
tiếp xúc AB, AC và tiếp xúc trong/ngoài với (O); tiếp tuyến chung tiếp xúc cả hai đường tròn; định lý Ceva cho
tam giác Cevian; liên hợp đẳng giác hai lần trở về P… Có một test bắt buộc **mọi** công cụ trong menu phải có bài
kiểm tra. Đã thử làm sai cố ý 4 công thức (Lemoine, tiếp tuyến chung, mixtilinear, phép quay): test đều phát hiện.
Công cụ tự tạo có test riêng (`tests/macro.test.mjs`).

## D. Tổng kết bản 1.1

**Kiểm thử**: `npm test` 100 test (Node) đều đạt; `npm run test:browser` đạt toàn bộ (thêm kiểm tra menu Công cụ,
công cụ có tham số, tự tạo công cụ); `npm run test:perf` đạt ngưỡng. Ảnh tự kiểm tra được chụp sau mỗi phần
(hình dày kiểu đề VMO ở bộ Đơn sắc, menu Công cụ nhiều tầng, mô hình tâm bàng tiếp, bộ Sách giáo khoa…).

**Quyết định thiết kế bổ sung**
1. **Bỏ JSXGraph, tự viết bộ vẽ canvas** (thay cho quyết định 4.1 ở bản 1): đo được JSXGraph là nút thắt; canvas
   cho toàn quyền về phong cách (điểm rỗng, nhãn công thức) và nhẹ hơn ~1 MB. Lõi hình học không đổi.
2. **Bộ kiểu là sở thích của người xem** (lưu trong trình duyệt), không lưu trong tệp hình: cùng một tệp/link mở
   ra theo bộ kiểu người xem chọn; màu đặt riêng cho từng đối tượng vẫn nằm trong tệp.
3. **Công cụ = hàm sinh danh sách bước dựng** (`make`), không phải bước dựng "hộp đen": tệp hình vẫn chỉ gồm các
   bước cơ bản nên dịch sang Python/Newclid dễ, và mọi công cụ dùng chung bộ máy kéo thả/khám phá/TikZ.
4. **Công cụ tự tạo lưu dạng JSON thuần** (`in:k` / `st:j`), không chứa toạ độ; dịch/chia sẻ được.
5. Hình có bậc tự do (tam giác vuông…) dựng đỉnh cuối là **điểm ràng buộc** thay vì hỏi thêm một lần bấm: nhanh
   hơn, và kéo đỉnh đó vẫn giữ tính chất.

**Hạn chế / lỗi đã biết (bản 1.1)**
* Phép nghịch đảo hiện chỉ áp cho điểm (ảnh của đường thẳng/đường tròn qua nghịch đảo đổi loại đối tượng – để sau).
* Góc quay/tỉ số vị tự là hằng số nhập trước khi dựng (chưa lấy theo một góc/tỉ số đo trên hình); sửa sau được
  bằng cách xoá và dựng lại.
* Nhãn tự đặt tránh đường đi qua điểm và điểm gần đó, nhưng hai điểm rất gần nhau (vd O và I gần trùng) vẫn có
  thể chồng nhãn – kéo nhãn để chỉnh.
* Số liệu hiệu năng đo trên Chromium headless (không GPU); máy thật thường nhanh hơn ở khâu vẽ.
* Ngoài nhóm 5 và 6 (tự bổ sung theo lời dặn), bộ công cụ bám đúng danh sách menu trong ảnh; nhóm "Example Tools"
  của Sketchpad không làm.

**Gợi ý tiếp theo**: góc/tỉ số động cho quay và vị tự; nghịch đảo đường thẳng/đường tròn; thêm vài mô hình hay
gặp ở VMO (cấu hình tứ giác toàn phần, đường tròn Apollonius…); cho phép gán phím tắt cho công cụ hay dùng; lưu
"Công cụ của tôi" kèm trong tệp hình khi chia sẻ.

---

# Bản 2 – Phòng thí nghiệm tự chạy (Python, `lab/`)

Vòng lặp khám phá chạy nhiều giờ trên máy cá nhân, tìm các sự kiện hình học "lạ" để chế đề, thử chứng minh bằng
Newclid, sáng hôm sau có báo cáo HTML để duyệt. Viết bằng Python trong `lab/`, dùng **đúng định dạng JSON danh sách
bước dựng** của công cụ web. **Không sửa phần web hiện có** (chỉ thêm một job Python vào `.github/workflows/test.yml`
và vài dòng giới thiệu trong `README.md`).

Hướng dẫn cài đặt và sử dụng cho Windows (tiếng Việt, cho người không rành Python): **`lab/HUONG_DAN.md`**.
Ngắn gọn: bấm đúp `lab\cai-dat.bat` (một lần), `lab\chay-7-tieng.bat` (buổi tối), `lab\xem-bao-cao.bat` (buổi sáng);
hoặc `python -m lab chay --gio 7` và `python -m lab bao-cao`.

## 1. Đã làm

Làm theo mốc, mỗi mốc một commit trên nhánh riêng.

| Mốc | Nội dung |
|---|---|
| 1 | **Lõi tính toán Python** `lab/core` (geom, steps, model, codec): mọi loại bước của công cụ, kể cả các bước do thư viện công cụ sinh ra. **Test đối chiếu với lõi JS**: script Node `lab/tools/xuat-doi-chieu.mjs` chạy các hình mẫu và **mọi công cụ trong menu Công cụ** (85 hình × 4 cấu hình, > 3000 giá trị) → Python khớp tới 1e-9. Mã hoá link `#h=` giống hệt (deflate-raw + base64url), test giải mã link Python bằng chính `codec.js`. |
| 2 | **Bộ quét quan hệ** `lab/scan`: bản Python của `explorer.js` + `knowledge.js` (cùng bộ sinh số ngẫu nhiên mulberry32, cùng ngưỡng suy biến) → **cho kết quả giống hệt bản JS** trên mọi hình mẫu (kể cả 67 quan hệ của hình dày). |
| 3 | **Vòng mở rộng** `lab/search`: cấu hình gốc (tam giác ABC, O, H, I, G, N, chân đường cao D, E, F, trung điểm M_a, M_b, M_c, tiếp điểm T_a, T_b, T_c, điểm chính giữa cung S_a… (không chứa đỉnh) và S'_a… (chứa đỉnh), (O), (I), đường tròn Euler, ba cạnh); "vũ trụ đối tượng" tính đồng thời trên 16 tam giác mẫu bằng numpy; mở rộng theo **lớp độ sâu** (tìm theo chiều rộng, giới hạn độ sâu 3 và 6 bước mới), trong mỗi lớp **ưu tiên** hướng triển vọng; gộp điểm trùng; "trạm" cho vòng sau. |
| 4 | **Cầu nối Newclid** `lab/prover`: dịch hình + sự kiện sang JGEX với **toạ độ cố định của chính hình** (đúng nhánh nghiệm), chạy trong tiến trình con có giới hạn thời gian cứng, lưu vết chứng minh, chỗ cắm mô hình ngôn ngữ (`goi_y.py`). |
| 5 | **Chấm điểm "lạ"** `lab/score.py`, trọng số trong **`lab/cau-hinh.toml`**. |
| 6 | **Báo cáo** `lab/report.py` → `reports/<lần chạy>/index.html`: xếp hạng, phát biểu tiếng Việt, hình tĩnh, link mở thẳng trong công cụ web. |
| 7 | **Phản hồi** Hay/Chán → `lab/du-lieu/phan-hoi.json` → lần chạy sau tự chỉnh trọng số; `python -m lab chay --gio 7` (lưu định kỳ, chạy tiếp khi bị tắt), `python -m lab bao-cao`. |

### Vòng khám phá (thuật toán)

* **Vũ trụ**: mỗi đối tượng là một bước JSON đúng định dạng, được tính trên K = 16 tam giác mẫu "tổng quát" (không
  dẹt, không gần cân, không gần vuông, cùng chiều) – cố định theo hạt giống để kết quả tái lập được – cộng 6 **mẫu
  vân tay** (tam giác mẫu với các đỉnh đổi tên theo 6 hoán vị) dùng để nhận ra hai sự kiện chỉ khác nhau bởi cách gọi
  tên A, B, C (chỉ báo một lần).
* **Phép dựng mở rộng** (`operators.py`): trung điểm, chân đường vuông góc, đối xứng qua điểm/đường thẳng, tâm ngoại
  tiếp/trực tâm/tâm nội tiếp/trọng tâm của tam giác bất kỳ, liên hợp đẳng giác, giao hai đường thẳng, giao điểm thứ
  hai của đường thẳng với đường tròn, của hai đường tròn, điểm tuỳ ý trên cạnh/đường tròn, đường tròn qua 3 điểm,
  đường thẳng qua 2 điểm, tiếp tuyến, đường vuông góc/song song, đường tròn đường kính. Mọi bước là bước của công cụ
  → hình nào cũng mở được trong công cụ web.
* **Tìm theo lớp**: lớp d chỉ dùng phép dựng có ít nhất một đối số ở lớp d − 1. Ứng viên = liệt kê có cấu trúc
  (điểm tuỳ ý trên 3 cạnh và 3 đường tròn gốc; với các điểm nổi bật của lớp trước: chân đường vuông góc xuống ba
  cạnh, đối xứng qua ba cạnh, trung điểm/đối xứng với O, H, I…, giao lại với các đường tròn gốc; với các cặp điểm
  tuỳ ý: đường tròn qua một điểm gốc và hai điểm đó…) + lấy mẫu ngẫu nhiên theo trọng số. Trọng số đối tượng: O, H,
  I, (O), (I), đường tròn Euler cao nhất; điểm tuỳ ý ×5; đối tượng có mặt trong sự kiện vừa tìm được tăng dần; trạm
  ×2–3. Các loại phép dựng được **xen kẽ** để không loại nào lấn át; thời gian vòng chia cho các lớp (25/40/35%).
* **Dò quan hệ tăng dần** khi thêm đối tượng X (numpy, vài ms): X trùng điểm đã có (→ gộp; nếu không tầm thường thì
  thành sự kiện "trùng nhau"), X nằm trên đường thẳng/đường tròn đã dựng, X thẳng hàng với 2 điểm (sắp xếp theo góc
  nhìn từ X), X đồng viên với 3 điểm (nghịch đảo tâm X biến đường tròn qua X thành đường thẳng, rồi lại sắp theo góc),
  đường mới song song/vuông góc/tiếp xúc/đồng quy (giữ danh sách "giao điểm ảo" của các đường đã dựng, ghép nghiệm
  giữa các mẫu bằng cách loại nghiệm trùng điểm đã có).
* **Loại cấu hình gần suy biến**: đối tượng không xác định / quá xa / gần trùng (nhưng không trùng) điểm khác ở một
  mẫu nào đó / đường tròn bán kính bất thường / giao điểm gần tiếp xúc / hai đường gần song song đều bị bỏ.
* **Kiểm chứng**: mỗi ứng viên → khoá chuẩn (bất biến với cách dựng và cách gọi tên đỉnh) → bỏ nếu đã gặp → **tài
  liệu con tối thiểu** (bao đóng phụ thuộc) → lọc "hiển nhiên" → **bộ quét đầy đủ** trên 12 cấu hình ngẫu nhiên MỚI
  của tài liệu con (đúng thuật toán bản JS, loại suy biến) – chỉ giữ quan hệ có chứa đối tượng mới nhất.
* **Loại quan hệ hiển nhiên** (`KnowledgePlus`): luật của bản JS + Thales (hai góc vuông theo cách dựng nhìn cùng một
  đoạn → đồng viên), tâm ngoại tiếp tam giác vuông nằm trên cạnh huyền, IT ⊥ cạnh với T là tiếp điểm, đường trung
  bình, phép vị tự (trung điểm/đối xứng với cùng một tâm), và **các sự kiện đã tìm được** (vd khi đã biết O, G, H, N thẳng hàng thì điểm dựng từ hai điểm trên đường Euler không còn "mới").
* **Trạm**: đầu mỗi vòng, chọn ngẫu nhiên vài sự kiện điểm cao (ưu tiên sự kiện được khen); bước dựng ra đối tượng
  mới nhất của chúng được thêm vào cấu hình gốc của vòng (tính là lớp 0) → vòng sau đào sâu quanh chúng.

### Cầu nối Newclid

* Newclid **cài được** trong môi trường này. Dùng **Newclid 2.0.2** (thuần Python, chạy tốt trên Windows). Đã thử
  bản mới nhất 3.0.1: thiếu khai báo phụ thuộc `pyyaml`, phần thuần Python có lỗi (`enumerate_lconsts` lặp sai
  dict, `MappingMatcher` lỗi `KeyError: '1/2'`…), bản đầy đủ cần bộ máy C++ "yuclid" không có trong gói pip ⇒ không
  dùng được trên máy Windows thông thường.
* Dịch: đường thẳng ↦ hai điểm, đường tròn ↦ (tâm, một điểm); mỗi bước JSON ↦ phép dựng JGEX tương ứng (`foot`,
  `mirror`, `reflect`, `circle`, `orthocenter`, `incenter`, `on_line`/`on_circle` cho giao điểm, `on_tline`/`on_pline`,
  `on_aline` cho liên hợp đẳng giác…), **toạ độ cố định** `x@x_y` đủ 17 chữ số (Newclid kiểm tra số với dung sai
  tuyệt đối 1e-12) nên luôn đúng nhánh nghiệm của hình. N dịch đúng như lõi JS (trung điểm OH).
* Quan hệ nhiều điểm được **tách thành mục tiêu nguyên tử**, mỗi mục tiêu chỉ mang phần hình cần thiết (Newclid
  chậm đi rất nhiều khi thừa điểm); điểm trên đường tròn qua 3 điểm viết dạng `cyclic`.
* Kết quả: *chứng minh được* (tầm thường, hạ hạng), *một phần*, *không chứng minh được* / *hết giờ* (ứng viên sâu,
  tăng hạng), *chưa dịch được* (trung tính). Vết chứng minh lưu trong báo cáo.
* **Kiểm thử**: Newclid chứng minh được đúng các sự kiện mà vòng khám phá tìm ra: đường thẳng Euler (O, G, H, N),
  đường tròn Euler (D, E, F, M_a, M_b, M_c), đường thẳng Simson, ba đường tròn Miquel đồng quy – mỗi định lý 3–10 giây.
* Chỗ cắm mô hình ngôn ngữ: `lab/prover/goi_y.py` (lớp `Suggester`; đặt `goi_y_diem_phu` trong cấu hình). Với sự
  kiện chưa chứng minh được, các điểm phụ được gợi ý lần lượt thêm vào bài toán và chạy lại.

### Chấm điểm "lạ"

Điểm = Σ trọng số × đặc trưng (trọng số trong `[trong_so]` của `lab/cau-hinh.toml`):
loại quan hệ; kết quả Newclid (−4 nếu chứng minh được, +4 nếu không, +3 nếu hết giờ, +1,5 nếu một phần) cộng chút
theo độ dài chứng minh; **xa nhau trong cây dựng** (khoảng cách Jaccard trung bình giữa tập tổ tiên của các đối tượng);
**dính (O), (I), đường tròn Euler, O, I, H** (nhận diện bằng số, kể cả khi dựng bằng cách khác) và G, N; **ít bước
dựng**; trừ nhẹ cho điểm tuỳ ý và phát biểu dài. Báo cáo hiện từng thành phần điểm.

### Phản hồi

Nút Hay/Chán trong báo cáo → máy chủ nhỏ của `python -m lab bao-cao` (chỉ 127.0.0.1) ghi vào
`lab/du-lieu/phan-hoi.json` (mở báo cáo trực tiếp từ tệp thì lưu trong trình duyệt + nút "Tải phản hồi"). Lần chạy
sau: Δw = 0,15 × Σ(±1 × đặc trưng) (kẹp), sự kiện bị chê không lên báo cáo, sự kiện được khen ưu tiên làm trạm.

### Kiểm thử (`python -m unittest discover -s lab/tests -t .`)

* `test_doi_chieu_js` – lõi Python khớp lõi JS (mọi công cụ thư viện), link `#h=` hai chiều, giải mã bằng `codec.js`.
* `test_quet` – bộ quét Python cho kết quả giống hệt bộ khám phá JS; Simson, Euler.
* `test_kham_pha` – **vòng khám phá tự tìm lại** (không gợi ý): đường thẳng Euler và đường tròn Euler (ở lớp 0),
  trung điểm AH trên đường tròn Euler (lớp 1), đường thẳng Simson (~10 giây), ba đường tròn Miquel đồng quy (~40 giây);
  không báo quan hệ hiển nhiên kiểu "trung điểm nằm trên đoạn".
* `test_newclid` – dịch JGEX; **Newclid đánh giá Euler, đường tròn Euler, Simson, Miquel là chứng minh được (tầm thường)**
  (bỏ qua nếu máy chưa cài Newclid).
* `test_chay` – chạy 36 giây, giả lập bị tắt rồi **chạy tiếp đúng lần chạy dở**, sinh báo cáo có link giải mã được,
  học trọng số từ phản hồi.
* CI: thêm job "Phòng thí nghiệm (Python)" (Python 3.12 + Newclid 2.0.2) vào `.github/workflows/test.yml`.

### Kết quả chạy thử (máy phát triển Linux, 4 nhân, 2 tiến trình Newclid)

Lần chạy 20 phút (`python -m lab chay --phut 20`, sau các bản sửa): 17 vòng, 44 042 ứng viên quan hệ → 16 211 bị
loại vì hiển nhiên, 8 311 đã gặp, chỉ 336 không qua được kiểm chứng đầy đủ, **19 858 sự kiện** xác nhận (giữ 4 000
điểm cao nhất). Newclid kiểm 136 sự kiện điểm cao nhất (~7 sự kiện/phút): 55 tầm thường, 12 một phần, **63 ứng viên
sâu** (14 bão hoà không chứng minh được, 49 hết giờ), 6 lỗi/chưa dịch được. Vài sự kiện đứng đầu:

* Cho tam giác ABC nội tiếp (O), tâm nội tiếp I, S_b là điểm chính giữa cung CA không chứa B. Gọi P là trực tâm tam
  giác BOI. Chứng minh rằng O, I, S_b, P cùng nằm trên một đường tròn. *(Newclid: không chứng minh được)*
* … E là chân đường cao kẻ từ B, P là tâm nội tiếp tam giác BEO. Chứng minh B, I, S_b, P thẳng hàng. *(không chứng
  minh được – thực ra là "hai tâm nội tiếp cùng nằm trên một phân giác", xem hạn chế bên dưới)*
* … D chân đường cao từ A, M_c trung điểm AB, P là trực tâm tam giác HDM_c. Chứng minh A, H, M_c, P đồng viên.
* … P là trung điểm S_bI. Chứng minh O, I, M_b, P đồng viên.

Lần chạy liền 30 phút trước khi sửa lỗi trạm cũng chạy trọn không lỗi (18 vòng, Newclid kiểm 187 sự kiện).
Toàn bộ test (23 test) đạt: `python -m unittest discover -s lab/tests -t .` (~3 phút).

### Phong cách hình

Yêu cầu nói phong cách "Cổ điển" của công cụ; công cụ hiện có hai bộ kiểu *Đơn sắc* (mặc định, kiểu Sketchpad cổ
điển) và *Sách giáo khoa*. Tôi hiểu "Cổ điển" là bộ **Đơn sắc**: hình tĩnh trong báo cáo vẽ nét đen 1px, điểm tròn
rỗng ruột trắng (điểm trong kết luận tô đen), nhãn serif nghiêng có chỉ số dưới, hướng nhãn theo đúng thuật toán
`src/core/labels.js`; đường phụ minh hoạ quan hệ nét đứt xám. Hình hiển thị chọn trong vài tam giác mẫu cách đặt
mà các điểm tách nhau rõ nhất. Link trong báo cáo mở hình trong công cụ (bộ kiểu theo lựa chọn của người xem).

## 2. Chưa làm / ngoài phạm vi

* **Mô hình ngôn ngữ của AlphaGeometry**: chưa tích hợp (theo yêu cầu); đã để sẵn chỗ cắm `lab/prover/goi_y.py`
  (có một bộ gợi ý ví dụ "trung điểm" để thử cơ chế).
* Phép dựng mở rộng chưa có: phép quay/vị tự/nghịch đảo, tâm bàng tiếp, đường đối trung, tiếp tuyến chung, trục
  đẳng phương (lõi Python tính được hết, chỉ chưa đưa vào danh sách phép dựng của vòng khám phá). Bộ dịch Newclid
  cũng chưa dịch: quay, vị tự, tịnh tiến, nghịch đảo, Lemoine, Kosnita, đối trung, mixtilinear, tiếp tuyến chung,
  trục/tâm đẳng phương, đối xứng của đường thẳng/đường tròn (sự kiện chứa chúng được ghi "chưa dịch được").
* Chưa tìm các quan hệ: đoạn bằng nhau, góc bằng nhau, tỉ số (như bản JS).
* Chưa có giao diện xem tiến độ trong lúc chạy (chỉ cửa sổ dòng lệnh + báo cáo sinh lại mỗi 30 phút).
* Chưa chạy thật 7 tiếng trên Windows (môi trường phát triển là Linux); đã chạy liền 30 phút và nhiều lần ngắn, giả
  lập tắt giữa chừng rồi chạy tiếp. Mã chỉ dùng thư viện chuẩn + numpy, đường dẫn qua `os.path`, ghi tệp kiểu
  "ghi tạm rồi đổi tên" (`os.replace`, an toàn trên Windows), tiến trình con bằng `sys.executable`.

## 3. Lỗi / hạn chế đã biết

* **Kiểm chứng bằng số, không phải chứng minh** (như bản JS). Mỗi sự kiện đúng trên 16 tam giác mẫu của vũ trụ và
  12 cấu hình ngẫu nhiên mới của tài liệu con, dung sai 10⁻⁷–10⁻⁶ theo kích thước hình.
* **"Sâu" theo nghĩa của Newclid**: bộ suy diễn DDAR của Newclid 2.0.2 không có điểm phụ nên có những sự kiện quen
  thuộc nó không chứng minh được (vd trung điểm AH nằm trên đường tròn Euler – còn gặp lỗi nội bộ `TypeError` của
  Newclid; "I và tâm nội tiếp tam giác S'_aBC cùng nằm trên đường tròn qua B, C"; hai tâm nội tiếp cùng nằm trên một
  phân giác – do góc có hướng mod π). Các sự kiện này vẫn được xếp là "ứng viên sâu" → thầy/cô đánh "Chán" để hạ.
  Giới hạn 30 giây mỗi mục tiêu: nhiều sự kiện "hết giờ" có thể chứng minh được nếu cho lâu hơn (`gioi_han_giay`).
* Newclid đôi khi lỗi nội bộ (`TypeError`, `InvalidLineIntersectError` ở cấu hình đặc biệt) → ghi "lỗi suy diễn",
  trung tính. Newclid 3.x không dùng được (xem trên).
* **Khối lượng**: mỗi giờ vòng khám phá xác nhận hàng nghìn sự kiện; chỉ giữ 4000 sự kiện điểm cao nhất mỗi lần chạy
  và Newclid kịp kiểm khoảng 300–400 sự kiện/giờ với 2 tiến trình (ưu tiên điểm sơ bộ cao), phần còn lại ghi
  "chưa kiểm tra". Tăng `so_tien_trinh` nếu máy nhiều nhân.
* Nhiều sự kiện đứng đầu là các biến thể của cùng một ý (vd nhiều đường tròn qua trực tâm của các tam giác con);
  chỉ khử trùng lặp khi trùng hẳn về hình học (kể cả đổi tên A/B/C). Phản hồi "Chán" giúp hạ cả nhóm (qua đặc trưng).
* Lọc "hiển nhiên" chỉ dùng vài luật (bản JS + Thales, đường trung bình, vị tự, sự kiện đã biết); phần còn lại nhờ
  Newclid. Sự kiện "hai điểm trùng nhau" mà là định nghĩa tương đương (vd chân đường vuông góc từ H xuống BC là D)
  đã được loại; các trùng hợp quen thuộc (vd N là tâm (DEF)) vẫn được báo (và Newclid chấm).
* Vòng khám phá mặc định sâu 3 lớp, 6 bước mới; muốn sâu hơn chỉnh `do_sau`, `so_buoc_toi_da` (chậm hơn nhiều).
* Kết quả phụ thuộc thời gian máy (ngân sách theo giây): cùng cấu hình, máy nhanh tìm được nhiều hơn máy chậm.
* Dữ liệu đối chiếu `lab/tests/fixtures/js_doi_chieu.json` (~1 MB) cần sinh lại khi sửa lõi JS (test tự báo).

## 4. Hướng dẫn chạy (tóm tắt – chi tiết ở `lab/HUONG_DAN.md`)

Windows: cài Python 3.12 (đánh dấu *Add python.exe to PATH*), tải mã nguồn, rồi bấm đúp:

1. `lab\cai-dat.bat` – một lần: tạo `.venv`, cài `numpy`, `newclid==2.0.2`, chạy thử.
2. `lab\chay-7-tieng.bat` – buổi tối (tắt giữa chừng thì bấm lại để chạy tiếp).
3. `lab\xem-bao-cao.bat` – buổi sáng: mở báo cáo, bấm Hay/Chán.

Bằng lệnh (trong `.venv`):

```bat
python -m lab chay --gio 7
```

```bat
python -m lab bao-cao
```

Kiểm thử:

```bat
python -m unittest discover -s lab/tests -t .
```

## 5. Quyết định thiết kế chính và lý do

1. **Lõi Python dịch sát từng dòng lõi JS**, kể cả ngưỡng và thứ tự chọn nghiệm, và **cùng bộ sinh số ngẫu nhiên**
   ở bộ quét: nhờ vậy có thể đối chiếu "giống hệt" chứ không chỉ "gần đúng", và hình nào phòng thí nghiệm sinh ra mở
   trong công cụ web cũng đúng y như vậy.
2. **Vũ trụ dùng chung thay cho cây cấu hình**: thay vì mỗi nút tìm kiếm là một hình riêng, mọi đối tượng của một
   vòng sống chung trên cùng 16 tam giác mẫu; sự kiện được kiểm chứng trên **tài liệu con tối thiểu** (bao đóng phụ
   thuộc) → "số bước dựng" của sự kiện là số bước thật sự cần, và cùng một đối tượng không phải tính lại ở mỗi nhánh.
3. **Dò tăng dần + kiểm chứng đầy đủ**: dò bằng numpy rất nhanh nhưng lỏng; mọi ứng viên qua bộ quét đầy đủ (giống
   bản JS) trên cấu hình ngẫu nhiên mới → không báo sai do trùng hợp của bộ mẫu.
4. **Mẫu vân tay hoán vị đỉnh**: một định lý thường xuất hiện 3 hoặc 6 lần (theo A, B, C); khoá chuẩn lấy nhỏ nhất qua
   6 hoán vị nên chỉ báo một lần.
5. **Newclid 2.0.2 + toạ độ cố định**: Newclid tự đặt toạ độ ngẫu nhiên có thể chọn nhầm nhánh nghiệm (giao điểm, cung)
   làm mục tiêu sai về số; dùng đúng toạ độ của hình loại bỏ hẳn vấn đề này. Chạy trong tiến trình con để có giới hạn
   thời gian **cứng** (bộ suy diễn có thể kẹt lâu trong một bước) và để lỗi của Newclid không làm đổ vòng chạy.
6. **Tách mục tiêu nguyên tử**: đo được Newclid chậm hẳn khi bài toán thừa điểm (đường tròn Euler 6 điểm: hết giờ; tách
   ra: mỗi chân đường cao ~3 giây).
7. **Điểm = tổng có trọng số, học bằng cộng dồn có kẹp**: đơn giản, giải thích được (báo cáo hiện từng thành phần),
   chỉnh tay được trong tệp cấu hình; phản hồi chỉ dịch trọng số trong giới hạn nên không "học lệch" khi có ít đánh giá.
8. **Báo cáo là một tệp HTML tĩnh, không thư viện ngoài**: mở được không cần mạng; máy chủ nhỏ chỉ dùng để ghi phản
   hồi vào tệp (trình duyệt không được ghi tệp trực tiếp).
9. **Lưu tiến độ ở ranh giới vòng + mỗi phút** (tệp JSON ghi tạm rồi đổi tên): một vòng chỉ 2–3 phút nên mất điện
   chỉ mất tối đa một vòng; lần chạy dở được nhận ra và chạy tiếp tự động.

---

# Bản 1.2 – Tự dùng thử như giáo viên Olympic, rồi sửa

Kết quả chi tiết từng bài (ảnh, đề tóm tắt, số thao tác, vấn đề gặp và đã sửa chưa): **`reports/dung-thu.html`**.

## 1. Cách dùng thử

**23 bài**, đa dạng cấu hình: 13 bài IMO (2008/1, 2010/2, 2012/5, 2013/4, 2014/4, 2015/4, 2017/4, 2018/1, 2019/6,
2021/4, 2023/2, 2024/4, 2025/2), 2 bài VMO (2014/4, 2016/3), 7 cấu hình hay gặp (bổ đề tâm nội tiếp – bàng tiếp;
đường tròn Euler – Feuerbach; mixtilinear; nghịch đảo √(bc); tứ giác nội tiếp – Brocard; tiếp tuyến chung – Monge;
tâm đồng dạng xoắn) và một hình dày (tam giác, I, I_A, I_B, I_C, ba đường tròn bàng tiếp, (O), trung điểm M_A…, tiếp
điểm T_A…, điểm đối tâm A′, B′, C′ – nhãn có chỉ số dưới và dấu phẩy).

**Dựng hoàn toàn qua giao diện** (`tests/browser/dung-thu/`): một "người dùng ảo" điều khiển Chromium headless bằng
Playwright – bấm biểu tượng nhóm trên thanh công cụ dọc, mở menu con, bấm công cụ; bấm lên bảng vẽ vào điểm (theo vị trí
đang hiện), lên một đường (tìm chỗ trống trên đường như mắt người nhìn), vào chỗ hai đường cắt nhau; đặt tên bằng nháy
đúp + gõ (bản 1.1) hoặc gõ ngay (bản 1.2). Không ghi JSON trực tiếp. Khi giao diện cản trở, người dùng ảo xử lý như người
thật và **ghi lại vấn đề**: thẻ nổi che chỗ cần bấm → bỏ chọn cho thẻ ẩn; tên đã bị chiếm → đổi tên điểm kia trước; chỗ
cắt ngoài màn hình → "Thu phóng vừa hình"; bấm vào chỗ cắt tạo nhầm giao điểm → hoàn tác, chọn lần lượt hai đường…

Mỗi bài ghi: **số thao tác** (chọn một công cụ / một lần bấm lên hình / đặt một tên / một lệnh menu hay phím) và số lần
bấm chuột; **vấn đề gặp**; **nhãn đè** (đo trên khung chữ thật sau khi thu phóng vừa hình: nhãn–nhãn, nhãn–điểm,
nhãn–đường); **kéo thử** 36 bước quanh một vòng (điểm "nhảy" – một bước dịch > 60 px và gấp 6 lần hai bước kề –,
đối tượng biến mất, thời gian JS mỗi khung); **kiểm chứng** kết luận của đề bằng số trên hình vừa dựng và trên 30 cấu
hình xê dịch (6% kích thước hình, bỏ cấu hình trái giả thiết của đề), đúng nếu sai số tương đối ≤ 10⁻⁷; **bộ khám phá**
có tự tìm ra kết luận không.

Cùng kịch bản được chạy trên **bản 1.1** (worktree ở commit mốc 1 – `ket-qua-truoc.json`) và **bản 1.2**
(`ket-qua-sau.json`), nên số liệu so sánh được trực tiếp.

**Kiểm chứng không phát hiện công cụ nào dựng sai.** Bốn lần kết luận "sai" khi viết kịch bản đều do *tôi* chọn cấu
hình đặc biệt, kiểm chứng số đã bắt được: IMO 2025 với MN đúng bằng bán kính Γ (khi đó P nằm trên Γ, F ≡ P); IMO 2021 với
tứ giác có ∠A = ∠C (giao AB ∩ CD nằm trên (AIC) nên X ≡ T) và cách đặt tên đỉnh làm X không nằm trên phần kéo dài *qua A*
như đề; hai đường AB, CD gần song song ở bài đồng dạng xoắn. Công cụ đều cho đúng hình đã dựng.

## 2. Kết quả

| Bài | Thao tác | Lần bấm | Nhãn đè | Kiểm chứng (sai số lớn nhất) | Khám phá tìm ra kết luận |
|---|---|---|---|---|---|
| IMO 2008 – Bài 1 | 64 → 46 | 97 → 46 | 8 → 0 | đúng (3·10⁻¹⁵) | #4 → #4 |
| IMO 2010 – Bài 2 | 44 → 40 | 65 → 50 | 1 → 0 | đúng (3·10⁻¹⁵) | #1 → #1 |
| IMO 2012 – Bài 5 | 55 → 40 | 87 → 46 | 1 → 2 | đúng (4·10⁻¹⁵) | – → – |
| IMO 2013 – Bài 4 | 57 → 43 | 92 → 48 | 3 → 1 | đúng (3·10⁻¹⁶) | #2 → #2 |
| IMO 2014 – Bài 4 | 51 → 41 | 82 → 46 | 3 → 2 | đúng (3·10⁻¹⁵) | #1 → #1 |
| IMO 2015 – Bài 4 | 61 → 43 | 91 → 51 | 7 → 2 | đúng (4·10⁻¹⁴) | #1 → #1 |
| IMO 2017 – Bài 4 | 54 → 38 | 86 → 46 | 4 → 2 | đúng (6·10⁻¹⁶) | #1 → #1 |
| IMO 2018 – Bài 1 | 35 → 33 | 51 → 42 | 1 → 0 | đúng (2·10⁻¹⁶) | – → #1 |
| IMO 2019 – Bài 6 | 65 → 59 | 94 → 69 | 4 → 1 | đúng (4·10⁻⁸) | #5 → #5 |
| IMO 2021 – Bài 4 | 72 → 54 | 112 → 53 | 2 → 0 | đúng (9·10⁻¹⁶) | – → – |
| IMO 2023 – Bài 2 | 56 → 48 | 84 → 58 | 3 → 2 | đúng (2·10⁻¹⁴) | – → – |
| IMO 2024 – Bài 4 | 59 → 49 | 90 → 56 | 1 → 0 | đúng (3·10⁻¹⁶) | – → – |
| IMO 2025 – Bài 2 | 52 → 50 | 77 → 63 | 3 → 0 | đúng (1·10⁻¹³) | #5 → #6 |
| VMO 2014 – Bài 4 | 76 → 67 | 112 → 74 | 17 → 2 | đúng (3·10⁻¹⁵) | – → – |
| VMO 2016 – Bài 3 | 55 → 49 | 83 → 59 | 7 → 3 | đúng (7·10⁻¹⁶) | #2 → #2 |
| Bổ đề tâm nội tiếp – bàng tiếp | 30 → 28 | 46 → 40 | 0 → 0 | đúng (1·10⁻¹⁵) | #1 → #1 |
| Đường tròn Euler – định lý Feuerbach | 30 → 28 | 46 → 37 | 1 → 0 | đúng (5·10⁻¹⁶) | #1 → #1 |
| Đường tròn mixtilinear | 50 → 40 | 78 → 50 | 0 → 0 | đúng (4·10⁻⁸) | – → – |
| Nghịch đảo √(bc) | 97 → 47 | 155 → 63 | 27 → 1 | đúng (6·10⁻¹⁵) | – → – |
| Tứ giác nội tiếp – định lý Brocard | 47 → 35 | 71 → 36 | 2 → 2 | đúng (2·10⁻¹⁴) | #1 → #1 |
| Tiếp tuyến chung – định lý Monge | 54 → 47 | 90 → 56 | 3 → 0 | đúng (2·10⁻¹⁶) | #6 → #6 |
| Tâm đồng dạng xoắn (quay + vị tự) | 39 → 50 | 56 → 56 | 1 → 0 | đúng (1·10⁻¹⁵) | – → – |
| Tam giác với ba tâm bàng tiếp (hình dày) | 74 → 56 | 115 → 55 | 8 → 0 | đúng (6·10⁻¹⁶) | #1 → #1 |
| **Tổng** | **1277 → 1031** | **1960 → 1200** | **107 → 20** | 23/23 | 14 → 15 |

Thao tác theo loại (tổng 23 bài): chọn công cụ 527 → 306, bấm lên hình 590 → 587, đặt tên 127 → 108 (mỗi lần đặt tên
ở bản 1.1 kéo theo 2–3 lần đổi công cụ), lệnh khác 33 → 30. Lần bấm chuột giảm 39% – phần lớn nhờ gõ tên ngay và dải
công cụ vừa dùng. Kéo thử: không bài nào có điểm nhảy nghiệm hay đối tượng biến mất (sau khi dựng IMO 2015 chắc hơn, xem
vấn đề 15), JS mỗi khung ≤ 0,53 ms. Ghi chú: bài đồng dạng xoắn nhiều thao tác hơn vì bản 1.2 dựng thêm được D′ (bản 1.1
không có công cụ); IMO 2012 nhãn đè 1 → 2 (nhãn C, K ở chỗ quá nhiều đường đi qua, vẫn không đè điểm/nhãn). 20 chỗ "đè"
còn lại đều là nhãn chạm một đường ở điểm có 4–6 đường đi qua; không còn nhãn đè nhãn hay nhãn đè điểm.

## 3. Các vấn đề, xếp theo mức ảnh hưởng tới việc dạy – và đã sửa chưa

| # | Mức | Vấn đề | Đã sửa chưa |
|---|---|---|---|
| 1 | Cao | **Nghịch đảo chỉ áp cho điểm.** Bài √(bc) phải lấy 3 điểm, nghịch đảo từng điểm rồi dựng đường tròn qua 3 ảnh (97 thao tác); ảnh của (O) qua tâm nghịch đảo là đường thẳng nên "đường tròn qua 3 điểm" không xác định. | **Đã sửa.** Công cụ Nghịch đảo nhận điểm/đường thẳng/đường tròn, tự chọn ảnh là đường thẳng hay đường tròn (loại bước `invert_line`, `invert_circle`). 47 thao tác. |
| 2 | Cao | **Góc quay, tỉ số vị tự phải gõ số.** Phép quay ∠ASC + vị tự SC/SA của tâm đồng dạng xoắn không dựng được (kéo là sai). | **Đã sửa.** *Quay theo góc trên hình* (∠ABC), *Vị tự theo tỉ số trên hình* (AB/CD, có dấu), *Đồng dạng tâm O biến A thành B*; cho chọn lại cùng một điểm (S vừa là tâm vừa là đỉnh góc). |
| 3 | Cao | **Tâm đường tròn tự đặt tên chiếm chữ cái của đề** (D, K, L, A, E…): IMO 2015 không đặt được K, L; IMO 2017 mất A; "tứ giác nội tiếp" đặt đỉnh thứ tư là E. | **Đã sửa.** Tâm tự đặt tên O, O₁, O₂… |
| 4 | Cao | **Thẻ thuộc tính che hình, chặn lần bấm**: đối tượng vừa dựng được chọn nên thẻ hiện ở góc phải, che đúng chỗ cần bấm tiếp; bấm điểm gần góc phải thì thẻ hiện đè lên chính điểm, nháy đúp không đổi tên được. | **Đã sửa.** Thẻ chỉ hiện với công cụ Chọn, tự dời xuống khi che đối tượng đang chọn. |
| 5 | Cao | **Nhãn đè**: nhãn rộng (M_c, I_A) đè chính điểm của nó (khoảng cách tính tới *tâm* nhãn); nhãn ở giao nhiều đường đè lên đường; hai điểm gần nhau chồng nhãn (M_C và C′). | **Đã sửa.** Đặt nhãn theo khung chữ thật (mục 4). 107 → 20 chỗ. |
| 6 | Cao | **Đặt tên tốn 3–5 thao tác** (về Chọn, nháy đúp, gõ, chọn lại công cụ). | **Đã sửa.** Điểm vừa dựng được chọn sẵn, gõ chữ là đặt tên tại chỗ; F2/nháy đúp để sửa. |
| 7 | Vừa | **Đổi sang tên đã có bị từ chối** (tam giác vuông cần vuông tại C: 3 lần đổi tên qua tên tạm). | **Đã sửa.** Đổi chỗ hai tên. |
| 8 | Vừa | **Chọn công cụ trong menu Công cụ cần 3 lần bấm**; ~40% thao tác là chọn công cụ. | **Đã sửa.** Dải "công cụ vừa dùng" (1 lần bấm). |
| 9 | Vừa | **Đường thẳng kéo tới mép màn hình** làm rối hình (VMO 2014, nghịch đảo). | **Đã sửa.** "Đường thẳng vừa đủ" kiểu sách (mặc định, tắt được); phần kéo dài hiện mờ khi đang dựng. |
| 10 | Vừa | **Bộ khám phá bỏ sót kết luận**: mẫu xê dịch phá giả thiết (E ra ngoài đoạn AC, tam giác hết nhọn) – IMO 2018; hình có tiếp điểm thì mọi mẫu bị loại "gần tiếp xúc" (mixtilinear: 0 mẫu). | **Đã sửa.** Lấy mẫu giữ cấu hình gốc (mục 4); bản Python sửa giống hệt. |
| 11 | Vừa | **Hai điểm trùng nhau: luôn chọn điểm dựng trước** (ảnh nghịch đảo của B trùng C′). | **Đã sửa.** Đối tượng dựng sau (nằm trên) được chọn. |
| 12 | Vừa | **Bấm vào chỗ ba đường cùng đi qua: chọn cặp bất kỳ** – hình lưu lại có thể "chứa sẵn" kết luận (IMO 2010). | **Đã sửa.** Lấy cặp đường dựng sau cùng. |
| 13 | Vừa | **Điểm vừa dựng ngoài khung nhìn** (M, N ở IMO 2014; S₁₂ ở Monge): phải tìm menu Thu phóng. | **Đỡ hơn.** Phím `Home` + thông báo; không tự đổi khung nhìn (để khỏi mất chỗ khi đang giảng). |
| 14 | Thấp | **Giao điểm ở rất xa**: chọn lần lượt hai đường, công cụ tạo cả hai giao điểm (đôi khi phải xoá một). | Chưa sửa (ít gặp, vẫn làm được). |
| 15 | Thấp | Kéo A ở IMO 2015 làm mất 11 đối tượng (Γ vẽ bằng điểm bán kính tự do). | Không phải lỗi công cụ; thư viện dựng chắc hơn (D trên BC, đường tròn tâm A qua D). |
| 16 | Thấp | Bộ khám phá chưa tìm đoạn bằng nhau, góc bằng nhau, tổng độ dài (IMO 2012, 2021, 2023, 2024, VMO 2014a). | Chưa làm (xem mục 7). Vẫn kiểm chứng được bằng số. |

Không phát hiện vấn đề kéo thả (không nhảy nghiệm, không giật) ở cả 23 bài.

## 4. Tính năng lớn đã thêm – và vì sao thật sự cần

1. **Nghịch đảo đường thẳng/đường tròn** (hạn chế đã biết của bản 1.1; dùng thử cho thấy bài nghịch đảo tốn gấp đôi thao
   tác và không dựng được ảnh qua tâm). Loại đối tượng của ảnh (đường thẳng/đường tròn) phải cố định theo cách dựng để
   tệp JSON mô tả được, nên tách hai loại bước; công cụ tự chọn theo hình lúc dựng. Đường tròn "qua tâm" xét với dung sai
   tương đối 10⁻⁷ (cấu hình sai loại → không xác định, không vẽ nhầm).
2. **Góc/tỉ số lấy trên hình** và **phép đồng dạng tâm O biến A thành B** (hạn chế đã biết; bài đồng dạng xoắn không dựng
   được). Thêm loại bước `rotate_by`, `homothety_by`, `spiral`; công cụ khai báo `allowRepeat` để chọn lặp một điểm.
3. **Đặt nhãn theo khung chữ trên màn hình** (`placeLabels` trong `src/core/labels.js`): thuật toán cũ chỉ chọn *hướng* và
   đặt *tâm* nhãn cách điểm 11 px, không biết kích thước chữ – nguồn gốc của 107 chỗ đè. Mỗi điểm thử 24 hướng × 2 khoảng
   cách; khung chữ đặt kiểu "neo" TikZ (cạnh/góc gần điểm nhất cách điểm 2 px); chi phí = 8 × số đường cắt qua khung +
   12 × số điểm bị che + 14 (+ diện tích) × số nhãn đã đặt bị đè + 6 nếu ra ngoài khung + ưu tiên nhẹ hướng ra xa tâm
   hình; đặt tham lam, điểm "khó" (nhiều đường qua, sát điểm khác) đặt trước. Chỉ chạy khi hình thay đổi hoặc phóng to/thu
   nhỏ (gom 120 ms), không chạy khi kéo. Nhãn người dùng đã kéo được giữ và được tránh.
4. **Đường thẳng vừa đủ** (`trimmedRange` trong `geom.js`, dùng chung cho màn hình và TikZ): dùng thử cho thấy hình nhiều
   đường thẳng rất rối. Khi đang dựng, phần kéo dài hiện mờ (vẫn bấm được chỗ cắt) – nếu không, VMO 2014 tốn thêm 6 thao
   tác vì chỗ cắt bị ẩn.
5. **Thư viện ví dụ** (yêu cầu): menu **Ví dụ** theo nhóm; dữ liệu là các tệp `examples/thu-vien/*.json` (chính là hình
   người dùng ảo dựng qua giao diện, chỉ lưu khi kết luận kiểm chứng đúng), module `src/core/thu-vien.js` nhập các tệp này
   để esbuild đóng gói vào `dist/app.js` – mở `index.html` từ ổ đĩa không mạng vẫn dùng được (dist tăng 240 → 357 KB).
6. **Bộ khám phá giữ cấu hình của đề khi lấy mẫu**: tam giác vẽ trên hình giữ chiều và góc nhọn/tù rõ ràng; giao điểm với
   một đoạn thẳng phải còn trong đoạn; giao điểm của hai đường tiếp xúc ngay ở hình gốc không bị loại "gần tiếp xúc". Bản
   Python `lab/scan/explorer.py` sửa giống hệt – test đối chiếu JS/Python vẫn khớp hoàn toàn.

Không làm: tìm đoạn/góc bằng nhau trong bộ khám phá (vấn đề 16) – tính năng lớn, phải sửa đồng thời bản Python để giữ
"kết quả giống hệt"; kết luận dạng này vẫn kiểm chứng được bằng số.

## 5. Hiệu năng (test `npm run test:perf`, hình dày, cùng một máy)

| | bản 1.1 | bản 1.2 |
|---|---|---|
| Luồng chính / khung, CPU ×1 | 6,29 ms | 6,49 ms |
| Luồng chính / khung, CPU ×4 | 28,8 ms | 30,4 ms |
| JS / khung, CPU ×4 | 3,41 ms | 3,66 ms |
| Một lần vẽ (JS), CPU ×4 | 0,73 ms | 0,96 ms |
| p95 khoảng cách hai khung, ×4 | 16,7 ms | 16,8 ms (đủ 60 khung/giây) |

Máy phát triển lần này chậm hơn máy đo bản 1.1 (bảng ở mục A bản 1.1), nên so sánh trên cùng máy. Phần tăng ~0,2 ms mỗi
lần vẽ là tính "đường thẳng vừa đủ" (đường × điểm mỗi khung); đặt nhãn không chạy khi kéo. Mọi ngưỡng tự kiểm vẫn đạt.
Lần đo cuối (bản 1.2 hoàn chỉnh, kèm thư viện ví dụ): 5,91 ms (×1), 29,8 ms (×4), p95 16,8 ms – các lần đo dao động
khoảng ±0,5 ms trên máy này.

## 6. Định dạng JSON

Không đổi trường hay loại bước cũ; chỉ **thêm** năm loại bước (`invert_line`, `invert_circle`, `rotate_by`,
`homothety_by`, `spiral` – đã ghi trong `docs/DINH_DANG_JSON.md`) và lõi Python `lab/core` tính được cả năm (dữ liệu
đối chiếu `lab/tests/fixtures/js_doi_chieu.json` sinh lại, thêm các trường hợp ảnh là đường thẳng/đường tròn). Tệp và
link cũ mở bình thường. Tâm đường tròn tên O₁… chỉ là tên mặc định khi dựng mới.

## 7. Kiểm thử và hạn chế còn lại

* `npm test`: 126 test đạt (thêm: mỗi công cụ mới kiểm theo định nghĩa ở 5 cấu hình – ảnh nghịch đảo của mọi điểm nằm
  trên ảnh của đường; góc quay bằng ∠BCQ khi kéo; tỉ số; phép đồng dạng biến A thành B –, đã thử làm sai cố ý 2 công thức
  và test phát hiện; mọi hình trong thư viện hợp lệ, mọi đối tượng xác định, xuất TikZ được).
* `npm run test:browser`: đạt, thêm `tests/browser/smoke3.mjs` (menu Ví dụ, gõ để đặt tên, đổi chỗ tên, thẻ thuộc tính,
  nghịch đảo đường tròn, quay theo góc chọn lặp điểm, công cụ vừa dùng, đường vừa đủ).
* `npm run test:perf`: đạt. Python: `python -m unittest discover -s lab/tests -t .` – 23 test đạt (1 bỏ qua vì máy này
  chưa cài Newclid).
* Dùng thử: `node tests/browser/dung-thu/chay.mjs [--luu]` (~8 phút), `node tests/browser/dung-thu/bao-cao.mjs`.

Hạn chế còn lại: vấn đề 13, 14, 16 ở trên; giao điểm của hai đường tròn tiếp xúc (điểm Feuerbach, tiếp điểm mixtilinear)
bấm được nhưng sai số ~10⁻⁸ (căn bậc hai của sai số làm tròn) – đủ cho hiển thị và kiểm chứng 10⁻⁷; nhãn ở điểm có 4–6
đường đi qua vẫn có thể chạm một đường; "người dùng ảo" chỉ đo được những gì đo bằng máy (số thao tác, nhãn đè, sai số) –
cảm nhận "đẹp" của hình tôi tự xem lại trên ảnh chụp từng bài.

**Gợi ý tiếp theo**: bộ khám phá tìm đoạn/góc bằng nhau (cả JS và Python); công cụ "giao điểm" chỉ tạo nghiệm gần chỗ
bấm khi chọn lần lượt hai đường; lưu "công cụ vừa dùng" và "Công cụ của tôi" kèm tệp hình; thử với giáo viên thật trên
máy chiếu.

---

# Bản 1.3 – Theo đề xuất sau khi dùng bản 1.2

1. **Tên ảnh qua phép biến hình = tên tạo ảnh + `'`.** Các công cụ biến hình (đối xứng tâm/trục, quay, vị tự, tịnh
   tiến, nghịch đảo, quay/vị tự theo góc/tỉ số trên hình, đồng dạng) đặt tên ảnh của điểm A là A′, ảnh của A′ là A″
   (tên đã có thì thêm phẩy, tối đa 3, rồi mới dùng tên tự động). Chỉ áp cho công cụ *biến hình*: các công cụ dựng
   hình dùng phép quay/tịnh tiến bên trong (tam giác đều, hình vuông, hình bình hành…) vẫn đặt C, D như cũ. Ảnh của
   đường thẳng/đường tròn vẫn đặt tên tự động. Cài đặt: cờ `prime` trên đặc tả bước, `primeName` trong
   `src/core/apply.js`. Test: `tests/library.test.mjs`.
2. **Nhiều tab hình.** Dải tab thay ô "Tên hình" trên thanh trên; mỗi tab giữ hình, lịch sử hoàn tác/làm lại và khung
   nhìn riêng (cất/lấy khi đổi tab, không đổi cấu trúc của App). *Hình mới* mở tab mới (không còn hỏi xoá hình cũ); mở
   tệp, ví dụ, link mở ở tab mới, trừ khi tab đang mở còn trống. Nháy đúp tab để đặt tên hình; đóng tab có hình thì hỏi
   lại. Bản nháp lưu **mọi tab** (`hinh-hoc-dong:nhap-tab`); bản nháp một hình của bản cũ vẫn được đọc. Mở lại đúng
   link đã mở trước đó không tạo tab trùng.
3. **Dán ảnh.** `Ctrl+V`, kéo thả tệp ảnh, *Tệp › Chèn ảnh…*. Ảnh theo toạ độ hình (phóng/dời cùng hình), vẽ dưới mọi
   đối tượng; kéo để dời, kéo góc để đổi cỡ, độ đậm, *Khoá làm nền*, xoá. Định dạng: trường tuỳ chọn `images` (vị trí)
   và `imageData` (data URL) – tệp cũ không đổi, bản Python bỏ qua. Dữ liệu ảnh để **ngoài** `doc` khi đang làm việc nên
   200 bước hoàn tác không nhân bản ảnh (test kiểm tra một bước hoàn tác < 2000 ký tự). Link chia sẻ không chứa ảnh
   (có nhắc); TikZ ghi chú là ảnh không được xuất. Ảnh lớn hơn 1600 px được thu nhỏ khi dán (PNG giữ PNG để chữ trong ảnh
   chụp đề còn nét).

4. **Giữ Shift để căn hướng.** Khi đang dựng, giữ Shift lúc bấm chỗ trống để tạo điểm: hướng từ điểm đã chọn (của lần
   dùng công cụ đó) tới điểm mới được bắt về bội số của 15°, giữ nguyên khoảng cách; nằm ngang/thẳng đứng thì chép đúng
   toạ độ của điểm mốc nên đường nằm ngang tuyệt đối. Hình xem trước cũng căn theo. Với công cụ Chọn, giữ Shift khi kéo
   một điểm tự do: bắt hướng theo các điểm nối với nó bằng đoạn/tia/đường thẳng (lấy điểm làm dịch ít nhất). Dùng Shift
   (thay vì một phím chữ) vì phím chữ đang dùng để gõ tên điểm và là quy ước quen thuộc của các phần mềm vẽ.

Kiểm thử: `npm test` 127 test; `npm run test:browser` đạt, thêm `tests/browser/smoke4.mjs` (Shift: đoạn nằm ngang
khi bấm, bắt 15° khi kéo; đối xứng A, B qua C ra
A′, B′, ảnh của A′ ra A″; tab: mở, đổi, hoàn tác riêng từng tab, đặt tên, mở ví dụ ở tab mới; dán ảnh qua sự kiện
paste thật, kéo ảnh, vẽ điểm lên trên ảnh, lưu/mở tệp có ảnh, khoá làm nền, bản nháp khôi phục mọi tab và ảnh sau khi
tải lại trang); `npm run test:perf` đạt (6,44 ms/khung ×1, p95 16,8 ms ×4 – không đổi).

Hạn chế: ảnh không có trong link chia sẻ; ảnh rất lớn có thể vượt dung lượng lưu nháp của trình duyệt (khoảng 5 MB,
có nhắc lưu tệp); chưa có phím tắt chuyển tab (Ctrl+Tab bị trình duyệt giữ).

# Bản 1.4 – Chữ trên bảng vẽ (đề bài, lời giải) và giao diện mới

Bản này làm theo buổi trao đổi sau bản 1.3: khi dạy, ngoài hình còn phải viết. Các điều đã thống nhất: viết bằng **bàn
phím** (trình duyệt trên Windows), cú pháp **gần LaTeX** nhưng gõ **nhanh hơn Overleaf**; phần chữ **không cố định**
mà kéo đi được; đề bài thường là **ảnh cắt** dán vào; thường một chuỗi lời giải. Cuối cùng là yêu cầu **thiết kế lại
giao diện cho đẹp hơn**.

## 1. Khung chữ

* `doc.boxes` (trường tuỳ chọn, tệp cũ không đổi): khung *Đề bài*, *Lời giải*, *Ghi chú* nổi trên bảng vẽ. Kéo thanh
  tiêu đề để dời (hít vào mép), kéo góc để đổi cỡ, đổi cỡ chữ, thu gọn, xoá (có hỏi, hoàn tác được). Ba cách gắn:
  màn hình / hình / điểm. Khung gắn màn hình luôn được giữ trong khung vẽ (mở bảng bên không che mất khung).
* **Ảnh đề**: `Ctrl+V` (hoặc kéo thả, *Chèn › Ảnh đề bài từ tệp…*) tạo khung *Đề bài* chứa ảnh – vì đề thường là ảnh
  cắt. Ảnh nền để đồ hình (bản 1.3) chuyển sang *Chèn › Ảnh nền để đồ hình…*. Dữ liệu ảnh trong khung dùng chung
  `imageData` với ảnh nền (lưu trong tệp và bản nháp, không trong link).
* **Hiển thị công thức** bằng KaTeX, đóng gói sẵn, phông nhúng trong `css/katex.css` → vẫn chạy offline từ `file://`.
  Macro tiếng Việt `\goc`, `\tamgiac`, `\cung{}`, `\vecto{}`. Công thức sai cú pháp hiện đỏ tại chỗ, không làm hỏng khung.
* **Bước**: dòng `---` (tuỳ chọn `@k`) chia lời giải; khi trình bày bước *k* hiện ở khung *k* (cùng nhịp với các bước
  dựng), bước mới hiện có hiệu ứng nhẹ; số khung trình bày kéo dài theo lời giải.
* **Tên điểm trong công thức** được bọc `\htmlData{p=id}` khi hiển thị: rê chuột lên tên thì đối tượng sáng lên.
* **Đổi tên điểm → chữ đổi theo** (`renameInText` trong `src/text/markup.js`, gọi trong `setName` – cùng một bước hoàn
  tác, cả khi đổi chỗ hai tên). Trong công thức: đổi mọi tên khớp (dài nhất trước, không cắt `I_A` thành `I`, bỏ qua
  `\text{…}` và tên lệnh). Trong chữ thường: chỉ đổi "từ" tách được hết thành tên điểm ("tam giác ABC"), không đụng
  "Ta", "Cho", "Gọi"; tên mới có chỉ số mà nằm ngoài công thức thì được bọc `$…$`. Bấm điểm khi đang soạn: ngoài công thức
  tự bọc `$…$`, bấm liền nhau thì gộp vào công thức vừa chèn (`$ABC$`). Thêm sau khi dùng thử: tên điểm trước đây chỉ là
  chữ, đổi tên điểm thì lời giải sai tên.
* **Xuất phiếu LaTeX** (`src/export/latex.js`): đề + hình TikZ + lời giải đánh số theo bước + ảnh đề tải kèm.

## 2. Bộ soạn gõ nhanh (CodeMirror 6, soạn ngay trong khung, xem trước bên dưới)

Thiết kế để số phím gõ ít nhất mà không đụng Unikey/EVKey:

* **Tự đổi trong công thức** (chỉ khi con trỏ đang ở trong `$…$`, kiểu Obsidian LaTeX Suite): `goc` → `\angle `,
  `^o` → `^\circ`, `<=` → `\le`, `ff` → `\frac{|}{}`… Quy tắc toàn chữ chỉ khớp khi đứng trước không phải chữ cái hay
  `\` (không đổi nhầm trong `\diff` hay một từ). Dấu cách gõ ngay sau lệnh vừa đổi được nuốt (không thành hai dấu cách).
* **Gõ tắt** bắt đầu bằng `;` + `Tab`: các chữ Telex/VNI dùng (s f r x j w z, dd, số) không bao giờ đứng sau `;` nên
  không xung đột với bộ gõ tiếng Việt. `;cm` → **Chứng minh.**, `;dpcm` → (đpcm), `;tgnt` → tứ giác nội tiếp…
* Ô nhảy `${}` (Tab sang ô sau); `Tab` nhảy ra khỏi `}` `$` `)`; tự đóng `( [ { $` nhưng **không** đóng dấu `'` (tên B′).
* Gợi ý tên điểm chỉ khi gọi (`Ctrl+Space`) hoặc khi đang gõ tên có chỉ số (`I_`) – để gõ nhanh "BAC" không bị bảng gợi
  ý chặn Enter. **Bấm điểm trên hình** khi đang soạn thì chèn tên điểm (không tạo điểm mới).
* Bộ quy tắc sửa được dạng văn bản (*Chèn › Gõ tắt và tự đổi…*), lưu trong trình duyệt.

Ví dụ (đúng câu dùng trong test trình duyệt): phần công thức của "Ta có $\angle BHC + \angle A = 180^\circ$ và
$\frac{A_1A_2}{2}$" gõ `goc` `goc` `^o` `ff…Tab…Tab` = 19 phím thay vì 36 phím `\angle ` `\angle ` `^\circ` `\frac{A_1A_2}{2}`,
và không phải với tới `\` `{` `}`.

## 3. Giao diện mới

Viết lại `css/style.css` thành một hệ thống thống nhất dựa trên biến màu (`--chrome`, `--line`, `--ink`, `--muted`,
`--accent`…), thay cho các màu viết rải rác:

* Ý tưởng "bàn vẽ": tờ giấy trắng mực đen ở giữa (bảng vẽ **giữ nguyên** kiểu nét Sketchpad), khung bàn xám lạnh rất
  nhạt, **một** màu nhấn xanh mực. Chữ toán và tên thương hiệu dùng chữ có chân nghiêng như trong sách.
* Thanh trên cao hơn (42 px), có biểu tượng tam giác nội tiếp đường tròn + tên; tab hình dạng thẻ nổi; menu và các
  bảng xổ có bóng nhiều lớp, mục rê chuột tô xanh nhạt, phím tắt hiện như phím thật.
* Thanh công cụ dọc rộng hơn (52 px), công cụ đang dùng tô **đặc** màu nhấn – nhìn từ cuối lớp vẫn biết đang ở công cụ nào.
* Dòng gợi ý thành một nhãn nổi nhỏ ở góc dưới bảng vẽ (không chiếm cả một dải đáy, trả lại diện tích cho hình).
* Thẻ thuộc tính, hộp thoại, thông báo, thanh trình bày (dạng viên thuốc tối, kính mờ) cùng một kiểu bo góc/bóng.
* Khung chữ: thanh tiêu đề có nhãn vai trò màu riêng (đề – xanh mực, lời giải – xanh lục, ghi chú – hổ phách), các nút
  biểu tượng SVG chỉ hiện khi rê chuột, thân khung chữ có chân; bộ soạn chữ đơn cách **không ghép ký tự** (`=>` hiện đúng
  hai ký tự đã gõ).
* Menu *Ví dụ* nhiều cột không còn tràn khỏi màn hình; menu không bị xuống dòng khi mở nhiều tab.
* **Chuyển tab bằng phím**: `Alt+1`…`Alt+9`, `Alt+PageUp`/`Alt+PageDown` (bù hạn chế của bản 1.3: `Ctrl+Tab` bị trình duyệt
  giữ). Rê chuột lên tab thấy phím tắt.
* **Ẩn nhanh**: `Ctrl+H` ẩn các đối tượng đang chọn (như Sketchpad), `Ctrl+Shift+H` hiện lại tất cả; có trong menu *Sửa*.
  Trước đó phải chọn rồi tích *Ẩn* trong thẻ thuộc tính hoặc mở bảng các bước – người dùng thử hỏi "ẩn đường thẳng kiểu gì".
* `index.html` gắn số phiên bản vào đường dẫn (`dist/app.js?v=1.4`…): khi dùng thử, trình duyệt từng giữ `app.js`/`style.css`
  cũ trong bộ nhớ đệm trong khi `index.html` đã mới → mất dải tab, giao diện lẫn cũ mới. Mỗi bản sau cần tăng số này.

## 4. Kiểm thử

* `npm test`: 135 test (134 đạt, 1 bỏ qua vì máy không có pdflatex), thêm `tests/van-ban.test.mjs` (chia bước, khung
  trình bày, gắn tên điểm, tự đổi/gõ tắt, xuất LaTeX).
* `npm run test:browser`: đạt, thêm `tests/browser/smoke5.mjs` – 32 kiểm tra (cả bấm điểm tự bọc `$…$`, đổi tên điểm → chữ đổi theo, phím chuyển tab): `Ctrl+Enter` tạo khung, gõ thật với tự đổi
  và gõ tắt, bấm điểm chèn tên, công thức không lỗi, tên gắn hình, rê chuột tô sáng, kéo/đổi cỡ chữ/đổi cách gắn (khung
  gắn hình đi theo khi phóng), `Ctrl+V` ảnh thành khung Đề bài, trình bày hiện dần từng bước, lưu/mở tệp có khung và
  ảnh, xuất `.tex` (có TikZ, `\includegraphics`, `\item`), xoá/hoàn tác. `smoke4` đổi sang chèn ảnh nền qua menu.
* `npm run test:perf`: ×1 6,38 ms/khung, ×4 30,0 ms, p95 16,8 ms – như bản 1.3. Thêm `--khung` (3 khung chữ có công
  thức, gắn màn hình/hình/điểm): ×1 6,65 ms, p95 16,8 ms. Vị trí khung cập nhật mỗi khung hình nhưng đọc kích thước
  trước rồi mới ghi để không ép trình duyệt tính lại bố cục giữa chừng.
* Dựng thử lại 23 bài qua giao diện mới (`tests/browser/dung-thu/chay.mjs`): 23/23 đúng, không lỗi trang; 1027 thao tác
  (bản 1.2: 1031 – bớt 4 lần đặt tên nhờ tên phẩy A′ của bản 1.3), số lần bấm như cũ (1200).
* Lab Python: 23 test đạt sau khi sinh lại `lab/tests/fixtures/js_doi_chieu.json` (tệp đối chiếu đã cũ từ bản 1.3 vì
  tên phẩy A′ của công cụ đối xứng).

## 5. Hạn chế

* `dist/app.js` lớn lên (~1,6 MB) và `css/katex.css` ~370 KB vì đóng gói KaTeX + CodeMirror để chạy offline.
* KaTeX chỉ hỗ trợ phần công thức (không có môi trường `tikzpicture`, `\usepackage`…); xuất `.tex` cần gói `vietnam`.
* Khung gắn hình có thể ra ngoài khung nhìn khi phóng to (như mọi đối tượng hình) – `Home` đưa hình về.
* Ảnh (cả ảnh đề) không có trong link chia sẻ; chữ trong khung thì có.
* Phông Inter/STIX Two dùng nếu máy có, không thì dùng phông hệ thống (không nhúng để giữ dung lượng).

# Bản 1.5 – Lưu trữ cho chắc và kho bài tập trên GitHub

Sau buổi dạy thật đầu tiên trên bản 1.4 (6 bài trong 6 tab trên GitHub Pages), thầy/cô cần hai thứ: (1) không lo mất hình,
lưu/mở lại nguyên hiện trạng; (2) **hệ thống lại các bài thành kho bài tập**, mở lại ở máy nào cũng được. Thầy/cô quyết:
kho là repo riêng tư do thầy/cô tạo; một bài có thể (hiếm) nhiều hình; chưa làm phần cho học sinh.

## 1. Bước 1 – lưu trên máy

* **Lưu tất cả các tab vào một tệp** (`Ctrl+Shift+S`, định dạng `hinh-hoc-dong-bo`): giữ thứ tự tab, tab đang mở, khung
  nhìn, khung chữ, ảnh. *Mở tệp* chọn được nhiều tệp, nhận cả tệp nhiều tab, không mở trùng hình đang mở; **kéo thả**
  tệp `.json` vào bảng vẽ cũng mở (trước đây trình duyệt mở thẳng tệp và thay mất trang đang dạy).
* **Dấu chưa lưu**: chấm cam trên tab có thay đổi chưa lưu ra tệp/kho (so chữ ký nội dung, không tính khung nhìn). Đóng
  tab đã lưu không hỏi; *Tệp › Mở lại hình vừa đóng* (10 hình gần nhất).
* **Bản nháp bền hơn**: ghi cả vào IndexedDB (hàng trăm MB) bên cạnh localStorage (~5 MB) – ảnh đề lớn không còn làm
  hỏng bản nháp; lúc mở trang lấy bản mới hơn trong hai nơi. **Lịch sử bản nháp**: chụp các hình 5 phút một lần khi có
  thay đổi (và lúc mở trang), giữ 12 bản; *Tệp › Khôi phục bản nháp cũ…* mở các hình của một mốc thành tab mới.
* Lưu tệp/xuất LaTeX dùng chung `src/ui/download.js`: ở trang artifact của claude.ai (chặn tải kiểu thường) dùng khả
  năng tải tệp của trang nếu có.

## 2. Bước 2 – kho bài tập trên GitHub

Chi tiết cài đặt, cách dùng, cấu trúc repo: [`docs/KHO_BAI.md`](docs/KHO_BAI.md). Tóm tắt thiết kế:

* **Hai bên tách bạch**: chương trình (repo `Geometry`, công khai) không chứa dữ liệu; kho là repo **riêng tư**
  (chương trình cảnh báo nếu repo kho công khai, vì học sinh sẽ xem được lời giải). Đọc/ghi bằng token fine-grained
  chỉ có quyền *Contents* với đúng repo kho, lưu trong trình duyệt máy giáo viên. Không máy chủ riêng.
* **Cấu trúc đọc được bằng mắt**: `bai/<mã>/bai.json` (thông tin + các hình), `bai/<mã>/anh/*` (ảnh tách tệp),
  `bai/<mã>/thu-nho.jpg`, `buoi/<mã>.json`, `muc-luc.json` (chỉ mục để tìm nhanh), `chu-de.json`.
* **Thông tin bài**: tên, nguồn (kỳ – năm – bài, tự điền từ tên dạng "VMO 2016 – Bài 4"; hoặc Tự ra), chủ đề (14 chủ
  đề mặc định cho hình học Olympic, sửa được), kỹ thuật/thẻ (gợi ý thẻ đã dùng), độ khó 1–5, ghi chú riêng; trạng thái
  (mới có đề / có hình / có lời giải) tự suy từ nội dung; "đã dạy" suy từ các buổi dạy.
* **Lưu = một commit** (git data API: blobs → tree → commit → cập nhật nhánh `force: false`). Nhánh vừa đổi ở nơi khác →
  đọc lại mục lục, làm lại (không mất bài của máy kia). Bài bị sửa ở nơi khác kể từ lúc mở (so sha `bai.json`, sha tính
  ngay ở máy theo kiểu git) → hỏi: ghi đè / lưu thành bài mới / mở bản trên kho. Ảnh đã có không gửi lại; ảnh không dùng
  bị xoá.
* **Cửa sổ kho** (`Ctrl+K`): thẻ bài có ảnh thu nhỏ (vẽ bằng chính bộ vẽ, ở bảng vẽ ẩn), tìm không dấu trên tên, nguồn,
  chủ đề, thẻ, chữ trong đề/lời giải; lọc chủ đề/nguồn/độ khó/trạng thái/đã dạy; sắp xếp; chọn nhiều bài → mở, tạo buổi.
  Nút ⋯: sửa thông tin, các phiên bản cũ (mở bản cũ thành tab mới), thêm vào buổi, xoá.
* **Buổi dạy**: từ các tab đang mở (tab chưa có trong kho thành bài mới) hoặc từ các bài chọn trong kho; sắp thứ tự;
  mở buổi = mở đủ bài (bài đang mở không mở trùng); xuất **phiếu LaTeX cho cả buổi** (`toLatexSet`: mỗi bài một mục,
  chỉ đề hoặc kèm lời giải, hình TikZ, ảnh đề tải kèm).
* **Mất mạng**: lần lưu vào hàng chờ trong IndexedDB, nút kho báo *Chưa đồng bộ (n)*, tự lưu lên khi trình duyệt báo có
  mạng / mỗi phút / lúc mở trang.
* **Nhập**: tệp `.json` cũ (một hình hoặc nhiều tab), các tab đang mở, hoặc các bài ví dụ – một commit cho cả lượt.

## 3. Kiểm thử

* `tests/fake-github.mjs`: GitHub giả cài đúng các API dùng tới (contents, git data, commits), sha tệp tính đúng kiểu
  git; dùng trong Node (`fetchFn`) và trong trình duyệt (`page.route`).
* `tests/kho.test.mjs` (7 test): mã bài, repo trống, lưu/mở có ảnh và thu nhỏ, một commit mỗi lần lưu, không gửi lại ảnh
  đã có, xoá ảnh thừa, phát hiện sửa ở máy khác, **hai máy lưu cùng lúc không mất bài**, nhiều hình một bài, nhập hàng
  loạt một commit, buổi dạy, xoá bài gỡ khỏi buổi, lịch sử + mở bản cũ, chủ đề, tìm kiếm/lọc/sắp xếp.
* `tests/browser/smoke6.mjs` (11 kiểm tra – bước 1) và `smoke7.mjs` (22 kiểm tra – kho, gõ/bấm như người dùng: kết nối
  với token sai rồi đúng, Ctrl+S bài mới với tên/nguồn tự điền, lưu tiếp không hỏi, máy khác sửa → hỏi → ghi đè, mất
  mạng → hàng chờ → có mạng tự lưu, nhập 22 bài ví dụ, Ctrl+K tìm "brocard"/lọc IMO/mở, 3 tab thành buổi dạy, phiếu
  .tex cho buổi, mở buổi không trùng).
* `npm test` 141 test đạt; `npm run test:browser` đạt.
* Dựng thử lại 23 bài qua giao diện mới (có menu Kho, nút kho): 23/23 đúng. `npm run test:perf`: ×1 6,78 ms/khung,
  ×4 31,8 ms, p95 16,7–16,8 ms – trong ngưỡng, như bản 1.4 (kho không chạy gì khi kéo điểm).

## 4. Hạn chế

* Cần mạng để lưu/mở kho; bài **mới** cần kết nối được kho lần đầu (khi mất mạng, tạm lưu ra tệp).
* Token nằm trong trình duyệt của máy (chỉ nên dùng máy riêng); token hết hạn thì tạo token mới và dán lại.
* Trang artifact của claude.ai chặn gọi GitHub – kho chỉ dùng được trên GitHub Pages hoặc khi mở `index.html` trên máy.
* Chưa có phần cho học sinh (đã hoãn theo yêu cầu); kho thiết kế sẵn để sau này làm một trang chỉ đọc đề và hình.

# Bản 1.6 – Bớt thao tác: phím tắt công cụ, chọn trước dựng sau; LaTeX chuẩn

Góp ý sau khi dùng: "ít phím tắt, mấy cái dùng nhiều cứ phải bấm 2–3 lần mới tới". Việc làm nhiều nhất: **lấy giao
điểm, vuông góc, song song… rồi ẩn đường**. Thứ hai: **mã LaTeX thiếu, compile ra không chuẩn** (`\overrightarrow`,
`\widehat`). Thầy/cô muốn phím tắt có `Ctrl`.

## 1. Phím tắt và bớt số lần bấm

Trước bản này không có phím tắt nào cho công cụ dựng hình; giao điểm, vuông góc, song song cần 2 lần bấm (mở nhóm, chọn
công cụ), các công cụ trong menu *Công cụ* cần 3.

* **Ctrl + chữ** cho 14 công cụ cơ bản (`src/ui/shortcuts.js`): `Ctrl+P` điểm, `G` giao điểm, `M` trung điểm, `D` đoạn,
  `L` đường thẳng, `Shift+L` tia, `Q` đường tròn, `Shift+O` đường tròn qua 3 điểm, `U` vuông góc, `I` song song (∥),
  `J` chân đường vuông góc, `B` phân giác, `Shift+M` trung trực, `E` đối xứng. Không dùng phím một chữ vì chữ đang dùng
  để gõ tên điểm vừa dựng. Tránh các tổ hợp trình duyệt không cho trang chặn (`Ctrl+N/T/W`, `Ctrl+Shift+Q` – thoát
  Chrome trên Windows) và các phím đã dùng (`Ctrl+S/O/K/H/Z/Y/C/V/X/A`…).
* **Sửa được** (`Ctrl+/`, *Sửa › Phím tắt…*): gán phím cho bất kỳ công cụ nào (cả công cụ trong menu *Công cụ*, công cụ tự
  tạo), bỏ phím, về mặc định; chặn tổ hợp đã dùng; lưu trong trình duyệt. Phím hiện cạnh tên công cụ trên thanh công cụ.
* **Chọn trước, dựng sau** (`App.activateTool`): có đối tượng đang chọn hợp với công cụ thì dựng ngay (hai đường +
  `Ctrl+G`; điểm + đường + `Ctrl+U/I/J`; một đoạn + trung điểm/trung trực; ba đỉnh + tâm nội tiếp…); chọn mới đủ một phần
  thì thành các lần chọn đầu.
* **Tìm công cụ theo tên** (`Space`): không dấu, khớp đầu từ hoặc chữ đầu (`dtnt` → đường tròn nội tiếp), công cụ vừa
  dùng lên trước; `Enter` dùng ngay (cũng áp "chọn trước, dựng sau").
* **Alt + bấm** vào đối tượng: ẩn ngay (một thao tác thay cho chọn rồi `Ctrl+H`).
* Ví dụ "hạ đường cao từ A xuống BC rồi ẩn": trước kia mở nhóm *Dựng* → *Đường vuông góc* → bấm A → bấm BC → mở nhóm
  *Điểm* → *Giao điểm* → bấm chỗ cắt → chọn đường → tích *Ẩn* (≈ 9 thao tác); nay chọn A, BC rồi `Ctrl+J` (chân đường vuông
  góc, không cần đường phụ) – 3 thao tác.

## 2. LaTeX

* **Lỗi `\widehat`, `\overrightarrow` hiển thị sai** (mũ chỉ trùm chữ cuối, mũi tên mất đầu): khi đổi xuống dòng thành
  `<br>`, chương trình đổi cả ký tự xuống dòng trong dữ liệu SVG của KaTeX (dấu mũ, mũi tên là hình SVG). Nay chỉ đổi trong
  chữ thường. Test kiểm tra không có `<br>` trong SVG và độ rộng thật của dấu mũ trên trang.
* **Viết như trong tệp .tex**: `\(…\)`, `\begin{align*}` (và `equation*`, `gather*`…) ngoài `$`, `\textbf`, `\emph`,
  `\underline`, `\\`, `~`, `--`, `\begin{itemize}/{enumerate}` + `\item`, `\%`… – trước đây hiện nguyên chữ thô.
* **Xuất .tex compile được**: trước đây mọi `\` trong chữ bị đổi thành `\textbackslash{}` và xuống dòng trong `$$…$$` bị
  chèn `\\`. Nay chữ được giữ nguyên là LaTeX (chỉ thoát `%`, `&`, `#`, `_`, `^` chưa có `\` để "50%" vẫn đúng), không
  chèn `\\` vào công thức hay quanh `\begin`, `\item`; lời mở đầu thêm `\ssong`, `\vgoc`, `\wideparen` (dự phòng).
  Test mới **biên dịch thật bằng pdflatex** phiếu một bài và phiếu cả buổi có `\widehat`, `\overrightarrow`,
  `\wideparen`, `align*`, `itemize`, `\backsim`, `\measuredangle`, `\nparallel`, tiếng Việt (máy phát triển đã cài
  TeX Live + vntex).
* Gợi ý lệnh khi gõ `\` thêm ~40 lệnh (`widehat`, `overrightarrow`, `wideparen`, `measuredangle`, `backsim`, `textbf`,
  `begin{align*}`…), lệnh có `{}` đặt con trỏ vào trong ngoặc. Tự đổi `hat` → `\widehat{}`; gõ tắt `;gh`.

## 3. Kiểm thử

`npm test` 146 test (thêm 4 test chữ/LaTeX, trong đó 1 test biên dịch bằng pdflatex; test TikZ biên dịch bằng pdflatex
trước đây bị bỏ qua nay chạy được); `npm run test:browser` đạt, thêm `tests/browser/smoke8.mjs` (19 kiểm tra: phím tắt,
chọn trước dựng sau với giao điểm/vuông góc/chân đường vuông góc/song song/chọn một phần, Alt + bấm ẩn và Ctrl+Z,
bảng lệnh "dtnt"/"duong tron ngoai" + Enter dựng ngay trên A, B, C, gán phím mới và chặn phím đã dùng, dấu mũ/mũi tên
vẽ đủ rộng).
Dựng thử lại 23 bài qua giao diện: 23/23 đúng. `npm run test:perf`: ×1 6,67 ms/khung, ×4 31,6 ms, p95 16,7–16,8 ms – đạt
ngưỡng, như trước (phím tắt không chạy gì khi kéo).

## 4. Bổ sung sau góp ý: bấm vào chỗ cắt, phím tắt cho điểm đặc biệt

* **Công cụ Chọn: bấm vào chỗ hai đường cắt nhau là có giao điểm** (như Sketchpad; `App.crossingAt`): trong bán kính 9 px
  quanh chỗ cắt mà chưa có điểm. Rê chuột tới thì hiện trước một chấm xanh, con trỏ đổi, dòng gợi ý *"Bấm để lấy giao
  điểm của d1 và d2"* – không bấm nhầm. Giữ `Shift` thì vẫn là chọn đường (chọn nhiều). Bấm lại chỗ đó thì chọn điểm vừa
  có, không tạo trùng. (Công cụ Điểm và mọi công cụ cần chọn điểm vốn đã dùng giao điểm khi bấm vào chỗ cắt.)
* **Phím tắt cho điểm đặc biệt**, theo quy tắc `Shift` + phím của đường tạo ra nó: `Ctrl+Shift+U` trực tâm, `Ctrl+Shift+B`
  tâm nội tiếp, `Ctrl+Shift+G` trọng tâm, `Ctrl+Shift+O` đường tròn ngoại tiếp (kèm tâm O). Chọn sẵn ba đỉnh là dựng ngay.
* Công cụ không dựng gì mới vì điểm đã có (trực tâm H có sẵn): chọn lại điểm đó, báo *Đã có sẵn trên hình: H*.
* smoke8 thêm 5 kiểm tra (trực tâm có sẵn, Ctrl+M với đoạn đang chọn, rê chuột báo trước, bấm chỗ cắt ra giao điểm, bấm
  lại không trùng). Dựng thử 23/23 đúng, số thao tác không đổi (1027); hiệu năng ×1 6,65 ms/khung.

# Bản 1.7 – Quỹ tích, điểm cố định, góc bằng góc, đường phụ, chọn vùng, chép/dán

Góp ý sau khi dựng Bài 16 (tam giác ABC, P trong tam giác, Q trên đường đẳng giác, E, F với ∠AQE = ∠PCB, ∠AQF = ∠PBC,
tiếp tuyến TR, đường tròn (U) qua R – chứng minh (U) đi qua điểm cố định): "chưa có quỹ tích", "công cụ không cho chọn
nhiều đối tượng cùng lúc", "câu hình này dựng kiểu gì cho dễ". Dựng thử Bài 16 trên bản 1.6 thì vướng: không chép được góc
(phải quay bằng `rotate_by` rồi đoán chiều), quá nhiều đường phụ che hình, không có cách thấy điểm cố định, điểm P "trong
tam giác" kéo ra ngoài được. Thầy/cô duyệt mọi đề xuất trừ "hiện mờ hai nghiệm để chọn"; giữ kéo nền = dời hình.

## 1. Đã làm

* **Góc bằng góc** (`angle_line`, `angle_point`): góc mẫu lấy trên hình (kéo hình thì góc đổi theo). Chiều chọn bằng chuột:
  đường xem trước đi theo phía chuột, bấm là xong (`App.extraFlip`); điểm trên đường thì bấm gần chỗ điểm cần lấy. Cơ chế
  chung "bấm thêm một lần sau khi chọn đủ" (`tool.extraClick`, `App.picksDone`) dùng cho cả điểm trong tam giác.
* **Điểm trong tam giác** (`point_in`, tham số u, v): bậc tự do mới – kéo được, kẹp vào trong tam giác; bộ khám phá chỉ thử
  vị trí trong tam giác; công cụ tự tạo coi nó là đầu vào.
* **Điểm cố định** (`fixed_point`): dời thử điểm thay đổi tới 6 vị trí cố định (bước dời theo cỡ hình *trước* bước đó, để
  khi kéo và khi tính lại toàn bộ cho cùng kết quả), giao vị trí hiện tại của đường với hai vị trí đầu, giữ nghiệm nằm trên
  mọi vị trí. Bài 16 tìm ra X = (0,5; 3,5) trên AC; đường AD (D chạy trên BC) → A; họ đường song song → không có. Điểm cố
  định là điểm thật của hình: nối, lấy giao, khám phá tiếp được.
* **Quỹ tích** (`locus`, 160 mẫu, ngắt ở chỗ không xác định và bước nhảy bất thường) – vẽ, chọn, xuất TikZ (`plot
  coordinates`). **Vết** khi kéo (điểm: chấm; đường thẳng/đường tròn: nét mờ) – không lưu vào hình, *Hiển thị › Xoá vết*.
* **Đo**: độ dài, góc (độ), tỉ số; số hiện trên hình có nền mờ, cập nhật khi kéo, kéo chữ để dời.
* **Đường phụ** (`step.aux`): đường vuông góc, song song, trung trực, phân giác, góc bằng góc dựng thêm tự là đường phụ –
  nét đứt, xám. `Ctrl+Shift+D` ẩn/hiện tất cả (`doc.hideAux`, lưu theo hình; không vẽ, không bấm trúng, không vào TikZ).
  Thẻ thuộc tính: bỏ *Đường phụ* để thành đường chính.
* **Ctrl + kéo chọn vùng** (Shift: chọn thêm): điểm trong khung và mọi đối tượng dựng hoàn toàn từ chúng. Kết hợp với "chọn
  trước, dựng sau" của bản 1.6.
* **Chép/dán** (`Ctrl+C`/`Ctrl+V`): kèm đối tượng cha, dán được sang tab khác (giữ tên) hoặc chính hình đó (dời đi, tên mới);
  clipboard chứa JSON nên dán được sang cửa sổ khác.
* **Sửa đối tượng cha**: thẻ thuộc tính › *Dựng từ* › bấm tên cha › bấm đối tượng mới. Chặn vòng phụ thuộc; các bước được
  sắp lại theo thứ tự dựng được (`topoOrder`), hoàn tác được.
* Lõi Python (`lab/core`) có đủ các bước mới, cho **cùng kết quả số** với JS (dữ liệu đối chiếu thêm Bài 16 và một hình quỹ
  tích – điểm cố định).

## 2. Kiểm thử

`npm test` 151 test (thêm 5 test lõi: góc bằng góc hai phía, điểm trong tam giác, điểm cố định của đường thẳng/đường tròn/họ
song song, quỹ tích đường trung bình và quỹ tích trực tâm, số đo). Test Python đạt (đối chiếu JS gồm các ca bản 1.7).
`npm run test:browser` đạt, thêm `tests/browser/smoke9.mjs` (40 kiểm tra: chọn phía góc bằng chuột, điểm E trên AC với
∠EBC = ∠BAC, điểm trong tam giác và kéo ra ngoài, quỹ tích, vết, điểm cố định, ba số đo và kéo chữ, Ctrl + kéo chọn vùng,
kéo nền vẫn dời hình, đường phụ và Ctrl+Shift+D, TikZ, chép/dán cùng tab – sang tab – qua sự kiện clipboard, sửa đối tượng
cha, chặn vòng, hoàn tác). `npm run test:perf` đạt ngưỡng (×1 3,7 ms/khung, ×4 13,9 ms, p95 16,7 ms).

## 3. Hạn chế

* Điểm cố định tìm bằng số: họ đường mà vị trí thử bị suy biến (đường không xác định ở vị trí thử) có thể báo "không có"
  dù có; điểm cố định nằm rất xa hình bị bỏ qua.
* Quỹ tích chỉ theo điểm chạy trên đường (`point_on`); quỹ tích theo điểm trong miền chưa làm. Quỹ tích tính lại mỗi khung
  khi kéo (160 lần dựng lại phần phụ thuộc) – hình rất lớn có nhiều quỹ tích có thể chậm.
* Chép/dán không mang theo khung chữ, ảnh.

# Bản 1.8 – Gõ lệnh, điểm thoả điều kiện, kiểm tra nhận định, trường hợp đặc biệt, kéo không nhảy, Asymptote

Sau khi tìm hiểu nhu cầu với phần mềm vẽ hình (nghiên cứu về giáo viên dùng phần mềm hình học động, công cụ tự kiểm chứng
Relation/Prove của GeoGebra, các nghiên cứu dựng hình Olympic tự động, cộng đồng AoPS), thầy/cô duyệt 6 việc (bỏ "quỹ tích
thành đường thật").

## 1. Đã làm

* **Kiểm tra nhận định** (`src/explore/check.js`): 11 loại (trùng, thẳng hàng, đồng viên, bằng nhau – đoạn/4 điểm, góc bằng
  nhau, thuộc đường thẳng/đường tròn, vuông góc, song song, đồng quy, tiếp xúc). Chỉ tính phần hình mà nhận định phụ thuộc;
  80 hình ngẫu nhiên hợp lệ (xen kẽ xê dịch nhỏ/lớn, bỏ hình suy biến hoặc đổi dạng như bộ khám phá – bộ lấy mẫu tách thành
  `makeSampler` dùng chung) cộng các trường hợp đặc biệt. Kết luận: luôn đúng / sai / không luôn đúng (phản ví dụ đặt được
  vào hình) / không xác định; liệt kê *sai khi*, *không xác định khi*, *đúng khi*. Vd O, H, G: luôn đúng, suy biến khi tam giác
  đều; O, I, H: sai, đúng khi tam giác cân (đúng như ProveDetails của GeoGebra báo điều kiện không suy biến).
* **Trường hợp đặc biệt** (`src/explore/special.js`) dùng cho kiểm tra và cho nút *Đưa về* ở thẻ thuộc tính: tam giác cân /
  vuông tại từng đỉnh, đều (dời một đỉnh tự do, giữ hai đỉnh kia); điểm trên cạnh về trung điểm, chân đường cao, chân phân
  giác; điểm trên đường tròn về điểm đối tâm của các điểm khác trên đó; điểm trong tam giác về trọng tâm, tâm nội tiếp, (tam
  giác nhọn) trực tâm, tâm ngoại tiếp.
* **Điểm thoả điều kiện** (`solve_point`): Newton với đạo hàm số; một điều kiện thì chiếu về đường r = 0 (điểm chạy trên quỹ
  tích, kéo được), hai điều kiện giải hệ 2×2. Xuất phát từ chỗ bấm nên ra nghiệm gần đó; khi kéo hình xuất phát từ nghiệm
  trước (đi liên tục). Lõi Python có bản giống hệt; dữ liệu đối chiếu thêm Brocard, PB = PC & ∠BPC = 120°, ∠BRC = 90° (một
  điều kiện), điểm chính giữa cung, điểm trên đoạn.
* **Gõ lệnh tiếng Việt** (`src/core/cmd.js`, trong bảng lệnh `Space`): ~20 mẫu lệnh dựng, lệnh "thoả/sao cho", lệnh "kiểm tra".
  Tách tên điểm theo tên có thật trên hình (khớp dài nhất: `I_AB` → I_A, B); đường/đường tròn chưa có thì tự dựng (đường
  thẳng thành đường phụ); giao điểm đã có thì lấy giao điểm còn lại, hai giao điểm đều có / giao điểm trùng điểm có sẵn thì
  báo thay vì dựng trùng. Báo lỗi ngay khi gõ; gõ vài chữ hiện mẫu lệnh.
* **Kéo không nhảy**: rà 28 hình mẫu (kéo từng điểm tự do một vòng, 240 bước, hai bán kính): 14 lần giao điểm/tiếp điểm nhảy
  sang nghiệm kia (vd IMO 2017/4: A nhảy rất xa; IMO 2018/1: G nhảy 0,57 cỡ hình). Nay khi kéo, nếu nghiệm đang chọn ở xa vị
  trí cũ còn nghiệm kia ở sát thì đổi `which` (ghi vào hình): còn 7 lần, đều là "giao điểm thứ hai khác Q" đi qua chỗ tiếp
  xúc (hai nghiệm sát nhau – mơ hồ thật, độ nhảy ≤ 0,12 cỡ hình).
* **Xuất Asymptote** (`src/export/asy.js`): như TikZ (biến pair theo nhãn, đường thẳng vừa đủ, màu, nét đứt, cung góc, vạch,
  hướng nhãn, quỹ tích). 28 hình mẫu biên dịch được bằng `asy`.
* Sửa thêm: bộ khám phá Python thiếu nhánh xê dịch điểm trong tam giác (lệch với JS từ bản 1.7) – đã bổ sung.

## 2. Kiểm thử

`npm test` 165 test (thêm `check.test.mjs` 6, `cmd.test.mjs` 6, `asy.test.mjs` 2 – biên dịch thật bằng asy nếu máy có).
Test Python đạt (đối chiếu gồm các ca bản 1.8, cả khám phá trên hình có điểm trong tam giác). `npm run test:browser` đạt,
thêm `smoke10.mjs` (28 kiểm tra: lệnh dựng, mẫu lệnh, báo lỗi, hoàn tác, Brocard và kéo đỉnh, công cụ điểm thoả điều kiện
– gõ sai hỏi lại, kéo sang nghiệm kia; kiểm tra O, H, G / O, I, H và "xem" trường hợp cân; lệnh kiểm tra; đưa về vuông, chân
đường cao; xuất Asymptote). `npm run test:perf` đạt (×1 4,3 ms/khung, ×4 16,9 ms, p95 16,8 ms).

## 3. Hạn chế

* Kiểm tra nhận định là kiểm tra bằng số (sai số tương đối 10⁻⁷) – rất tin được nhưng không phải chứng minh; trường hợp đặc
  biệt chỉ gồm các dạng kể trên (chưa có "hai điểm trùng nhau", "đường song song"…).
* Điểm thoả điều kiện: tối đa hai điều kiện, các loại góc/độ dài/thuộc đường; điều kiện tỉ số, góc có hướng chưa có.
  Gần chỗ hai nghiệm nhập lại, Newton có thể không hội tụ (điểm tạm không xác định, kéo tiếp thì có lại).
* Lệnh tiếng Việt chỉ hiểu các mẫu đã liệt kê (xem `COMMAND_EXAMPLES` trong `src/core/cmd.js`).

# Bản 1.9 – Khám phá: thước đo, đoạn/góc bằng nhau, mục tiêu, điểm phụ, bộ máy suy luận

Góp ý: "Khám phá" hơi yếu. Phân tích kỹ thì bộ khám phá cũ chỉ *liệt kê* quan hệ đúng về số; với người học Olympic, cái
thiếu là (1) biết quan hệ nào **đáng chú ý** (không suy ra ngay từ cách dựng), (2) **vì sao** đúng, (3) đi **về phía điều cần
chứng minh**, và (4) gợi ý **điểm phụ** – chỗ khó nhất của một bài hình. Làm 5 việc, việc đầu là thước đo để biết có tiến bộ thật.

## 1. Đã làm

* **Thước đo** (`tests/kham-pha/`): 23 bài mẫu, 28 kết luận và 8 bổ đề then chốt (có bổ đề kèm điểm phụ của lời giải
  chính thức), viết bằng lệnh kiểm tra tiếng Việt; mỗi phát biểu tự kiểm bằng số trước khi đo (đã bắt được một bổ đề nhớ sai).
  Đo: kết luận có được báo không, hạng mấy; bổ đề có được báo không; chứng minh được không (có / cần điểm phụ); điểm phụ của
  lời giải chính thức có trong 5 gợi ý đầu không. `tests/kham-pha.test.mjs` chặn thụt lùi.
* **Bộ máy suy luận** (`src/explore/deduce.js`, JS, chạy trong trình duyệt): góc có hướng mod 180° là phương trình tuyến tính
  trên hướng đường thẳng, độ dài theo log (tỉ số, phương tích PA·PB = PC·PD); khử Gauss modulo một số nguyên tố, mỗi dòng nhớ
  lý do để dựng lại chứng minh. Giả thiết lấy từ cách dựng (~40 loại bước: vuông góc, song song, phân giác, đẳng giác, tiếp
  tuyến, tâm các loại, trung điểm, đối xứng, phép quay/vị tự/đồng dạng quay, giao điểm, điểm thoả điều kiện…). Vòng lặp đóng
  kín: góc nội tiếp, góc ở tâm, tiếp tuyến – dây, Thales, đường kính, tam giác cân hai chiều, tam giác đồng dạng (g.g → tỉ
  số), phương tích, trục đẳng phương, đảo phương tích; ứng viên thẳng hàng/đồng viên/đồng dạng lấy từ số, chỉ thành sự kiện
  khi suy ra được. Có cây giải thích (giả thiết → các bước, mỗi bước ghi quy tắc).
* **Đại lượng**: đoạn bằng nhau (gộp lớp; chung một đầu mút thì báo "X cách đều A, B, C (X là tâm …)"), góc bằng nhau.
* **Lớp `discover()`** (`src/explore/discover.js`) bọc bộ khám phá cũ (giữ nguyên để đối chiếu với lab Python): gom điểm cùng
  thuộc một đường tròn/đường thẳng thành một dòng, bỏ trùng; trạng thái *hiển nhiên* / *chứng minh được* / *sâu*; xếp hạng
  theo độ "lạ", độ lớn, mức xa giả thiết và độ gần mục tiêu.
* **Mục tiêu** (bước đệm): gõ như lệnh kiểm tra hoặc lấy từ đối tượng đang chọn; thẻ mục tiêu (đúng?/chứng minh được?/vì sao);
  quan hệ dính tới mục tiêu lên đầu; từ một quan hệ có thể *Đặt làm mục tiêu*, *Chèn vào lời giải*.
* **Điểm phụ** (`src/explore/aux.js`): dựng thử giao điểm thứ hai của đường với đường tròn, trung điểm, chân đường vuông góc,
  điểm đối tâm, tâm ngoại tiếp, giao điểm hai đường tròn ngoại tiếp (Miquel), tâm đồng dạng quay; với mỗi điểm chạy lại bộ máy
  (giới hạn 6 giây), xếp: làm mục tiêu chứng minh được → nhiều quan hệ mới không hiển nhiên. Xem trước khi rê chuột, *Dựng* để
  thêm.
* Giao diện thẻ Khám phá viết lại (`src/ui/explorePanel.js`): nhãn trạng thái, "Vì sao?", tự khám phá lại 0,7 s sau khi hình đổi.
  Lệnh kiểm tra thêm `góc X + góc Y = 180`, "trùng" cho hai đường; trong lệnh kiểm tra "PQ" luôn là đường qua P, Q (trước đây
  có thể bắt nhầm một đường khác trùng về số).

## 2. Kết quả đo (trước → sau)

| Chỉ số | Bộ khám phá cũ | Bản 1.9 |
|---|---|---|
| Kết luận được báo (28) | 23 | **26** |
| Kết luận trong 3 dòng đầu | 13 | **16** |
| Kết luận chứng minh được (không điểm phụ) | 0 (không có bộ chứng minh) | **4** |
| … chứng minh được nhờ điểm phụ tự tìm | 0 | **+3** (IMO 2013/4, IMO 2015/4, VMO 2014/4b) |
| Bổ đề then chốt được báo (8) | 3 | **5** |
| Bổ đề chứng minh được (8) | — | **6** |
| Điểm phụ của lời giải chính thức trong 5 gợi ý đầu | — | **2/2** (đều đứng #1) |

IMO 2013/4: điểm phụ gợi ý đầu là giao điểm thứ hai của XY với (BWN), chứng minh X, Y, H thẳng hàng bằng trục đẳng phương – đúng
lời giải chính thức. Thời gian: khám phá cả 23 bài 0,6 s (cũ 0,13 s); tìm điểm phụ tối đa 6 s mỗi lần (trang đứng trong lúc tìm).

## 3. Kiểm thử

`npm test` 167 test (thêm `kham-pha.test.mjs`: ngưỡng thước đo, ca IMO 2013/4 có điểm phụ). Bộ khám phá cũ giữ nguyên – dữ liệu đối
chiếu JS/Python không đổi, test Python đạt. `npm run test:browser` thêm `smoke11.mjs` (khám phá tự do, mục tiêu gõ tay chứng minh
được + vì sao + chèn vào lời giải, mục tiêu từ đối tượng đang chọn, tìm và dựng điểm phụ rồi chứng minh được, đặt mục tiêu từ
một quan hệ, tự khám phá lại).

## 4. Hạn chế

* Bộ máy chỉ biết biến đổi góc/độ dài và các quy tắc kể trên: chưa có Menelaus/Ceva, tỉ số kép, nghịch đảo, toạ độ/số phức;
  2 kết luận vẫn không được báo, 21/28 kết luận chưa chứng minh được kể cả với điểm phụ. "Sâu" nghĩa là bộ máy chưa đủ sức,
  không phải chắc chắn khó.
* Chứng minh bỏ qua điều kiện không suy biến và thứ tự điểm (góc có hướng mod 180° nên không phân biệt hai phía).
* Điểm phụ chỉ thử một điểm mỗi lần, trong các dạng kể trên; bài cần hai điểm phụ hoặc một đường tròn phụ thì chưa tìm được.
* Tìm điểm phụ trên toàn bộ thước đo mất ~28 s nên chỉ chạy bằng dòng lệnh (`--diem-phu`), không nằm trong `npm test`.
