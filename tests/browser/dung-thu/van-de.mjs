// Các vấn đề phát hiện khi dùng thử, xếp theo mức ảnh hưởng tới việc dạy (cao → thấp), kèm cách sửa.
// matchIssue: ghép một vấn đề người dùng ảo ghi lại khi dựng (nguoi-dung.mjs: issue) với mục tương ứng.
export const VAN_DE = [
  {
    id: 'nghich-dao', muc: 'Cao', nhom: 'Thiếu công cụ – đúng toán', trangThai: 'đã sửa',
    ten: 'Phép nghịch đảo chỉ áp cho điểm',
    moTa: 'Bài nghịch đảo √(bc): phải lấy 3 điểm trên đường tròn, nghịch đảo từng điểm rồi dựng đường tròn qua 3 ảnh (97 thao tác); ảnh của (O) đi qua tâm nghịch đảo là đường thẳng nên "đường tròn qua 3 điểm" không xác định, phải tự biết mà vẽ đường thẳng.',
    sua: 'Công cụ Nghịch đảo nhận điểm, đường thẳng, đường tròn và tự chọn ảnh là đường thẳng (qua tâm) hay đường tròn; hai loại bước mới invert_line, invert_circle. Bài √(bc): 47 thao tác.',
    re: /Nghịch đảo chỉ áp cho điểm/,
  },
  {
    id: 'goc-ti-so', muc: 'Cao', nhom: 'Thiếu công cụ – đúng toán', trangThai: 'đã sửa',
    ten: 'Góc quay, tỉ số vị tự phải gõ số',
    moTa: 'Tâm đồng dạng xoắn S: phép quay góc ∠ASC rồi vị tự tỉ số SC/SA không dựng được – góc gõ tay đúng ở một vị trí, kéo hình là sai.',
    sua: 'Thêm "Quay theo góc trên hình" (góc ABC), "Vị tự theo tỉ số trên hình" (AB/CD, có dấu) và "Đồng dạng tâm O biến A thành B"; cho chọn lại cùng một điểm (vd tâm S cũng là đỉnh góc ASC).',
    re: /Phép quay\/vị tự chỉ nhận/,
  },
  {
    id: 'ten-tam', muc: 'Cao', nhom: 'Đặt tên – dễ nhầm', trangThai: 'đã sửa',
    ten: 'Tâm đường tròn tự đặt tên chiếm chữ cái của đề',
    moTa: 'Mỗi đường tròn qua 3 điểm dựng kèm tâm, tâm lấy chữ cái trống kế tiếp (D, K, L, A, E…): IMO 2015 không đặt được tên K, L; IMO 2017 mất tên A; "tứ giác nội tiếp" đặt đỉnh thứ tư là E vì tâm đã lấy D; tâm tên "D", "L" giữa hình làm học sinh nhầm.',
    sua: 'Tâm tự đặt tên O, rồi O₁, O₂… (đường tròn ngoại tiếp/nội tiếp/Euler/bàng tiếp vẫn là O, I, N, I_A).',
    re: /bị chiếm \(tâm đường tròn|Đổi tên thành "[KLA]" bị từ chối/,
  },
  {
    id: 'the-che', muc: 'Cao', nhom: 'Thao tác – bấm hụt', trangThai: 'đã sửa',
    ten: 'Thẻ thuộc tính che hình và chặn lần bấm',
    moTa: 'Sau mỗi lần dựng, đối tượng mới được chọn nên thẻ thuộc tính hiện ở góc phải, che đúng chỗ cần bấm tiếp (cú bấm rơi vào thẻ, không tạo được giao điểm). Bấm vào điểm gần góc phải thì thẻ hiện ĐÈ lên chính điểm đó nên nháy đúp không đổi tên được.',
    sua: 'Thẻ thuộc tính chỉ hiện với công cụ Chọn (khi đang dựng thì không); nếu che đối tượng đang chọn thì tự dời xuống góc dưới.',
    re: /Thẻ nổi .* che chỗ|thẻ thuộc tính hiện ra đè/,
  },
  {
    id: 'nhan', muc: 'Cao', nhom: 'Nhãn đẹp', trangThai: 'đã sửa',
    ten: 'Nhãn đè lên điểm, lên đường, lên nhau',
    moTa: 'Nhãn đặt TÂM cách điểm 11 px nên nhãn rộng (M_c, I_A, S_{12}) đè lên chính điểm của nó; nhãn ở giao của nhiều đường nằm đè lên đường (IMO 2008: 8 chỗ, bài nghịch đảo: 21, VMO 2014: 15); hai điểm gần nhau (M_C và C′ trong hình dày) chồng nhãn.',
    sua: 'Đặt nhãn theo khung chữ thật trên màn hình: khung chữ đặt sát điểm kiểu "neo" của TikZ, chấm điểm theo số đường cắt qua, điểm bị che, nhãn đã đặt bị đè, ra ngoài khung; nhãn khó đặt được ưu tiên; đặt lại khi phóng to/thu nhỏ.',
    re: /^$/,
  },
  {
    id: 'ten', muc: 'Cao', nhom: 'Thao tác – dựng nhanh', trangThai: 'đã sửa',
    ten: 'Đặt tên một điểm tốn 3–5 thao tác',
    moTa: 'Muốn đặt tên điểm vừa dựng phải: về công cụ Chọn, nháy đúp vào điểm, gõ tên trong hộp thoại, rồi chọn lại công cụ đang dùng. Đề Olympic nào cũng có 5–13 điểm cần tên đúng đề.',
    sua: 'Điểm vừa dựng được chọn sẵn: gõ chữ là đặt tên ngay tại chỗ (ô nhỏ cạnh nhãn, Enter để lưu), công cụ vẫn giữ nguyên. F2 hoặc nháy đúp để sửa tên. Thanh trạng thái nhắc "Gõ chữ để đặt tên".',
    re: /^$/,
  },
  {
    id: 'ten-trung', muc: 'Vừa', nhom: 'Thao tác – dựng nhanh', trangThai: 'đã sửa',
    ten: 'Đổi sang tên đã có bị từ chối',
    moTa: 'Tam giác vuông dựng góc vuông ở đỉnh bấm đầu (tên A) nhưng đề cần vuông tại C: phải đổi tên C thành tên tạm, A thành C, rồi tên tạm thành A.',
    sua: 'Đổi sang tên đang thuộc điểm khác thì hai điểm đổi chỗ tên cho nhau (có thông báo).',
    re: /bị chiếm \(điểm khác\)/,
  },
  {
    id: 'chon-cong-cu', muc: 'Vừa', nhom: 'Thao tác – dựng nhanh', trangThai: 'đã sửa',
    ten: 'Chọn công cụ trong menu "Công cụ" cần 3 lần bấm',
    moTa: 'Khoảng 40% thao tác là chọn công cụ; công cụ trong menu nhiều tầng (Tâm nội tiếp, Đường tròn ngoại tiếp, Chân đường cao…) cần bấm biểu tượng → nhóm → công cụ, và bài nào cũng đổi qua lại giữa vài công cụ.',
    sua: 'Dải "công cụ vừa dùng" (6 công cụ) ở cuối thanh dọc: chọn lại bằng một lần bấm.',
    re: /^$/,
  },
  {
    id: 'duong-thang', muc: 'Vừa', nhom: 'Nét đẹp', trangThai: 'đã sửa',
    ten: 'Đường thẳng kéo tới tận mép màn hình',
    moTa: 'Hình nhiều đường thẳng (VMO 2014, nghịch đảo √(bc)) có các nét dài cắt ngang toàn màn hình, khác hẳn hình trong sách.',
    sua: '"Đường thẳng vừa đủ (kiểu sách)" (mặc định, tắt ở menu Hiển thị): đường thẳng/tia chỉ vẽ qua các điểm nằm trên nó, nhô ra một đoạn ngắn; khi đang dùng công cụ dựng, phần kéo dài hiện mờ để vẫn thấy và bấm được chỗ cắt. Xuất TikZ theo cùng kiểu.',
    re: /^$/,
  },
  {
    id: 'kham', muc: 'Vừa', nhom: 'Khám phá – đúng toán', trangThai: 'đã sửa',
    ten: 'Bộ khám phá bỏ sót kết luận của đề',
    moTa: 'Bộ khám phá xê dịch hình tới 30% nên có mẫu phá giả thiết (E chạy ra ngoài đoạn AC, tam giác hết nhọn) → IMO 2018 (DE ∥ FG), VMO 2016 (đường tròn AMN qua D) không được báo. Hình có tiếp điểm (mixtilinear) thì mọi mẫu bị loại vì "gần tiếp xúc" (0 mẫu).',
    sua: 'Khi lấy mẫu giữ đúng cấu hình của hình gốc: tam giác vẽ trên hình giữ chiều và góc nhọn/tù; giao điểm với một đoạn thẳng phải còn trong đoạn; tiếp điểm theo cách dựng không bị coi là suy biến. Bản Python của phòng thí nghiệm sửa giống hệt (test đối chiếu vẫn khớp).',
    re: /^$/,
  },
  {
    id: 'trung-diem', muc: 'Vừa', nhom: 'Thao tác – chọn', trangThai: 'đã sửa',
    ten: 'Hai điểm trùng nhau: luôn chọn điểm dựng trước',
    moTa: 'Bài √(bc): ảnh nghịch đảo của B trùng C′; bấm hay nháy đúp vào đó luôn chọn C′ (dựng trước, nằm dưới), không đặt tên được cho điểm vừa dựng.',
    sua: 'Khi nhiều đối tượng cách chỗ bấm như nhau, đối tượng dựng sau (vẽ đè lên trên) được chọn.',
    re: /Hai điểm trùng toạ độ/,
  },
  {
    id: 'ba-duong', muc: 'Vừa', nhom: 'Đúng toán – cách dựng', trangThai: 'đã sửa',
    ten: 'Bấm vào chỗ ba đường cùng đi qua: chọn cặp bất kỳ',
    moTa: 'IMO 2010: bấm vào chỗ DG cắt EI (đúng nằm trên Γ) thì chương trình có thể dựng X là giao của EI với Γ – đúng về số nhưng hình lưu lại đã "chứa sẵn" kết luận, bộ khám phá chỉ báo "X nằm trên DG".',
    sua: 'Nhiều cặp đường cắt nhau tại cùng chỗ bấm: lấy cặp đường dựng sau cùng (thường đúng ý người dựng).',
    re: /^$/,
  },
  {
    id: 'khung-nhin', muc: 'Vừa', nhom: 'Thao tác – khung nhìn', trangThai: 'đỡ hơn',
    ten: 'Điểm vừa dựng nằm ngoài khung nhìn',
    moTa: 'Ảnh đối xứng, tâm vị tự, giao điểm ở xa (IMO 2014: M, N; Monge: S₁₂, S₁₃; Brocard: Q, R) nằm ngoài màn hình: phải tìm "Thu phóng vừa hình" trong menu mới thấy để bấm, đặt tên.',
    sua: 'Phím Home thu phóng vừa hình; thông báo khi điểm vừa dựng nằm ngoài khung nhìn. Không tự đổi khung nhìn để không làm mất chỗ khi đang giảng.',
    re: /ngoài khung nhìn – phải "Thu phóng/,
  },
  {
    id: 'giao-xa', muc: 'Thấp', nhom: 'Thao tác – chọn', trangThai: 'chưa sửa',
    ten: 'Giao điểm ở rất xa: phải chọn lần lượt hai đường',
    moTa: 'Khi chỗ cắt vẫn ở ngoài màn hình sau khi thu phóng (hai đường gần song song), phải chọn lần lượt hai đường; công cụ Giao điểm tạo cả hai giao điểm (đường thẳng – đường tròn) nên đôi khi phải xoá một điểm thừa.',
    sua: 'Chưa sửa: ít gặp, cách làm hiện tại vẫn dùng được.',
    re: /Chỗ cắt nằm ngoài khung nhìn – phải chọn lần lượt|tạo cả hai giao điểm/,
  },
  {
    id: 'ban-kinh-tu-do', muc: 'Thấp', nhom: 'Kéo thả', trangThai: 'không phải lỗi',
    ten: 'Kéo A ở IMO 2015 làm mất 11 đối tượng',
    moTa: 'Γ dựng bằng tâm A và một điểm bán kính tự do: kéo A xa BC thì Γ không cắt BC nữa, các điểm phụ thuộc biến mất (đúng về toán).',
    sua: 'Không phải lỗi công cụ. Hình trong thư viện dựng chắc hơn: lấy D trên BC rồi vẽ đường tròn tâm A qua D.',
    re: /^$/,
  },
  {
    id: 'kham-doan', muc: 'Thấp', nhom: 'Khám phá', trangThai: 'chưa sửa',
    ten: 'Bộ khám phá chưa tìm đoạn bằng nhau, góc bằng nhau',
    moTa: 'Kết luận dạng MK = ML (IMO 2012), tổng độ dài (IMO 2021), ∠KIL + ∠YPX = 180° (IMO 2024), phân giác (IMO 2023), EF = BC/2 (VMO 2014) không được bộ khám phá báo; vẫn kiểm chứng được bằng số.',
    sua: 'Chưa làm: tính năng lớn, phải sửa đồng thời bản Python của phòng thí nghiệm để hai bên vẫn cho kết quả giống hệt; ghi vào gợi ý tiếp theo.',
    re: /^$/,
  },
];

export function matchIssue(text) {
  return VAN_DE.find((v) => v.re.source !== '^$' && v.re.test(text)) || null;
}
