# Kho bài tập trên GitHub (bản 1.5)

Kho bài là một **repo GitHub riêng tư** của thầy/cô. Chương trình (repo `Geometry`, công khai) chỉ là công cụ; mọi bài,
buổi dạy nằm trong kho. Mở kho ở máy nào cũng được, GitHub giữ lịch sử mọi lần sửa.

```
  CHƯƠNG TRÌNH (công khai)                         KHO BÀI (repo riêng tư)
  typhoon-delta.github.io/Geometry   ──Lưu (Ctrl+S)──▶  bai/…, buoi/…, muc-luc.json
  vẽ hình, đề, lời giải, các tab     ◀──Mở (Ctrl+K)───  (đọc/ghi bằng token của thầy/cô)
```

## Cài đặt (một lần)

1. **Tạo repo**: vào <https://github.com/new> → đặt tên (vd `kho-bai`) → chọn **Private** → *Create repository*.
   Repo để trống cũng được (chương trình tự tạo cấu trúc).
2. **Tạo token** (mã truy cập): <https://github.com/settings/personal-access-tokens/new>
   (*Settings › Developer settings › Personal access tokens › Fine-grained tokens › Generate new token*)
   * *Token name*: vd `hinh-hoc-dong`; *Expiration*: tuỳ (hết hạn thì tạo token mới, dán lại).
   * *Repository access*: **Only select repositories** → chọn repo kho.
   * *Permissions › Repository permissions › Contents*: **Read and write** (Metadata: Read-only tự có).
   * *Generate token* → sao chép (chỉ hiện một lần).
3. Trong chương trình: bấm nút **Kết nối kho bài** trên thanh trên (hoặc *Kho › Kết nối kho…*) → điền repo
   `tên-tài-khoản/kho-bai` và dán token → *Kết nối*.

Token được lưu trong trình duyệt **của máy đó** (localStorage) – chỉ nên dán trên máy riêng. *Kho › Ngắt kết nối kho*
xoá token khỏi máy. Token chỉ có quyền với đúng repo kho, nên lộ token cũng không ảnh hưởng repo khác (vẫn nên thu hồi
ở trang token của GitHub nếu nghi bị lộ).

## Dùng hằng ngày

| Việc | Cách làm |
|---|---|
| Lưu bài | `Ctrl+S` (khi đã kết nối kho). Lần đầu hỏi tên bài, nguồn, chủ đề, thẻ, độ khó, ghi chú; các lần sau lưu thẳng. |
| Mở bài | `Ctrl+K` → gõ tìm (không cần dấu: tên, nguồn, chủ đề, thẻ, chữ trong đề/lời giải) và lọc (chủ đề, nguồn, độ khó, trạng thái, đã dạy) → bấm bài. |
| Bài nhiều hình | Lúc lưu chọn *Thêm làm hình phụ của bài có sẵn*. Mở bài là mở đủ các hình thành tab. |
| Sửa thông tin | *Kho › Thông tin bài này…*, hoặc nút ⋯ trên thẻ bài trong cửa sổ kho. |
| Buổi dạy | *Kho › Lưu các tab đang mở thành buổi dạy…* (tab chưa có trong kho thành bài mới), hoặc chọn nhiều bài trong cửa sổ kho → *Tạo buổi dạy*. Mở buổi là mở đủ các bài. |
| Phiếu cho buổi | Cửa sổ kho › *Buổi dạy* → *Phiếu đề (.tex)* hoặc *Phiếu kèm lời giải*. |
| Bản cũ | Nút ⋯ trên thẻ bài → *Các phiên bản cũ…* → mở một bản thành tab mới. |
| Đưa bài cũ vào kho | *Kho › Nhập tệp vào kho…*: chọn các tệp `.json` (cả tệp "lưu tất cả các tab"), lấy các tab đang mở, hoặc các bài ví dụ có sẵn. Nhập một lần = một commit. |
| Chủ đề | Cửa sổ kho › *Sửa danh sách chủ đề…* (lưu trong `chu-de.json`). |

**Mất mạng**: vẫn vẽ bình thường; `Ctrl+S` giữ lần lưu trong máy (IndexedDB), nút kho báo *Chưa đồng bộ (n)*, có mạng
lại thì tự lưu lên (kiểm tra lại mỗi phút và khi trình duyệt báo có mạng). Bài **mới** cần kết nối được kho lần đầu –
lúc đó tạm lưu ra tệp (*Tệp › Lưu hình này ra tệp*).

**Sửa cùng một bài ở hai nơi**: khi lưu, nếu bài trên kho đã đổi kể từ lúc mở thì chương trình hỏi: *Ghi đè bằng hình
này*, *Lưu thành bài mới*, hoặc *Mở bản trên kho (tab mới)* để so. Không bao giờ âm thầm ghi đè. Hai máy lưu hai bài
khác nhau cùng lúc thì cả hai đều được giữ (máy sau tự đọc lại mục lục rồi lưu lại).

## Cấu trúc repo kho

```
muc-luc.json                 chỉ mục mọi bài và buổi dạy (tìm/lọc nhanh; tự cập nhật mỗi lần lưu)
chu-de.json                  {"chuDe": ["Tam giác và các điểm, đường đặc biệt", …]}
bai/<mã>/bai.json            một bài
bai/<mã>/anh/<id>.png|jpg    ảnh đề / ảnh nền dùng trong bài
bai/<mã>/thu-nho.jpg         ảnh thu nhỏ của hình đầu (360×240)
buoi/<mã>.json               một buổi dạy
```

Mã bài là tên không dấu theo nguồn (`vmo-2016-bai-4`) hoặc theo tên (`bo-de-tam-noi-tiep`), thêm `-2`, `-3` nếu trùng.

`bai/<mã>/bai.json`:

```json
{
  "format": "kho-bai", "version": 1, "ma": "vmo-2016-bai-4",
  "meta": {
    "ten": "VMO 2016 – Bài 4",
    "nguon": {"ky": "VMO", "nam": 2016, "so": "4"},      // hoặc {"tuRa": true}
    "chuDe": ["Phép nghịch đảo"], "the": ["vị tự quay"], "doKho": 4, "ghiChu": "…"
  },
  "hinh": [ { …một hình theo docs/DINH_DANG_JSON.md, KHÔNG có imageData… } ],
  "anh": {"img123": "anh/img123.png"},                    // id ảnh → tệp (đường dẫn tương đối trong thư mục bài)
  "capNhat": "2026-10-29T09:00:00.000Z"
}
```

`buoi/<mã>.json`: `{"format": "kho-bai-buoi", "version": 1, "ma", "ten", "ngay": "2026-10-29", "lop", "ghiChu", "bai": ["mã bài", …]}`.

`muc-luc.json`: `{"format": "kho-bai-muc-luc", "version": 1, "bai": {"<mã>": {ten, nguon, chuDe, the, doKho, ghiChu,
trangThai: "de"|"hinh"|"loigiai", soHinh, tom: "trích chữ đề + lời giải để tìm", capNhat, thuNho}}, "buoi": {"<mã>": {ten,
ngay, lop, ghiChu, bai, capNhat}}}`. Mục lục chỉ là bản tóm tắt – mất hay hỏng vẫn dựng lại được từ các `bai.json`.
"Đã dạy" không lưu riêng: một bài đã dạy khi nó nằm trong một buổi dạy.

## Cách chương trình ghi vào GitHub

Mỗi lần lưu là **một commit** (bài + ảnh mới + ảnh thu nhỏ + mục lục), làm bằng API "git data" của GitHub
(`git/blobs`, `git/trees`, `git/commits`, rồi cập nhật nhánh với `force: false`). Nếu nhánh vừa được máy khác cập nhật,
GitHub từ chối; chương trình đọc lại mục lục mới nhất rồi làm lại (tối đa 4 lần). Ảnh đã có trên kho không gửi lại; ảnh
không còn dùng bị xoá. Phát hiện "bài đã được sửa ở nơi khác" bằng sha của `bai.json` lúc mở so với lúc lưu.

Mã: `src/kho/github.js` (gọi API), `src/kho/kho.js` (định dạng, mục lục, tìm kiếm – thuần JS, test trong Node với
GitHub giả `tests/fake-github.mjs`), `src/kho/ui.js` (giao diện), `src/kho/thumb.js` (ảnh thu nhỏ).

Giới hạn: GitHub khuyên repo dưới vài GB (một bài thường 10–50 KB, ảnh đề 100–500 KB → vài nghìn bài vẫn thoải mái);
5000 lần gọi API mỗi giờ với token (một lần lưu khoảng 8–10 lần gọi).
