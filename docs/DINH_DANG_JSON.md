# Định dạng JSON của một hình

Một hình là **một danh sách bước dựng có thứ tự**. Mỗi bước sinh ra đúng **một** đối tượng
(điểm, đường thẳng, đường tròn hoặc dấu trang trí) và chỉ được tham chiếu tới các bước **đứng trước nó**.
Toạ độ của mọi đối tượng (trừ các tham số tự do) đều được tính lại từ danh sách này, nên tệp JSON
mô tả *cách dựng*, không phải một bức ảnh.

Mọi tính năng đều đọc/ghi đúng định dạng này: vẽ, tua bước, chia sẻ (link chứa chính JSON này đã nén),
khám phá, xuất TikZ, và các công cụ dòng lệnh trong `scripts/`.

## Cấu trúc

```json
{
  "format": "hinh-hoc-dong",
  "version": 1,
  "title": "Đường thẳng Euler",
  "view": { "bbox": [-8, 6, 8, -6] },
  "steps": [
    { "id": "s1", "type": "free_point", "args": [], "params": { "x": -0.6, "y": 3.4 }, "name": "A" },
    { "id": "s2", "type": "free_point", "args": [], "params": { "x": -3.4, "y": -1.6 }, "name": "B" },
    { "id": "s3", "type": "free_point", "args": [], "params": { "x": 3.6, "y": -1.6 }, "name": "C" },
    { "id": "s4", "type": "segment", "args": ["s1", "s2"], "name": "d1" },
    { "id": "s7", "type": "circumcircle", "args": ["s1", "s2", "s3"], "name": "ω1", "style": { "fill": 0.12 } },
    { "id": "s8", "type": "circumcenter", "args": ["s1", "s2", "s3"], "name": "O", "joinPrev": true }
  ]
}
```

| Trường | Ý nghĩa |
|---|---|
| `format`, `version` | Luôn là `"hinh-hoc-dong"`, `1`. |
| `title` | Tên hình (tuỳ chọn). |
| `view.bbox` | Khung nhìn `[xTrái, yTrên, xPhải, yDưới]` (tuỳ chọn, chỉ để hiển thị). |
| `images` | *(bản 1.3, tuỳ chọn)* Ảnh dán vào hình: `[{id, x, y, w, h, opacity?, locked?}]` – (x, y) là góc trên-trái theo toạ độ hình (y hướng lên), w × h theo đơn vị hình. Chỉ để hiển thị, không tham gia tính toán. |
| `imageData` | *(bản 1.3, tuỳ chọn)* Dữ liệu ảnh `{id: "data:image/…;base64,…"}`. Có trong tệp `.json` và bản nháp, không có trong link chia sẻ. |
| `boxes` | *(bản 1.4, tuỳ chọn)* Khung chữ nổi trên bảng vẽ: `[{id, role, title?, text, anchor, …}]`. `role`: `"de"` (đề bài), `"loigiai"`, `"ghichu"`. `text`: chữ + công thức LaTeX (`$…$`, `$$…$$`, `**đậm**`, `- ` gạch đầu dòng, `![](img:ID)` ảnh có dữ liệu trong `imageData`); dòng `---` (hoặc `--- @k`) chia bước để hiện dần khi trình bày. `anchor`: `"screen"` – `fx, fy` là góc trên-trái theo tỉ lệ khung vẽ (0–1); `"figure"` – `x, y` theo toạ độ hình; `"point"` – `pt` (id điểm), `dx, dy` độ lệch pixel. Thêm: `w`, `h` (px, `h` thiếu = tự cao), `font` (hệ số cỡ chữ), `collapsed`, `from` (khung trình bày 1-based bắt đầu hiện). Chỉ để hiển thị, không tham gia tính toán; bản Python bỏ qua. |
| `steps[].id` | Mã định danh **bất biến** (không đổi khi đổi tên). Ứng dụng sinh dạng `s1, s2, …`. |
| `steps[].type` | Loại bước (bảng dưới). |
| `steps[].args` | Danh sách `id` của các bước trước, đúng kiểu yêu cầu. |
| `steps[].params` | Tham số số của bước (bậc tự do, lựa chọn nghiệm). Thiếu thì dùng mặc định. |
| `steps[].name` | Nhãn hiển thị, gõ như công thức: `I_A` (chỉ số dưới), `X_{AB}`, `B'` (phẩy), `A'_1`, `A1` → A₁, `ω1`. Không trùng nhau. Dấu trang trí không có tên. |
| `steps[].style` | Kiểu hiển thị (không ảnh hưởng toán học): `color`, `fillColor`, `width`, `dash`, `size`, `fill` (độ đậm tô nền 0–1), `showLabel`, `labelOffset` `[dx, dy]` (pixel), `arcs`, `ticks`, `border`. |
| `steps[].hidden` | `true`: đối tượng phụ, không vẽ (vẫn tính, vẫn dùng làm đối số). |
| `steps[].joinPrev` | `true`: khi trình bày, hiện cùng **khung** với bước hiển thị phía trước. |

Kiểu đối số: `point`, `line` (gồm đường thẳng, đoạn, tia), `circle`, `curve` (đường thẳng hoặc đường tròn),
`obj` (điểm/đường thẳng/đường tròn), `pl` (điểm hoặc đường thẳng), `...point` (≥ 3 điểm).

## Tệp nhiều hình (bản 1.5)

*Tệp › Lưu tất cả các tab* ghi một tệp gồm nhiều hình:

```json
{"format": "hinh-hoc-dong-bo", "version": 1, "title": "Các hình ngày 2026-10-29", "active": 1,
 "tabs": [ {…một hình như trên, có view và imageData…}, … ]}
```

`active` là chỉ số tab đang mở lúc lưu. *Mở tệp* nhận cả hai loại. Kho bài trên GitHub dùng định dạng riêng (một thư mục
cho mỗi bài, ảnh tách tệp) – xem [`KHO_BAI.md`](KHO_BAI.md).

## Các loại bước

### Điểm

| `type` | `args` | `params` | Ý nghĩa |
|---|---|---|---|
| `free_point` | – | `x`, `y` | Điểm tự do (kéo được). |
| `point_on` | `curve` | `t` | Điểm trên đối tượng (kéo được, bị ràng buộc). Đường qua P với vectơ chỉ phương d: điểm = P + t·d (đoạn: t ∈ [0,1], tia: t ≥ 0). Đường tròn: t là góc (radian) tính từ tâm. |
| `intersection` | `curve`, `curve` | `which` (0/1) | Giao điểm. Với 2 nghiệm, `which` chọn theo **thứ tự chuẩn**: đường thẳng–đường tròn: theo chiều vectơ chỉ phương của đường thẳng; đường tròn–đường tròn: nghiệm 0 ở bên phải, nghiệm 1 bên trái hướng tâm₁→tâm₂. |
| `intersection_other` | `curve`, `curve`, `point` Q | – | Giao điểm *khác Q* (Q thường đã là một giao điểm). |
| `midpoint` | `point` A, `point` B | – | Trung điểm AB. |
| `projection` | `point` P, `line` l | – | Hình chiếu vuông góc của P lên l. |
| `reflect` | `obj` X, `pl` M | – | Ảnh của X qua phép đối xứng tâm M (điểm) hoặc trục M (đường thẳng). Kết quả cùng loại với X. |
| `circumcenter`, `orthocenter`, `incenter`, `centroid`, `nine_point_center` | A, B, C | – | O, H, I, G, N của tam giác ABC. |
| `altitude_foot` | A, B, C | – | Chân đường cao hạ từ A xuống BC. |
| `incircle_touch` | A, B, C | – | Tiếp điểm của đường tròn nội tiếp với BC. |
| `arc_midpoint` | A, B, C | `contains` (bool) | Điểm chính giữa cung BC của (ABC): `false` = cung không chứa A, `true` = cung chứa A. |

### Đường thẳng

| `type` | `args` | `params` | Ý nghĩa |
|---|---|---|---|
| `line`, `segment`, `ray` | A, B | – | Đường thẳng AB, đoạn AB, tia AB (gốc A). |
| `perpendicular` | `point` P, `line` l | – | Đường qua P vuông góc với l. |
| `parallel` | `point` P, `line` l | – | Đường qua P song song với l. |
| `perp_bisector` | A, B | – | Trung trực AB. |
| `angle_bisector` | A, B, C | `external` (bool) | Phân giác (trong/ngoài) của góc ABC, đỉnh B. |

### Đường tròn

| `type` | `args` | Ý nghĩa |
|---|---|---|
| `circle` | O, A | Tâm O, đi qua A. |
| `circle_radius` | O, A, B | Tâm O, bán kính AB (compa). |
| `circle_3pts` | A, B, C | Đường tròn qua 3 điểm. |
| `circumcircle`, `incircle`, `nine_point_circle` | A, B, C | Đường tròn ngoại tiếp, nội tiếp, Euler của ABC. |

### Bổ sung từ bản 1.1 (thư viện công cụ)

| `type` | `args` | `params` | Ý nghĩa |
|---|---|---|---|
| `center` | `circle` | – | Tâm của đường tròn (mọi công cụ vẽ đường tròn dựng kèm tâm). |
| `foot` | P, A, B | – | Hình chiếu của P lên đường thẳng AB (không cần dựng đường AB). |
| `reflect_pts` | P, A, B | – | Đối xứng của P qua đường thẳng AB. |
| `rotate` | `obj` X, O | `angle` (độ) | Quay X quanh O (ngược chiều kim đồng hồ). |
| `homothety` | `obj` X, O | `k` | Vị tự tâm O tỉ số k. |
| `translate` | `obj` X, P, Q | – | Tịnh tiến theo vectơ PQ. |
| `invert` | P, `circle` | – | Nghịch đảo điểm P qua đường tròn. |
| `invert_line` | `curve` X, `circle` | – | *(bản 1.2)* Ảnh qua phép nghịch đảo của đường thẳng/đường tròn X **đi qua tâm** nghịch đảo – một **đường thẳng** (X không qua tâm → không xác định). |
| `invert_circle` | `curve` X, `circle` | – | *(bản 1.2)* Ảnh của đường thẳng/đường tròn X **không qua tâm** nghịch đảo – một **đường tròn**. |
| `rotate_by` | `obj` X, O, A, B, C | – | *(bản 1.2)* Quay X quanh O một góc bằng góc có hướng ∠ABC **trên hình** (từ tia BA sang BC) – kéo hình thì góc đổi theo. |
| `homothety_by` | `obj` X, O, A, B, C, D | `negative` | *(bản 1.2)* Vị tự tâm O, tỉ số AB/CD **trên hình** (`negative: true`: tỉ số âm). |
| `spiral` | `obj` X, O, A, B | – | *(bản 1.2)* Phép đồng dạng thuận tâm O biến A thành B (quay ∠AOB, vị tự OB/OA), áp cho X. |
| `tangent_at` | `circle`, P | – | Tiếp tuyến tại P (đường qua P vuông góc bán kính). |
| `tangent_point` | `circle`, P | `which` (0/1) | Tiếp điểm của tiếp tuyến kẻ từ P (thứ tự chuẩn như giao hai đường tròn). |
| `common_tangent` | `circle`, `circle` | `internal`, `which` | Tiếp tuyến chung ngoài/trong (đường đi từ tiếp điểm trên đường tròn 1 tới tiếp điểm trên đường tròn 2). |
| `radical_axis` | `circle`, `circle` | – | Trục đẳng phương. |
| `radical_center` | 3 `circle` | – | Tâm đẳng phương. |
| `homothety_center` | `circle`, `circle` | `internal` | Tâm vị tự ngoài/trong. |
| `excenter`, `excircle` | A, B, C | – | Tâm / đường tròn bàng tiếp góc A. |
| `isogonal_conjugate` | P, A, B, C | – | Liên hợp đẳng giác của P (toạ độ tỉ cự (u:v:w) ↦ (a²/u : b²/v : c²/w)). |
| `lemoine`, `kosnita` | A, B, C | – | Điểm Lemoine (a² : b² : c²); điểm Kosnita (liên hợp đẳng giác của N). |
| `symmedian_foot` | A, B, C | – | Chân đường đối trung từ A trên BC (BL/LC = AB²/AC²). |
| `cevian_foot` | P, A, B, C | – | Giao AP với BC. |
| `isogonal_line` | B, A, C, P | – | Đường đẳng giác của AP trong góc BAC (đỉnh A là đối số thứ hai). |
| `circle_tangent_at` | A, B, C | – | Đường tròn tiếp xúc AB tại A, đi qua C. |
| `mixtilinear` | A, B, C | `external` | Đường tròn mixtilinear nội (tiếp xúc trong với (O)) / ngoại (tiếp xúc ngoài) ứng với A. |
| `circle_diameter` | A, B | – | Đường tròn đường kính AB. |

### Bổ sung bản 1.7

| `type` | `args` | `params` | Ý nghĩa |
|---|---|---|---|
| `angle_line` | O, X, A, B, C | `flip` | Đường qua O tạo với tia OX góc bằng ∠ABC: quay X quanh O một góc bằng góc có hướng ∠ABC (`flip: true`: góc ngược dấu – phía bên kia OX). |
| `angle_point` | O, X, A, B, C, `line` l | `flip` | Giao của đường `angle_line` (O, X, A, B, C) với l. |
| `point_in` | A, B, C | `u`, `v` | Điểm A + u·AB + v·AC (**bậc tự do**, như `free_point`); giao diện giữ u, v ≥ 0, u + v ≤ 1 (ở trong tam giác). |
| `fixed_point` | `curve` X, M | `which` | Điểm cố định của họ đường X khi điểm M (bậc tự do: `free_point`, `point_on`, `point_in`) thay đổi. Cách tính: dời thử M tới các vị trí cố định (bảng `FIX_*` trong `model.js`), tính lại X ở mỗi vị trí, giao vị trí hiện tại với hai vị trí đầu, giữ nghiệm nằm trên mọi vị trí; xếp theo x tăng, lấy nghiệm thứ `which`. Không có → không xác định. |
| `locus` | P, D | `n` (mặc định 160) | *(dấu trang trí)* Quỹ tích của P khi D chạy trên đường của nó (D phải là `point_on`): giá trị `{kind: "locus", pts: [{x, y} \| null…], closed}` – `n + 1` mẫu đều theo tham số (đường tròn: một vòng, `closed: true`; đoạn [0, 1]; tia [0, max(4, 3t₀)]; đường thẳng [t₀ − 3, t₀ + 3]). |
| `measure_len` | A, B | `dx`, `dy` | *(dấu trang trí)* Số đo AB: `{kind: "measure", m: "len", value, at}`; `dx`, `dy` dời chữ (px). |
| `measure_angle` | A, B, C | `dx`, `dy` | *(dấu trang trí)* Số đo góc ABC theo độ (0–180). |
| `measure_ratio` | A, B, C, D | `dx`, `dy` | *(dấu trang trí)* Tỉ số AB/CD. |

Trường mới: `steps[].aux: true` – **đường phụ** (vẽ nét đứt, nhạt); `doc.hideAux: true` – đang tắt mọi đường phụ (không vẽ,
không chọn được, không xuất TikZ; vẫn tính, vẫn dùng làm đối số). `fixed_point` và `locus` được tính bằng cách lấy mẫu
cả hình (`SAMPLERS` trong `src/core/model.js`, `lab/core/model.py` – hai bản cho cùng một kết quả số).

### Dấu trang trí (không tham gia khám phá, không cần khi dịch sang hệ khác)

| `type` | `args` | `style` |
|---|---|---|
| `polygon` | ≥ 3 điểm | `color`, `fill`, `border` |
| `angle_mark` | A, B, C (đỉnh B) | `color`, `arcs` (1–3); góc vuông tự vẽ ô vuông |
| `segment_mark` | A, B | `color`, `ticks` (1–3) |
| `locus`, `measure_*` | xem *Bổ sung bản 1.7* | `color`, `width`, `dash` |

## Quy ước toán học quan trọng

* **Liên tục khi kéo**: mọi phép dựng là hàm liên tục của các tham số tự do trên miền không suy biến.
  Nghiệm của giao điểm được chọn theo thứ tự chuẩn ở trên (không theo "gần vị trí cũ"), vì vậy cùng
  một tệp JSON luôn cho cùng một hình, và điểm giao không nhảy sang nghiệm kia trừ khi đi qua vị trí
  tiếp xúc (khi đó hai nghiệm trùng nhau – suy biến thật sự).
* Giao điểm dùng **đường mang** của đoạn/tia (không cắt theo giới hạn đoạn).
* Một bước không xác định (vd hai đường song song không có giao điểm) cho giá trị rỗng; mọi bước
  phụ thuộc vào nó cũng rỗng. Hình vẫn hợp lệ.
* Tham số tự do của hình = `params` của các bước `free_point` (x, y) và `point_on` (t). Bộ khám phá
  chỉ xê dịch các tham số này.

## Dịch sang hệ khác (Newclid / AlphaGeometry, Python)

Danh sách bước đã sắp theo thứ tự phụ thuộc và có kiểu rõ ràng, nên có thể dịch tuần tự từng bước.
Trong ngôn ngữ của AlphaGeometry/Newclid, đường thẳng và đường tròn không phải đối tượng riêng mà
được mô tả qua điểm, nên khi dịch cần "điểm hoá" đường:

| Bước ở đây | Gợi ý dịch sang AlphaGeometry/Newclid |
|---|---|
| 3 `free_point` A, B, C (tam giác) | `a b c = triangle a b c` |
| `free_point` khác | `x = free x` |
| `midpoint` | `m = midpoint m a b` |
| `circumcenter` | `o = circle o a b c` |
| `orthocenter` / `incenter` / `centroid` | `h = orthocenter h a b c` / `i = incenter i a b c` / `g = centroid ...` |
| `altitude_foot` A,B,C | `d = foot d a b c` |
| `projection` P, l (l = đường AB) | `f = foot f p a b` |
| `reflect` P qua điểm M | `q = mirror q p m` · qua đường AB: `q = reflect q p a b` |
| `point_on` đường AB / đường tròn (O, OA) | `x = on_line x a b` / `x = on_circle x o a` |
| `intersection` của hai đường | ghép hai ràng buộc: `x = on_line x a b, on_circle x o c` … |
| `perpendicular` P ⊥ AB, `parallel` P ∥ AB | ràng buộc `on_tline x p a b`, `on_pline x p a b` |
| `perp_bisector` AB, `angle_bisector` ABC | `on_bline x a b`, `on_aline`/`angle_bisector x a b c` |
| `circle_3pts`, `circumcircle` | thêm tâm phụ `o = circle o a b c` rồi dùng `on_circle … o a` |
| `incircle_touch`, `arc_midpoint`, `nine_point_*` | dựng qua điểm phụ (tâm nội tiếp, chân đường vuông góc, giao với phân giác …) |

Tên điểm dùng trường `name` (đã duy nhất), có thể chuẩn hoá về chữ thường cho các hệ trên.
Quan hệ do bộ khám phá tìm ra cũng dùng đúng các `id` của tài liệu (`relations[].ids`), nên có thể
chuyển thành mục tiêu chứng minh: `coll a b c`, `cyclic a b c d`, `para …`, `perp …`, …

### Công cụ dòng lệnh

```bash
node scripts/kham-pha.mjs examples/simson.json            # kết quả khám phá dạng JSON
node scripts/kham-pha.mjs examples/simson.json --text     # dạng bảng, dễ đọc
node scripts/tikz.mjs examples/euler_line.json --width 10 # mã TikZ
```

Kết quả khám phá có dạng:

```json
{ "relations": [ { "type": "collinear", "ids": ["s7", "s8", "s9"], "text": "D, E, F thẳng hàng", "score": 5 } ],
  "stats": { "samples": 12, "attempts": 15, "rejected": { "điểm gần trùng": 3 }, "points": 7, "lines": 3, "circles": 1, "ms": 3 } }
```

Các loại quan hệ: `collinear`, `concyclic`, `concurrent` (≥ 3 đường thẳng/đường tròn qua một điểm
chưa dựng), `parallel`, `perpendicular`, `tangent`, `on_line`, `on_circle`, `coincide`, `same_line`, `same_circle`.

## Công cụ tự tạo ("Công cụ › 7. Công cụ của tôi")

Lưu trong trình duyệt (`localStorage`, khoá `hinh-hoc-dong:tools`) và xuất/nhập được ra tệp:

```json
{ "format": "hinh-hoc-dong-cong-cu", "version": 1,
  "tools": [ { "id": "user_…", "label": "Trực tâm của tôi", "inputs": ["point", "point", "point"],
               "hints": ["…"],
               "steps": [ { "type": "orthocenter", "args": ["in:0", "in:1", "in:2"], "result": true, "name": "H" } ] } ] }
```

Trong `steps[].args`, `in:k` là đầu vào thứ k (người dùng chọn khi dùng công cụ), `st:j` là bước thứ j của chính
công cụ. Bước có `result: true` được hiện; các bước trung gian được ẩn.
