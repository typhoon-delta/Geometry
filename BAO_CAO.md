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
