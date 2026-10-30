// Thước đo bộ Khám phá (bản 1.9): với mỗi hình mẫu trong thư viện (src/core/thu-vien.js) – kết luận của đề (goal) và
// các bổ đề then chốt của lời giải quen biết (lemmas). Viết bằng lệnh tiếng Việt (src/core/cmd.js):
//   setup : lệnh dựng thêm cần có để phát biểu (vd trung điểm chưa vẽ) – KHÔNG cho bộ khám phá thấy khi đo "tìm ra";
//   goal  : lệnh "kiểm tra …" (một hoặc nhiều);
//   lemmas: [{aux: [lệnh dựng điểm/đường phụ], claim: 'kiểm tra …', note}] – bổ đề có thể cần điểm phụ.
// Chỉ ghi bổ đề khi chắc chắn (lời giải chính thức / quen biết); bài khó để trống.
export const DE_BAI = [
  { id: 'imo2008-1', goal: ['kiểm tra A_1, A_2, B_1, B_2 đồng viên', 'kiểm tra A_1, A_2, B_1, C_1 đồng viên'],
    lemmas: [{ claim: 'kiểm tra B_1, B_2, C_1, C_2 đồng viên', note: 'AH là trục đẳng phương của (M_b) và (M_c)' },
      { aux: ['Q = tâm ngoại tiếp ABC'], claim: 'kiểm tra QA_1 = QA_2', note: 'tâm chung là tâm ngoại tiếp ABC' }] },
  { id: 'imo2010-2', goal: ['kiểm tra X thuộc ω1'], lemmas: [] },
  { id: 'imo2012-5', goal: ['kiểm tra MK = ML'], lemmas: [] },
  { id: 'imo2013-4', goal: ['kiểm tra X, Y, H thẳng hàng'],
    lemmas: [{ aux: ['Z = ω1 cắt ω2 khác W'], claim: 'kiểm tra A, Z, W thẳng hàng', note: 'Z điểm Miquel, AZ là trục đẳng phương' },
      { aux: ['Z = ω1 cắt ω2 khác W'], claim: 'kiểm tra X, Z, Y thẳng hàng', note: '∠WZX = ∠WZY = 90°' }] },
  { id: 'imo2014-4', goal: ['kiểm tra X thuộc ω1'],
    lemmas: [{ claim: 'kiểm tra AP = AQ', note: 'tam giác APQ cân' }] },
  { id: 'imo2015-4', goal: ['kiểm tra X thuộc d6'],
    lemmas: [{ claim: 'kiểm tra góc AFK = góc AGL', note: 'FK, GL đối xứng qua AO' }] },
  { id: 'imo2017-4', goal: ['kiểm tra d3 tiếp xúc ω2'], lemmas: [] },
  { id: 'imo2018-1', goal: ['kiểm tra d6 song song d7'], lemmas: [] },
  { id: 'imo2019-6', goal: ['kiểm tra d7, d8, d10 đồng quy'], lemmas: [] },
  { id: 'imo2021-4', goal: [], lemmas: [] },
  { id: 'imo2023-2', goal: ['kiểm tra góc BAX = góc XAC'], lemmas: [] },
  { id: 'imo2024-4', goal: ['kiểm tra góc KIL + góc YPX = 180'], lemmas: [] },
  { id: 'imo2025-2', goal: ['kiểm tra d3 tiếp xúc ω3'], lemmas: [] },
  { id: 'vmo2014-4', setup: ['M_a = trung điểm BC'], goal: ['kiểm tra EF = BM_a', 'kiểm tra P, K, J thẳng hàng'], lemmas: [] },
  { id: 'vmo2016-3', goal: ['kiểm tra D thuộc ω1'], lemmas: [] },
  { id: 'noi-bang-tiep', goal: ['kiểm tra I thuộc ω2', 'kiểm tra I_A thuộc ω2'],
    lemmas: [{ claim: 'kiểm tra SB = SI', note: '∠SBI = ∠SIB' }] },
  { id: 'euler-feuerbach', goal: ['kiểm tra ω1 tiếp xúc ω2'], lemmas: [] },
  { id: 'mixtilinear', goal: ['kiểm tra K, I, L thẳng hàng', 'kiểm tra T, I, S thẳng hàng'], lemmas: [] },
  { id: 'nghich-dao-bc', goal: ['kiểm tra d8 trùng d2', 'kiểm tra ω6 trùng ω7'], lemmas: [] },
  { id: 'brocard', goal: ['kiểm tra P thuộc d10', 'kiểm tra OQ vuông góc PR'], lemmas: [] },
  { id: 'monge', goal: ['kiểm tra S_{12}, S_{23}, S_{13} thẳng hàng'], lemmas: [] },
  { id: 'dong-dang-xoan', goal: ["kiểm tra D trùng D'"], lemmas: [{ claim: 'kiểm tra góc ASB = góc CSD', note: 'tam giác SAB đồng dạng SCD' }] },
  { id: 'hinh-day', goal: ['kiểm tra M_A thuộc ω1'], lemmas: [] },
];
