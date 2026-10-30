# Phòng thí nghiệm hình học – hướng dẫn cài đặt và sử dụng (Windows)

Phòng thí nghiệm là một chương trình chạy trên máy tính của thầy/cô, **tự chạy nhiều giờ không cần trông**:
nó xuất phát từ tam giác ABC với các điểm, đường quen thuộc (O, H, I, G, N, chân đường cao, trung điểm,
tiếp điểm nội tiếp, điểm chính giữa cung, đường tròn ngoại tiếp/nội tiếp/Euler), dựng thêm dần các đối tượng,
tìm các quan hệ "lạ" (thẳng hàng, đồng viên, đồng quy, tiếp xúc…), nhờ bộ suy diễn **Newclid** thử chứng minh
để loại các quan hệ dễ, rồi sáng hôm sau cho một **trang báo cáo** để duyệt và chế đề.

Không cần biết lập trình: chỉ cần làm đúng các bước dưới đây **một lần**.

---

## 1. Cài Python (một lần)

1. Vào <https://www.python.org/downloads/windows/>, tải **Python 3.12** bản *Windows installer (64-bit)*
   (bản 3.11, 3.12 hoặc 3.13 đều được; khuyên dùng 3.12).
2. Chạy tệp vừa tải. Ở màn hình đầu tiên **đánh dấu ô "Add python.exe to PATH"** (rất quan trọng), rồi bấm
   **Install Now**. Đợi xong, bấm **Close**.
3. Kiểm tra: bấm phím Windows, gõ `cmd`, Enter để mở cửa sổ *Command Prompt*, gõ:

   ```bat
   python --version
   ```

   Thấy `Python 3.12.x` là được. (Nếu báo không tìm thấy lệnh: gỡ Python, cài lại và nhớ đánh dấu ô ở bước 2.)

## 2. Lấy mã nguồn

* Cách đơn giản: trên trang GitHub của dự án bấm **Code → Download ZIP**, giải nén vào một thư mục dễ tìm,
  ví dụ `C:\HinhHoc\Geometry` (tránh thư mục có tên quá dài).
* Hoặc nếu có Git: `git clone https://github.com/typhoon-delta/Geometry.git`.

Trong thư mục `Geometry` sẽ có thư mục con `lab` (phòng thí nghiệm) cạnh `index.html` (công cụ hình học web).

## 3. Cài đặt thư viện (một lần) – bằng cách bấm đúp

Mở thư mục `Geometry\lab`, **bấm đúp `cai-dat.bat`**. Tệp này tự:

1. tạo một *môi trường ảo* tên `.venv` trong thư mục `Geometry` (thư viện cài vào đây, không ảnh hưởng máy);
2. cài `numpy` và `newclid==2.0.2` (cần mạng; mất vài phút);
3. kiểm tra và chạy thử Newclid với định lý Simson.

Cuối cùng thấy dòng `Sẵn sàng.` là xong. Nếu Windows hỏi "Windows protected your PC" → bấm *More info → Run anyway*.

### Cài bằng tay (nếu thích gõ lệnh)

Mở `cmd`, rồi:

```bat
cd /d C:\HinhHoc\Geometry
```

```bat
python -m venv .venv
```

```bat
.venv\Scripts\activate
```

Dòng lệnh hiện thêm `(.venv)` ở đầu – nghĩa là đang ở trong môi trường ảo. Rồi:

```bat
python -m pip install --upgrade pip
```

```bat
pip install -r lab\requirements.txt
```

```bat
python -m lab kiem-tra --thu
```

Mỗi lần mở cửa sổ `cmd` mới để dùng phòng thí nghiệm, nhớ `cd` vào thư mục và chạy lại
`.venv\Scripts\activate` trước.

> **Vì sao Newclid 2.0.2 mà không phải bản mới nhất?** Bản 3.x của Newclid trên pip cần một bộ máy C++ (yuclid)
> không cài được qua pip; phần thuần Python của 3.x có lỗi (đã thử). Bản 2.0.2 thuần Python, chạy tốt trên
> Windows. Nếu không cài được Newclid, phòng thí nghiệm vẫn chạy, chỉ không có bước "thử chứng minh".

## 4. Chạy qua đêm

* **Bấm đúp `lab\chay-7-tieng.bat`** – chạy 7 tiếng. Để nguyên cửa sổ đen, có thể tắt màn hình, nhưng
  **đừng để máy ngủ** (*Settings → System → Power → Sleep: Never* khi cắm sạc).
* Hoặc gõ lệnh (trong môi trường ảo):

  ```bat
  python -m lab chay --gio 7
  ```

Cửa sổ in tiến độ sau mỗi vòng (khoảng 2–3 phút một vòng). Tiến độ được **lưu mỗi phút** vào `lab\du-lieu\`.

**Tắt giữa chừng** (bấm `Ctrl+C`, mất điện, tắt máy…): lần sau chạy lại đúng lệnh đó, chương trình
**chạy tiếp** lần chạy dở (thời gian đã chạy được tính vào 7 tiếng). Muốn bỏ lần dở và bắt đầu lại: thêm `--moi`.

Các lệnh khác:

| Lệnh | Tác dụng |
|---|---|
| `python -m lab chay --gio 7` | chạy (tổng) 7 tiếng; `--phut 10` để chạy thử 10 phút |
| `python -m lab chay --moi --gio 3` | bỏ lần chạy dở, bắt đầu lần mới 3 tiếng |
| `python -m lab chay --khong-newclid` | chạy không dùng Newclid (nhanh hơn, không phân loại "tầm thường/sâu") |
| `python -m lab chay --ca-cu` | báo cả các sự kiện đã có trong các lần chạy trước (mặc định chỉ báo cái mới) |
| `python -m lab bao-cao` | sinh lại và **mở báo cáo** lần chạy gần nhất |
| `python -m lab bao-cao --lan 2026-10-28_210819` | mở báo cáo của một lần chạy cụ thể |
| `python -m lab kiem-tra --thu` | kiểm tra cài đặt, chạy thử Newclid |
| `python -m lab quet hinh.json` | tìm quan hệ của một hình đã lưu từ công cụ web (như nút 🔍) |

## 5. Xem báo cáo buổi sáng

**Bấm đúp `lab\xem-bao-cao.bat`** (hoặc `python -m lab bao-cao`). Trình duyệt mở trang báo cáo; **để cửa sổ đen
mở** trong khi xem (nó là máy chủ nhỏ chỉ chạy trên máy mình để ghi đánh giá). Xem xong đóng cửa sổ đen.

Mỗi vòng chạy **ghép hai cấu hình kinh điển** (Simson, Steiner, Miquel, tâm nội–bàng tiếp, mixtilinear, Lemoine,
điểm Queue, Humpty, Feuerbach, Gergonne, Nagel… – xem `lab/library/__init__.py`) rồi dựng thêm (đối xứng, giao điểm,
chân đường vuông góc, tiếp tuyến…). Kết luận chính của các bổ đề coi là **đã biết**: không báo lại, và được dùng như
kiến thức khi đo độ khó. Báo cáo chia **tầng**:

| Tầng | Nghĩa |
|---|---|
| **Khó** | bộ suy luận của phòng thí nghiệm (đuổi góc + tỉ số độ dài + phương tích, dùng kết luận các bổ đề) không suy ra được hoặc cần ≥ 3 vòng; hoặc Newclid không chứng minh được |
| **Vừa** | cần một bước trung gian (tứ giác nội tiếp, thẳng hàng phụ…), hoặc loại quan hệ chưa đo được độ khó |
| **Dễ nhưng đẹp** | suy ra ngay, nhưng **giữ lại** vì các đối tượng tự nhiên và kết luận nối hai bổ đề hoặc dính (O), (I), O, H… |
| **Đã lọc bỏ** | hệ quả trực tiếp của sự kiện đã báo, đối tượng gượng ép (tâm của một tam giác "bất kỳ"…), dễ mà không đặc sắc, bị chê – chỉ hiện số lượng, lý do và 40 cái điểm cao nhất để thầy/cô kiểm tra bộ lọc |

Trong mỗi tầng, các sự kiện **cùng một ý** (cùng loại quan hệ, cùng các phép dựng, cùng bổ đề) được **gom thành
một nhóm**: hiện cái điểm cao nhất, các biến thể nằm trong mục "… biến thể cùng ý".

Mỗi sự kiện trong báo cáo có:

* **điểm "lạ"** và xếp hạng; nhãn loại quan hệ, **độ khó** (đuổi góc 1 bước / 2 vòng / không ra), **độ tự nhiên**,
  hai bổ đề xuất phát; kết quả Newclid:
  * *KHÔNG chứng minh được – ứng viên sâu*: bộ suy diễn không tự chứng minh được trong giới hạn thời gian →
    đáng xem nhất để chế đề;
  * *chứng minh được – tầm thường*: Newclid chứng minh ngay (đã bị hạ điểm);
  * *chưa kiểm tra*: chưa đến lượt Newclid (sự kiện điểm thấp hoặc hết giờ).
* **phát biểu tiếng Việt** (giả thiết + "Chứng minh rằng …");
* **hình tĩnh** kiểu Đơn sắc; điểm tô đen là các điểm trong kết luận, đường nét đứt minh hoạ quan hệ;
* nút **Mở trong công cụ (web)**: mở đúng hình đó trong công cụ hình học trên GitHub Pages để **kéo thả kiểm
  tra**; nút **Mở bản trên máy**: mở công cụ ngay trong thư mục đã tải (không cần mạng);
* nút **👍 Hay / 👎 Chán**: đánh giá của thầy/cô. Lần chạy sau đọc các đánh giá này để **tự chỉnh trọng số**
  chấm điểm (ví dụ chê nhiều sự kiện "thẳng hàng" thì loại đó bị hạ), sự kiện bị chê không hiện nữa, đối
  tượng của sự kiện được khen được ưu tiên làm "trạm" xuất phát;
* mục mở rộng: thành phần điểm, **chứng minh của Newclid** (nếu có), bài toán đã gửi Newclid.

Có thể lọc theo bổ đề, loại quan hệ, kết quả Newclid, tìm chữ, ẩn các sự kiện đã đánh giá.

> Nếu mở báo cáo bằng cách bấm đúp tệp `reports\...\index.html` (không qua `bao-cao`), đánh giá chỉ lưu trong
> trình duyệt: bấm **Tải phản hồi (JSON)** rồi chép tệp tải về vào thư mục `lab\du-lieu\phan-hoi\`.

Báo cáo nằm ở `reports\<ngày_giờ>\index.html`; `reports\index.html` liệt kê mọi lần chạy.

## 6. Chỉnh cách chấm điểm và cách tìm

Mở `lab\cau-hinh.toml` bằng Notepad. Mỗi dòng có ghi chú tiếng Việt. Hay chỉnh:

* `[trong_so]` – trọng số chấm điểm "lạ": thưởng cho sự kiện Newclid không chứng minh được, phạt sự kiện tầm
  thường, thưởng sự kiện dính đường tròn ngoại tiếp/nội tiếp/Euler hoặc O, I, H, sự kiện ít bước dựng, các đối
  tượng ở xa nhau trong cây dựng…
* `[chay]` – `do_sau` (độ sâu tìm kiếm), `thoi_gian_vong`, `so_tram`…
* `[newclid]` – `gioi_han_giay` (thời gian cho mỗi mục tiêu), `so_tien_trinh` (số bài chạy song song: máy 4 nhân
  để 2, máy 8 nhân để 4), `nguong_diem`.
* `[trong_so_phep_dung]` – ưu tiên các phép dựng (0 = không dùng).
* `[trong_so]` (phần mới) – `kho_1`, `kho_2`, `kho_3`, `kho_khong` (thưởng/phạt theo độ khó), `tu_nhien`,
  `giao_thoa` (nối hai bổ đề), `noi_bo` (nằm gọn trong một bổ đề), `he_qua`, `dai_dong` (phát biểu dài).
* `[loc]` – `nguong_tu_nhien` (dưới ngưỡng → lọc bỏ), `nguong_tu_nhien_de` (cái dễ chỉ giữ khi đủ tự nhiên).
  Thấy bộ lọc bỏ oan nhiều thì hạ các ngưỡng này.
* `[ghep]` – `xac_suat_cau_hinh_goc`: tỉ lệ vòng chạy từ cấu hình gốc (tam giác + các điểm đặc biệt) thay vì ghép
  hai bổ đề.
* `[bao_cao]` – `so_su_kien`: số **nhóm** tối đa hiện ở mỗi tầng.

## 7. Sự cố thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `'python' is not recognized…` | Cài lại Python, đánh dấu "Add python.exe to PATH". |
| `No module named numpy` / `lab` | Chưa kích hoạt môi trường ảo (`.venv\Scripts\activate`) hoặc chưa `cd` vào thư mục `Geometry`. |
| `Không dùng được Newclid…` | Chạy lại `cai-dat.bat`; vẫn lỗi thì vẫn dùng được, chỉ thiếu phân loại tầm thường/sâu. |
| Báo cáo không mở | Chạy `python -m lab bao-cao`, chép địa chỉ `http://127.0.0.1:…` vào trình duyệt. |
| Máy nóng / chậm | Giảm `so_tien_trinh` trong `[newclid]` xuống 1. |
| Muốn xoá hết dữ liệu | Xoá thư mục `lab\du-lieu` (mất cả đánh giá) và `reports`. |

## 8. Dành cho người phát triển

* Mã nguồn: `lab/core` (lõi hình học, khớp `src/core` của bản JS), `lab/scan` (bộ quét quan hệ, khớp
  `src/explore`), `lab/search` (vòng mở rộng, độ tự nhiên), `lab/library` (thư viện cấu hình kinh điển + ghép),
  `lab/reason` (bộ suy luận đo độ khó), `lab/prover` (cầu nối Newclid + chỗ cắm mô hình ngôn ngữ),
  `lab/report.py`, `lab/run.py`.
* Kiểm thử (khoảng 3–4 phút, cần Newclid cho phần chứng minh):

  ```bat
  python -m unittest discover -s lab/tests -t .
  ```

* Khi sửa lõi JS (`src/core`), chạy lại `node lab/tools/xuat-doi-chieu.mjs > lab/tests/fixtures/js_doi_chieu.json`
  để cập nhật dữ liệu đối chiếu.
