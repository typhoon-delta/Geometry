# TyphoonDelta Geometry

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
* **Nhiều tab hình** cùng lúc (mỗi tab có lịch sử hoàn tác riêng).
* **Khung chữ** nổi trên bảng vẽ (bản 1.4): *Đề bài* (dán ảnh cắt đề bằng `Ctrl+V`), *Lời giải*, *Ghi chú* – chữ và
  công thức LaTeX hiển thị ngay (KaTeX, chạy offline), bộ soạn gõ nhanh (tự đổi `goc` → ∠, gõ tắt `;cm` + Tab…),
  lời giải chia **bước** hiện dần khi trình bày, rê chuột lên tên điểm trong công thức thì điểm sáng lên trên hình.
  Xuất **phiếu LaTeX** (đề + hình TikZ + lời giải).
* **Kho bài tập** trên GitHub (bản 1.5): một repo riêng tư của thầy/cô; `Ctrl+S` lưu bài (tên, nguồn, chủ đề, thẻ, độ
  khó), `Ctrl+K` tìm và mở lại ở máy nào cũng được, **buổi dạy** (mở một lần đủ các bài, xuất phiếu cho cả buổi), giữ
  lịch sử mọi lần sửa, mất mạng thì tự lưu sau – xem [`docs/KHO_BAI.md`](docs/KHO_BAI.md).
* Chia sẻ bằng link, lưu/mở tệp `.json` (một hình hoặc **mọi tab trong một tệp**), tự lưu nháp mọi tab kèm lịch sử để
  khôi phục.
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

* Thanh menu trên cùng: **Tệp** (hình mới, mở, lưu, chia sẻ link, xuất TikZ, xuất phiếu LaTeX), **Sửa** (hoàn tác,
  làm lại, xoá, ẩn/hiện đối tượng, mở khoá ảnh nền), **Hiển thị** (bộ kiểu *Đơn sắc* / *Sách giáo khoa*, lưới, đường thẳng vừa đủ, thu phóng vừa hình,
  bảng các bước), **Chèn** (khung lời giải, khung đề bài, khung ghi chú, ảnh đề bài, ảnh nền để đồ hình, bộ gõ tắt), **Ví dụ** (thư viện bài dựng sẵn theo nhóm và các hình mẫu). Bên cạnh là **dải tab** các hình
  đang mở: bấm để đổi hình (hoặc `Alt+1`…`Alt+9`, `Alt+PageUp`/`Alt+PageDown`), nháy đúp vào tab đang mở để đặt tên hình, ✕ để đóng, ＋ để mở hình mới. *Hình mới*, mở
  tệp, mở ví dụ, mở link đều mở ở tab mới (nếu tab đang mở còn trống thì dùng luôn tab đó).
  Các nút biểu tượng bên phải: hoàn tác, làm lại, 🔍 khám phá, ▶ trình bày, ⛶ trình chiếu, ◫ bảng các bước.
* **Thanh công cụ dọc** bên trái: mỗi biểu tượng là một nhóm (chọn/kéo, điểm, đường tròn, đoạn/tia/đường thẳng,
  dựng, đánh dấu, **Công cụ**). Bấm biểu tượng để dùng công cụ đang chọn của nhóm, đồng thời danh sách công cụ
  trong nhóm hiện ra để đổi. Gợi ý thao tác nằm ở dòng nhỏ góc dưới bảng vẽ. Dưới cùng là dải **công cụ vừa dùng**
  (6 công cụ gần nhất, bấm một lần là chọn lại – đỡ phải mở menu nhiều tầng).
* Bảng **các bước dựng** ẩn mặc định để dành chỗ cho bảng vẽ (nút ◫ để mở). Khi chọn một đối tượng bằng công cụ
  Chọn, thẻ **thuộc tính** nổi lên ở góc phải (tự dời xuống nếu che đối tượng đang chọn; khi đang dựng thì không hiện).

### Dựng hình

Chọn công cụ rồi bấm lên bảng vẽ; dòng gợi ý cho biết cần chọn gì tiếp.

**Lấy giao điểm**: với công cụ **Chọn** (mặc định), rê chuột tới chỗ hai đường cắt nhau mà chưa có điểm thì hiện một
chấm xanh và dòng gợi ý *"Bấm để lấy giao điểm của …"* – bấm là có giao điểm, chọn sẵn để gõ tên luôn. Công cụ Điểm
và mọi công cụ cần chọn điểm cũng vậy: bấm vào chỗ cắt là dùng giao điểm.

**Phím tắt công cụ (bản 1.6)** – khỏi mở menu:

| Phím | Công cụ | Phím | Công cụ |
|---|---|---|---|
| `Ctrl+G` | Giao điểm | `Ctrl+P` | Điểm |
| `Ctrl+M` | Trung điểm (chọn sẵn một đoạn: dựng ngay) | `Ctrl+Shift+M` | Trung trực |
| `Ctrl+U` | Đường vuông góc | `Ctrl+Shift+U` | Trực tâm |
| `Ctrl+B` | Phân giác | `Ctrl+Shift+B` | Tâm nội tiếp |
| `Ctrl+I` | Đường song song | `Ctrl+Shift+G` | Trọng tâm |
| `Ctrl+J` | Chân đường vuông góc (hình chiếu) | `Ctrl+Shift+O` | Đường tròn ngoại tiếp (kèm tâm O) |
| `Ctrl+D` | Đoạn thẳng | `Ctrl+Q` | Đường tròn (tâm, điểm) |
| `Ctrl+L` / `Ctrl+Shift+L` | Đường thẳng / tia | `Ctrl+E` | Đối xứng |

Điểm đặc biệt = `Shift` + phím của đường tạo ra nó (trực tâm – đường vuông góc, tâm nội tiếp – phân giác…). Gọi công cụ mà
điểm cần dựng đã có (vd trực tâm H) thì chương trình chọn lại điểm đó và báo *Đã có sẵn*, không dựng trùng. Phím tắt hiện cạnh tên công cụ trên thanh công cụ; **sửa hay thêm** phím cho bất kỳ công cụ nào
(kể cả công cụ trong menu *Công cụ*) ở *Sửa › Phím tắt…* (`Ctrl+/`).

* **Chọn trước, dựng sau**: đang chọn sẵn đối tượng (công cụ Chọn, giữ `Shift` để chọn nhiều) thì phím tắt dựng ngay trên
  chúng – chọn hai đường rồi `Ctrl+G` là có giao điểm; chọn điểm và đường rồi `Ctrl+U` / `Ctrl+I` / `Ctrl+J`; chọn ba
  đỉnh rồi gọi *Tâm nội tiếp*. Chọn mới đủ một phần thì đó là các lần chọn đầu, bấm nốt phần còn lại.
* **Tìm công cụ theo tên** (`Space`): gõ vài chữ không dấu – `giao`, `vuong goc`, `duong tron ngoai`, hay chữ đầu `dtnt`
  (đường tròn nội tiếp) – rồi `Enter`. Tìm được mọi công cụ, kể cả công cụ tự tạo.
* **Alt + bấm** vào một đối tượng: ẩn ngay (vd đường phụ sau khi đã lấy giao điểm). `Ctrl+Z` để hiện lại.

* **Bấm vào chỗ trống** khi công cụ cần một điểm: tạo **điểm tự do**. Giữ **`Shift`** khi bấm thì hướng từ điểm vừa
  chọn tới điểm mới được bắt về bội số của 15° – vd dựng tam giác: chọn B, giữ Shift chọn C → cạnh BC nằm ngang
  thật chính xác (hình xem trước cũng được căn theo).
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
* Ảnh của một điểm qua **phép biến hình** (đối xứng, quay, vị tự, tịnh tiến, nghịch đảo, đồng dạng) tự lấy tên điểm
  tạo ảnh thêm dấu phẩy: A → A′, ảnh của A′ → A″. Các công cụ dựng hình (tam giác đều, hình vuông…) vẫn đặt C, D.
* Bấm vào chỗ nhiều đường cùng đi qua: giao điểm dựng từ hai đường **dựng sau cùng**. Hai điểm trùng chỗ: bấm chọn
  điểm dựng sau (nằm trên).
* Điểm vừa dựng nằm ngoài khung nhìn: chương trình nhắc; phím `Home` thu phóng vừa hình.
* `Esc`: huỷ thao tác đang dở / về công cụ Chọn.

### Bản 1.7: góc bằng góc, điểm trong tam giác, quỹ tích, điểm cố định, đo

* **Đường tạo góc bằng góc cho trước** (nhóm *Dựng*): chọn góc mẫu (điểm trên cạnh – **đỉnh** – điểm trên cạnh), rồi đỉnh O
  của góc cần dựng và điểm X trên cạnh có sẵn; **rê chuột sang phía muốn dựng** (đường xem trước đi theo) rồi bấm.
* **Điểm trên đường tạo góc bằng góc cho trước**: như trên, rồi chọn đường chứa điểm cần lấy – bấm **gần chỗ điểm cần
  lấy** để chọn phía. Vd đề "E trên AC sao cho ∠AQE = ∠PCB": góc mẫu P, C, B; đỉnh Q; điểm A; đường AC.
* **Điểm trong tam giác** (nhóm *Điểm*): chọn ba đỉnh rồi bấm vào trong tam giác. Kéo thì điểm luôn ở trong tam giác
  (ra ngoài thì dừng ở cạnh); khám phá chỉ thử các vị trí trong tam giác.
* **Quỹ tích** (nhóm *Quỹ tích, điểm cố định*): chọn điểm cần vẽ quỹ tích rồi điểm chạy (điểm trên đường thẳng/đường tròn,
  dựng bằng công cụ Điểm bấm lên đường). Quỹ tích cập nhật khi kéo các điểm khác.
* **Vết**: chọn một điểm (đường thẳng, đường tròn) → tích *Để lại vết khi kéo* ở thẻ thuộc tính, rồi kéo điểm khác.
  *Hiển thị › Xoá vết*. Vết không lưu vào hình.
* **Điểm cố định**: chọn đường thẳng/đường tròn thay đổi và điểm thay đổi (điểm tự do, trên đường, trong tam giác) – thứ tự
  bất kỳ. Chương trình dời thử điểm đó, giao các vị trí của đường rồi dựng điểm cố định (đường tròn: có thể hai điểm),
  hoặc báo không có. Điểm cố định là một điểm dựng được, dùng tiếp được (nối, lấy giao…).
* **Đo** (nhóm *Đánh dấu, đo*): độ dài AB (bấm vào đoạn được luôn), góc ABC (độ), tỉ số AB/CD – số hiện trên hình, cập nhật
  khi kéo; kéo chữ để dời chỗ.
* **Đường phụ**: đường vuông góc, song song, trung trực, phân giác, góc bằng góc dựng thêm là **đường phụ** – nét đứt, nhạt
  hơn. `Ctrl+Shift+D` (*Hiển thị › Hiện các đường phụ*) ẩn/hiện **tất cả** cùng lúc (điểm dựng từ chúng vẫn hiện; TikZ
  cũng bỏ). Muốn một đường là đường chính: bỏ tích *Đường phụ* ở thẻ thuộc tính (và ngược lại).
* **Ctrl + kéo nền**: chọn vùng – mọi điểm trong khung cùng các đối tượng dựng hoàn toàn từ chúng (đoạn, đường tròn, đường
  vuông góc…); thêm `Shift` để chọn thêm. Kéo nền không `Ctrl` vẫn là dời hình.
* **Chép / dán** (`Ctrl+C` / `Ctrl+V`): chép các đối tượng đang chọn kèm mọi đối tượng cha; dán sang **tab khác** (giữ tên)
  hoặc vào chính hình đó (bản sao dời đi một chút, tên mới).
* **Sửa đối tượng cha**: chọn một đối tượng, ở thẻ thuộc tính mục *Dựng từ* bấm tên đối tượng cha muốn thay rồi bấm đối
  tượng thay thế trên hình – vd trung điểm AB thành trung điểm AD, các đối tượng dựng sau vẫn giữ nguyên.

### Bản 1.8: gõ lệnh, điểm thoả điều kiện, kiểm tra nhận định

* **Gõ lệnh dựng hình** (bảng lệnh `Space`, có dấu hay không dấu đều được): `M = trung điểm BC`, `H = trực tâm ABC`,
  `(ABC)`, `qua A vuông góc BC`, `trung trực BC`, `phân giác góc BAC`, `D = chân đường cao từ A xuống BC`,
  `A' = đối xứng A qua BC`, `K = AD cắt BC`, `S = (AEF) cắt (O)`, `E = AC cắt (O) khác A`, `đường tròn đường kính BC`,
  `P = điểm trên (O)`, `tiếp tuyến tại A của (O)`… Gõ tới đâu báo tới đó (lệnh hiểu thành gì, hoặc lỗi như *Chưa có điểm X*);
  gõ vài chữ (`truc tam`, `cat`) thì hiện mẫu lệnh. `BC` là đường có sẵn qua B, C (chưa có thì tự dựng thành đường phụ),
  `(O)` là đường tròn tâm O, `(ABC)` là đường tròn qua A, B, C (chưa có thì dựng). Cắt nhau mà một giao điểm đã có thì
  lấy giao điểm còn lại; hai giao điểm mới thì lấy cái gần con trỏ chuột. `Ctrl+Z` bỏ lệnh vừa dựng.
* **Điểm thoả điều kiện** (nhóm *Điểm*, hoặc gõ lệnh): bấm vào chỗ **gần** điểm cần tìm rồi gõ một hoặc hai điều kiện:
  `P thoả góc PAB = góc PBC, góc PBC = góc PCA` (điểm Brocard), `Q sao cho QB = QC, góc BQC = 120`,
  `R thoả R thuộc (O), RB = RC`. Điều kiện: `góc XYZ = góc UVW`, `góc XYZ = 60`, `XY = ZT`, `P thuộc (O)` / `P thuộc BC`.
  Kéo hình thì điểm đi theo, luôn thoả điều kiện; kéo chính điểm đó để chọn nghiệm khác (hai điều kiện) hoặc cho nó chạy
  trên quỹ tích của điều kiện (một điều kiện).
* **Kiểm tra nhận định**: chọn các đối tượng (theo thứ tự) → thẻ thuộc tính hiện nút *Kiểm tra*: thẳng hàng (3 điểm), cùng
  thuộc một đường tròn / bằng nhau AB = CD (4 điểm), góc bằng nhau (6 điểm: ∠ABC = ∠DEF), vuông góc / song song (2 đường),
  đồng quy (3 đường), tiếp xúc, thuộc đường, trùng nhau. Hoặc gõ `kiểm tra A, B, C thẳng hàng`, `kiểm tra AB = CD`…
  Chương trình thử vài chục hình ngẫu nhiên và các trường hợp đặc biệt rồi báo: **luôn đúng** (kèm *sai khi …* / *không
  xác định khi …* – vd tam giác đều), **sai**, hoặc **không luôn đúng** (đúng trên hình đang vẽ nhưng có phản ví dụ – nút
  *Xem phản ví dụ*), kèm *đúng khi …* (vd O, I, H thẳng hàng khi tam giác cân). Bấm *xem* cạnh một trường hợp để đưa hình về
  trường hợp đó. Là kiểm tra bằng số, không thay cho chứng minh.
* **Đưa về trường hợp đặc biệt**: chọn một điểm → thẻ thuộc tính *Đưa về*: tam giác cân / vuông tại đỉnh đó, đều; điểm trên
  cạnh về trung điểm, chân đường cao, chân phân giác; điểm trên đường tròn về điểm đối tâm; điểm trong tam giác về trọng tâm,
  tâm nội tiếp, trực tâm, tâm ngoại tiếp. `Ctrl+Z` để trở lại.
* **Kéo không nhảy**: khi kéo, giao điểm và tiếp điểm bám nghiệm gần vị trí cũ (trước đây có lúc nhảy sang giao điểm kia).
* **Xuất Asymptote** (*Tệp › Xuất Asymptote…*): mã Asymptote thuần, dán vào AoPS giữa `[asy]` và `[/asy]`.

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

* Công cụ **Chọn / kéo**: kéo điểm tự do hoặc điểm trên đối tượng (giữ **`Shift`** khi kéo điểm tự do: đoạn/đường
  nối với điểm đó được bắt về nằm ngang, thẳng đứng hoặc bội số của 15°); kéo **nhãn** để dời nhãn; kéo nền để dời cả
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
* *Tệp › Lưu hình này ra tệp* (`Ctrl+S` khi chưa kết nối kho): tải về tệp `.json` của tab đang mở.
  *Tệp › Lưu tất cả các tab* (`Ctrl+Shift+S`): mọi tab vào **một** tệp (giữ thứ tự, tab đang mở, chỗ đang phóng to,
  khung chữ, ảnh). *Tệp › Mở tệp* (`Ctrl+O`, chọn được nhiều tệp) hoặc **kéo thả** tệp `.json` vào bảng vẽ: tệp nhiều tab
  mở ra đủ các tab; hình đang mở rồi thì không mở trùng.
* Tab có thay đổi chưa lưu (ra tệp hoặc kho) có **chấm cam** cạnh tên. Đóng tab đã lưu thì không hỏi; lỡ đóng thì
  *Tệp › Mở lại hình vừa đóng*.
* Các hình đang mở (mọi tab, kèm ảnh) được **tự lưu nháp** trong trình duyệt và khôi phục khi mở lại trang (ảnh lớn
  lưu trong IndexedDB, chứa được hàng trăm MB). Chương trình tự chụp lại các hình 5 phút một lần (12 bản gần nhất):
  *Tệp › Khôi phục bản nháp cũ…* mở lại các hình của một mốc giờ thành tab mới.
* **Kho bài** (repo GitHub riêng tư): xem mục *Kho bài tập* dưới đây.
* Menu **Ví dụ**: 13 bài IMO (2008–2025), 2 bài VMO, 7 cấu hình hay gặp (bổ đề tâm nội tiếp – bàng tiếp, Feuerbach,
  mixtilinear, nghịch đảo √(bc), Brocard, Monge, đồng dạng xoắn), một hình dày với I_A, I_B, I_C; cùng các hình mẫu
  cũ. Rê chuột lên tên bài để xem đề tóm tắt. Các hình được dựng qua giao diện trong đợt dùng thử bản 1.2 và đã kiểm
  chứng kết luận bằng số; tệp JSON ở `examples/thu-vien/`.

### Kho bài tập (bản 1.5)

Lưu bài lên một **repo GitHub riêng tư** của thầy/cô để mở lại ở máy nào cũng được và hệ thống thành bài tập. Cài đặt
một lần: tạo repo Private + một token chỉ có quyền với repo đó, rồi bấm **Kết nối kho bài** trên thanh trên (hướng dẫn
từng bước hiện ngay trong hộp kết nối và ở [`docs/KHO_BAI.md`](docs/KHO_BAI.md)).

* `Ctrl+S`: lưu bài vào kho. Lần đầu hỏi **tên, nguồn** (kỳ thi – năm – bài, tự điền khi tên tab dạng "VMO 2016 – Bài 4",
  hoặc *Tự ra*), **chủ đề** (danh sách sửa được), **kỹ thuật/thẻ**, **độ khó** 1–5, ghi chú riêng; các lần sau lưu
  thẳng. Bài nhiều ý: lưu hình thứ hai bằng *Thêm làm hình phụ của bài có sẵn*.
* `Ctrl+K`: cửa sổ kho – ảnh thu nhỏ từng bài, ô tìm (không cần dấu, tìm cả chữ trong đề/lời giải), lọc theo chủ đề,
  nguồn, độ khó, trạng thái (mới có đề / có hình / có lời giải), đã dạy hay chưa; bấm một bài để mở thành tab.
* **Buổi dạy**: *Kho › Lưu các tab đang mở thành buổi dạy…* (như 6 bài trên lớp hôm đó) hoặc chọn nhiều bài trong cửa
  sổ kho. Mở buổi là mở đủ các bài; xuất **phiếu LaTeX cho cả buổi** (chỉ đề, hoặc kèm lời giải).
* Mỗi lần lưu là một phiên bản: nút ⋯ trên thẻ bài › *Các phiên bản cũ…*. *Kho › Nhập tệp vào kho…* đưa các tệp `.json`
  cũ (hoặc các bài ví dụ) vào kho một lượt.
* Mất mạng: lần lưu được giữ lại trong máy, nút kho báo *Chưa đồng bộ*, có mạng tự lưu lên. Bài trên kho bị sửa ở máy
  khác: chương trình hỏi trước khi ghi đè.

### Khung chữ: đề bài, lời giải, ghi chú (bản 1.4)

Khung chữ là thẻ nổi trên bảng vẽ: kéo **thanh tiêu đề** để dời, kéo **góc dưới phải** để đổi cỡ. Các nút trên thanh
tiêu đề (hiện khi rê chuột): cách gắn khung – **gắn màn hình** (đứng yên khi dời/phóng hình), **gắn hình** (đi theo
hình), **gắn điểm** (bám theo điểm gần nhất, vd ghi chú cạnh điểm H); chữ nhỏ hơn / to hơn; thu gọn; xoá.

* **Đề bài**: thường là ảnh cắt từ đề – chụp/cắt rồi `Ctrl+V` vào bảng vẽ là thành khung *Đề bài* (ảnh dán khi đã có
  khung đề thì thành một khung ảnh mới). Cũng có *Chèn › Khung đề bài (chữ)* để gõ đề.
* **Lời giải**: `Ctrl+Enter` mở khung lời giải (tạo ở cột phải nếu chưa có) và đặt con trỏ ở cuối để gõ tiếp.
* **Ghi chú**: *Chèn › Khung ghi chú*.

Nháy đúp vào nội dung khung để soạn: bên trên là bộ soạn, bên dưới là bản xem trước cập nhật khi gõ. Viết như trong
tệp `.tex` (bản 1.6): `$…$` hoặc `\(…\)` công thức trong dòng; `$$…$$`, `\[…\]` hoặc `\begin{align*}…\end{align*}` (cả
`equation*`, `gather*`…) công thức riêng dòng; `\textbf{…}`, `\emph{…}`, `\underline{…}`, `\\` xuống dòng, `~`, `--`,
`\begin{itemize}`/`\begin{enumerate}` với `\item`. Kiểu markdown cũng được: `**đậm**`, `*nghiêng*`, dòng bắt đầu `- ` là gạch
đầu dòng, `1. ` là đánh số. Mọi lệnh công thức thường dùng: `\widehat{ABC}`, `\overrightarrow{AB}`, `\wideparen{AB}`,
`\measuredangle`, `\backsim`, `\nparallel`, `\odot`…; có sẵn `\goc`, `\tamgiac`, `\cung{AB}`, `\vecto{AB}`. Đang soạn mà dán
ảnh thì ảnh chèn vào chữ.

**Gõ nhanh** (sửa được ở *Chèn › Gõ tắt và tự đổi…*):

* *Tự đổi trong công thức* – gõ xong là đổi, không cần phím nào: `goc` → `\angle`, `hat` → `\widehat{}`, `vec` → `\overrightarrow{}`, `tgiac` → `\triangle`, `^o` → `^\circ`,
  `<=` `>=` `!=` → ≤ ≥ ≠, `=>` → ⇒, `iff` → ⇔, `//` → ∥, `_|_` → ⊥, `~=` → ≅, `~~` → ∼, `ff` → `\frac{}{}`,
  `sqrt`, `vec`, `bar`, chữ Hy Lạp `al be ga de ph om pi`…
* *Gõ tắt* – gõ rồi nhấn `Tab` (ở đâu cũng được): `;g` ∠, `;tg` △, `;ss` ∥, `;vg` ⊥, `;fr` phân số, `;he` hệ, `;ho`
  tuyển, `;dt` công thức riêng dòng, `;cm` **Chứng minh.**, `;ta` Ta có, `;suyra`, `;vay`, `;dpcm` (đpcm),
  `;tgnt` tứ giác nội tiếp… Bắt đầu bằng `;` để không đụng bộ gõ tiếng Việt (Telex/VNI).
* `Tab` nhảy qua các ô trống `{}` và ra khỏi `$…$`; `Ctrl+M` bọc `$…$`; `Ctrl+Shift+M` `$$…$$`; `Ctrl+Space` gợi ý
  tên điểm; gõ `\` gợi ý lệnh LaTeX.
* **Bấm vào một điểm trên hình** khi đang soạn: chèn tên điểm đó vào chữ (ngoài công thức thì tự bọc `$…$`; bấm A, B, C
  liền nhau ra `$ABC$`).
* **Đổi tên điểm** trên hình thì tên trong mọi khung chữ đổi theo (trong công thức, và các từ chỉ gồm tên điểm như
  "tam giác ABC"; không đụng chữ thường như "Ta có"). Một lần `Ctrl+Z` trả lại cả tên lẫn chữ.
* `Ctrl+Enter`: sang **bước** mới (dòng `---`); `Esc` hoặc bấm ra ngoài: xong.

**Bước và trình bày.** Dòng `---` chia lời giải thành các bước. Khi trình bày (▶), bước *k* hiện ở khung trình bày
thứ *k* (cùng nhịp với các bước dựng hình); viết `--- @5` để bước sau hiện từ khung 5. Số khung trình bày tự kéo dài
nếu lời giải nhiều bước hơn hình.

**Tên điểm trong công thức** (A, H, I_A, M_{BC}, B'…) được gắn với hình: rê chuột lên thì đối tượng sáng lên.

**Xuất phiếu LaTeX** (*Tệp › Xuất phiếu LaTeX*): tải tệp `.tex` gồm đề bài, hình (TikZ, theo bộ kiểu đang chọn) và lời
giải đánh số theo bước, kèm các ảnh đề (để cùng thư mục). Biên dịch bằng `pdflatex` (cần gói `vietnam` của vntex).

### Ảnh nền để đồ hình

*Chèn › Ảnh nền để đồ hình…* (dán hay kéo thả ảnh thì thành khung Đề bài, xem trên): ảnh nằm **dưới** mọi đối tượng hình học và đi theo hình khi phóng to/dời hình – dùng để đồ lại hình gốc. Với công cụ
Chọn: kéo ảnh để dời, kéo ô vuông góc dưới phải để đổi cỡ (giữ tỉ lệ), `Delete` để xoá; thẻ thuộc tính có *Độ đậm* và
*Khoá làm nền* (ảnh khoá không bị chọn hay kéo nhầm khi đồ hình lên trên; mở lại ở *Sửa › Mở khoá các ảnh nền*).

Ảnh (ảnh nền và ảnh trong khung chữ) được lưu trong tệp `.json` và bản nháp, nhưng **không** nằm trong link chia sẻ
(link sẽ quá dài; chữ trong khung thì có). Ảnh lớn hơn 1600 px được thu nhỏ khi dán.

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
| `Ctrl` + chữ | Gọi công cụ (xem *Dựng hình*; sửa ở `Ctrl+/`), dựng ngay trên các đối tượng đang chọn nếu hợp |
| `Space` | Tìm công cụ theo tên |
| `Alt` + bấm | Ẩn ngay đối tượng được bấm |
| `Ctrl+/` | Bảng phím tắt (xem và sửa) |
| gõ chữ / `F2` | Đặt tên điểm đang chọn (vd điểm vừa dựng) |
| `Ctrl+V` | Dán ảnh: thành khung Đề bài (đang soạn chữ: chèn vào chữ) |
| `Alt+1`…`Alt+9`, `Alt+PageUp`/`PageDown` | Sang tab hình thứ n / tab trước, tab sau |
| `Ctrl+Enter` | Soạn lời giải; trong bộ soạn: sang bước mới |
| trong bộ soạn: `Tab`, `Ctrl+M`, `Ctrl+Space`, `Esc` | Gõ tắt / nhảy ô; bọc `$…$`; gợi ý tên điểm; xong |
| giữ `Shift` khi bấm / kéo điểm | Căn hướng: đường nằm ngang, thẳng đứng, bước 15° |
| `Home` | Thu phóng vừa hình |
| `Delete` | Xoá đối tượng đang chọn |
| `Ctrl+H` / `Ctrl+Shift+H` | Ẩn đối tượng đang chọn / hiện lại mọi đối tượng đã ẩn |
| `Esc` | Huỷ thao tác / bỏ chọn / thoát trình chiếu |
| `Enter` | Kết thúc miền đa giác |
| `Ctrl+S` | Lưu vào kho (đã kết nối kho) / lưu hình ra tệp (chưa kết nối) |
| `Ctrl+Shift+S` | Lưu tất cả các tab vào một tệp |
| `Ctrl+O` | Mở tệp (một hoặc nhiều; kéo thả tệp `.json` cũng được) |
| `Ctrl+K` | Mở kho bài: tìm, lọc, mở bài và buổi dạy |
| `←` `→` `PageUp` `PageDown` `Home` `End` | Chuyển khung khi trình bày |

## 3. Cấu trúc mã nguồn

```
index.html            trang chính (mở trực tiếp được)
dist/app.js           giao diện đã đóng gói (sinh bằng `npm run build`, CÓ commit để chạy không cần build)
src/core/             LÕI hình học thuần JS: bước dựng, tính toạ độ (cả tính lại từng phần khi kéo), mô hình JSON,
                      tên/nhãn, bộ kiểu, công cụ tự tạo (macro.js), chạy công cụ ngoài giao diện (apply.js)
src/explore/          BỘ KHÁM PHÁ thuần JS
src/export/tikz.js    xuất TikZ; src/export/latex.js: phiếu LaTeX (đề + TikZ + lời giải)
src/text/             KHUNG CHỮ: markup.js (chữ + công thức, chia bước, gắn tên điểm, sang LaTeX), snippets.js (gõ tắt,
                      tự đổi), editor.js (bộ soạn CodeMirror)
css/style.css         giao diện; css/katex.css: CSS + phông KaTeX nhúng sẵn (sinh bằng scripts/katex-css.mjs)
src/io/codec.js       mã hoá hình vào URL; src/io/idb.js: lưu trữ IndexedDB (bản nháp, hàng chờ kho)
src/kho/              KHO BÀI trên GitHub: github.js (API), kho.js (định dạng, mục lục, tìm kiếm), ui.js, thumb.js
src/ui/               GIAO DIỆN: view.js + render.js (bộ vẽ canvas), tools.js (công cụ cơ bản),
                      library.js (menu Công cụ), textboxes.js (khung chữ), app.js, panels.js…
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
docs/KHO_BAI.md       kho bài tập: cài đặt, cách dùng, cấu trúc repo kho
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

Bộ vẽ hình là canvas tự viết. Từ bản 1.4, khung chữ dùng **KaTeX** (hiển thị công thức) và **CodeMirror 6** (bộ soạn) –
cả hai được đóng gói sẵn vào `dist/app.js`, phông chữ KaTeX nhúng thẳng vào `css/katex.css` (vì trình duyệt chặn tải
phông từ `file://`), nên trang vẫn **chạy offline hoàn toàn**. Khi phát triển cần `npm install` (esbuild, katex,
codemirror); `npm run build` sinh lại cả `css/katex.css` và `dist/app.js`.
