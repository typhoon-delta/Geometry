// TỰ SINH bởi `node tests/browser/dung-thu/chay.mjs --luu` – không sửa tay.
// Thư viện ví dụ: các hình dựng qua giao diện khi dùng thử (tests/browser/dung-thu), theo nhóm.
import mucLuc from '../../examples/thu-vien/muc-luc.json' with { type: 'json' };
import d0 from '../../examples/thu-vien/imo2008-1.json' with { type: 'json' };
import d1 from '../../examples/thu-vien/imo2010-2.json' with { type: 'json' };
import d2 from '../../examples/thu-vien/imo2012-5.json' with { type: 'json' };
import d3 from '../../examples/thu-vien/imo2013-4.json' with { type: 'json' };
import d4 from '../../examples/thu-vien/imo2014-4.json' with { type: 'json' };
import d5 from '../../examples/thu-vien/imo2015-4.json' with { type: 'json' };
import d6 from '../../examples/thu-vien/imo2017-4.json' with { type: 'json' };
import d7 from '../../examples/thu-vien/imo2018-1.json' with { type: 'json' };
import d8 from '../../examples/thu-vien/imo2019-6.json' with { type: 'json' };
import d9 from '../../examples/thu-vien/imo2021-4.json' with { type: 'json' };
import d10 from '../../examples/thu-vien/imo2023-2.json' with { type: 'json' };
import d11 from '../../examples/thu-vien/imo2024-4.json' with { type: 'json' };
import d12 from '../../examples/thu-vien/imo2025-2.json' with { type: 'json' };
import d13 from '../../examples/thu-vien/vmo2014-4.json' with { type: 'json' };
import d14 from '../../examples/thu-vien/vmo2016-3.json' with { type: 'json' };
import d15 from '../../examples/thu-vien/noi-bang-tiep.json' with { type: 'json' };
import d16 from '../../examples/thu-vien/euler-feuerbach.json' with { type: 'json' };
import d17 from '../../examples/thu-vien/mixtilinear.json' with { type: 'json' };
import d18 from '../../examples/thu-vien/nghich-dao-bc.json' with { type: 'json' };
import d19 from '../../examples/thu-vien/brocard.json' with { type: 'json' };
import d20 from '../../examples/thu-vien/monge.json' with { type: 'json' };
import d21 from '../../examples/thu-vien/dong-dang-xoan.json' with { type: 'json' };
import d22 from '../../examples/thu-vien/hinh-day.json' with { type: 'json' };

const DOCS = [d0, d1, d2, d3, d4, d5, d6, d7, d8, d9, d10, d11, d12, d13, d14, d15, d16, d17, d18, d19, d20, d21, d22];
export const THU_VIEN = mucLuc.map((m, i) => ({ ...m, doc: DOCS[i] }));
