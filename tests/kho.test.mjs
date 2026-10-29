// Kho bài trên GitHub (bản 1.5) – chạy với GitHub giả (tests/fake-github.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GitHubRepo, KhoError } from '../src/kho/github.js';
import { Kho, slugify, newCode, filterIndex, statusOf, sourceLabel, DEFAULT_TOPICS } from '../src/kho/kho.js';
import { createFakeGitHub } from './fake-github.mjs';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const doc = (title, extra = {}) => ({ format: 'hinh-hoc-dong', version: 1, title, steps: [{ id: 's1', type: 'free_point', args: [], params: { x: 0, y: 0 }, name: 'A' }], ...extra });

async function setup(opts) {
  const fake = createFakeGitHub(opts);
  const kho = new Kho(new GitHubRepo({ repo: 'gv/kho-bai', token: 'tok', fetchFn: fake.fetchFn }));
  await kho.open();
  return { fake, kho };
}

test('mã bài: theo nguồn, không dấu, không trùng', () => {
  assert.equal(slugify('VMO 2016 – Bài 4: Đường tròn'), 'vmo-2016-bai-4-duong-tron');
  assert.equal(newCode({ ten: 'x', nguon: { ky: 'VMO', nam: 2016, so: '4' } }, new Set()), 'vmo-2016-bai-4');
  assert.equal(newCode({ ten: 'Bổ đề Đẹp' }, new Set(['bo-de-dep'])), 'bo-de-dep-2');
  assert.equal(sourceLabel({ ky: 'IMO', nam: 2008, so: '1' }), 'IMO – 2008 – Bài 1');
});

test('repo trống: kết nối thì tạo mục lục; token sai báo rõ', async () => {
  const { fake, kho } = await setup();
  assert.deepEqual(fake.files(), ['chu-de.json', 'muc-luc.json']);
  assert.deepEqual(kho.topics, DEFAULT_TOPICS);
  const bad = new Kho(new GitHubRepo({ repo: 'gv/kho-bai', token: 'sai', fetchFn: fake.fetchFn }));
  await assert.rejects(bad.open(), (e) => e instanceof KhoError && e.code === 'auth');
});

test('lưu bài mới (ảnh tách tệp, thu nhỏ, mục lục), mở lại đủ ảnh, một commit mỗi lần lưu', async () => {
  const { fake, kho } = await setup({ empty: false });
  const d = doc('VMO 2016 – Bài 4', { boxes: [{ id: 'b1', role: 'de', text: '![](img:imgA)' }, { id: 'b2', role: 'loigiai', text: 'Ta có $\\angle A = 90^\\circ$.' }], imageData: { imgA: PNG } });
  const n0 = fake.state.calls.filter((c) => c.startsWith('PATCH')).length;
  const r = await kho.saveDoc({ meta: { ten: 'VMO 2016 – Bài 4', nguon: { ky: 'VMO', nam: 2016, so: '4' }, chuDe: ['Phép nghịch đảo'], doKho: 4 }, doc: d, thumb: PNG });
  assert.equal(r.ma, 'vmo-2016-bai-4');
  assert.equal(fake.state.calls.filter((c) => c.startsWith('PATCH')).length - n0, 1, 'một lần lưu = một commit');
  assert.deepEqual(fake.files(), ['README.md', 'bai/vmo-2016-bai-4/anh/imgA.png', 'bai/vmo-2016-bai-4/bai.json', 'bai/vmo-2016-bai-4/thu-nho.jpg', 'muc-luc.json']);
  const bai = JSON.parse(fake.readText('bai/vmo-2016-bai-4/bai.json'));
  assert.equal(bai.hinh[0].imageData, undefined, 'dữ liệu ảnh không nằm trong bai.json');
  const ix = JSON.parse(fake.readText('muc-luc.json'));
  assert.equal(ix.bai['vmo-2016-bai-4'].trangThai, 'loigiai');
  assert.equal(ix.bai['vmo-2016-bai-4'].doKho, 4);
  const back = await kho.loadBai('vmo-2016-bai-4');
  assert.equal(back.docs[0].imageData.imgA, PNG);
  assert.equal(back.sha, r.sha, 'sha tính ở máy khớp sha trên GitHub');
  assert.equal(await kho.thumb('vmo-2016-bai-4'), PNG);
});

test('cập nhật: không tải lại ảnh đã có, xoá ảnh không dùng; sửa ở máy khác → báo xung đột', async () => {
  const { fake, kho } = await setup();
  const d = doc('Bài A', { images: [{ id: 'im1', x: 0, y: 0, w: 1, h: 1 }], imageData: { im1: PNG } });
  const r = await kho.saveDoc({ meta: { ten: 'Bài A' }, doc: d });
  const blobs0 = fake.state.calls.filter((c) => c.endsWith('/git/blobs')).length;
  const r2 = await kho.saveDoc({ ma: r.ma, hinh: 0, doc: { ...d, title: 'Bài A (sửa)' }, expectSha: r.sha });
  assert.equal(fake.state.calls.filter((c) => c.endsWith('/git/blobs')).length, blobs0, 'ảnh đã có không gửi lại');
  await kho.saveDoc({ ma: r.ma, hinh: 0, doc: { ...d, images: [], imageData: {} }, expectSha: r2.sha });
  assert.ok(!fake.files().some((f) => f.includes('/anh/')), 'ảnh không còn dùng bị xoá');
  // máy khác sửa bài
  const cur = JSON.parse(fake.readText(`bai/${r.ma}/bai.json`));
  cur.meta.ten = 'Sửa ở máy khác';
  fake.commitExternal({ [`bai/${r.ma}/bai.json`]: JSON.stringify(cur) });
  await assert.rejects(kho.saveDoc({ ma: r.ma, hinh: 0, doc: d, expectSha: r2.sha }), (e) => e.code === 'conflict' && e.current.meta.ten === 'Sửa ở máy khác');
  await kho.saveDoc({ ma: r.ma, hinh: 0, doc: d, expectSha: r2.sha, force: true });
});

test('hai máy lưu cùng lúc: máy sau đọc lại mục lục rồi lưu tiếp, không mất bài của máy trước', async () => {
  const { fake, kho } = await setup();
  const kho2 = new Kho(new GitHubRepo({ repo: 'gv/kho-bai', token: 'tok', fetchFn: fake.fetchFn }));
  await kho2.open();
  // chèn một commit "máy khác" đúng lúc kho chuẩn bị ghi
  const orig = kho.gh.commit.bind(kho.gh);
  let once = true;
  kho.gh.commit = async (...a) => { if (once) { once = false; await kho2.saveDoc({ meta: { ten: 'Bài máy 2' }, doc: doc('Bài máy 2') }); } return orig(...a); };
  await kho.saveDoc({ meta: { ten: 'Bài máy 1' }, doc: doc('Bài máy 1') });
  const ix = JSON.parse(fake.readText('muc-luc.json'));
  assert.deepEqual(Object.values(ix.bai).map((e) => e.ten).sort(), ['Bài máy 1', 'Bài máy 2']);
});

test('nhiều hình một bài, nhập hàng loạt một commit, buổi dạy, xoá bài gỡ khỏi buổi, lịch sử', async () => {
  const { fake, kho } = await setup();
  const r = await kho.saveDoc({ meta: { ten: 'Bài nhiều ý' }, doc: doc('ý a') });
  const r2 = await kho.saveDoc({ ma: r.ma, doc: doc('ý b'), expectSha: r.sha });
  assert.equal(r2.hinh, 1);
  assert.equal((await kho.loadBai(r.ma)).docs.length, 2);
  const n0 = fake.state.calls.filter((c) => c.startsWith('PATCH')).length;
  const codes = await kho.importMany([{ meta: { ten: 'N1', nguon: { ky: 'IMO', nam: 2008, so: '1' } }, docs: [doc('N1')] }, { meta: { ten: 'N2', nguon: { tuRa: true } }, docs: [doc('N2', { imageData: {} })] }]);
  assert.equal(fake.state.calls.filter((c) => c.startsWith('PATCH')).length - n0, 1, 'nhập hàng loạt = một commit');
  const bm = await kho.saveBuoi({ ten: 'Tứ giác nội tiếp', ngay: '2026-10-29', lop: '11 Toán', bai: [r.ma, ...codes] });
  assert.ok(fake.readText(`buoi/${bm}.json`).includes('11 Toán'));
  assert.deepEqual(kho.taughtIn(codes[0]).map((b) => b.ma), [bm]);
  await kho.deleteBai(codes[0]);
  assert.deepEqual(kho.index.buoi[bm].bai, [r.ma, codes[1]]);
  assert.ok(!fake.files().some((f) => f.startsWith(`bai/${codes[0]}/`)));
  const h = await kho.history(r.ma);
  assert.equal(h.length, 2);
  const old = await kho.loadBai(r.ma, h[1].sha);
  assert.equal(old.docs.length, 1, 'mở được phiên bản cũ');
  await kho.saveTopics(['A', 'B', 'A', ' ']);
  assert.deepEqual(JSON.parse(fake.readText('chu-de.json')).chuDe, ['A', 'B']);
});

test('tìm kiếm không dấu, lọc theo chủ đề/nguồn/độ khó/đã dạy, sắp xếp', () => {
  const index = {
    bai: {
      a: { ten: 'VMO 2016 – Bài 4', nguon: { ky: 'VMO', nam: 2016, so: '4' }, chuDe: ['Phép nghịch đảo'], doKho: 4, trangThai: 'loigiai', tom: 'đường tròn Feuerbach', capNhat: '2026-10-02' },
      b: { ten: 'Bổ đề tâm nội tiếp', nguon: { tuRa: true }, chuDe: ['Tam giác và các điểm, đường đặc biệt'], doKho: 2, trangThai: 'hinh', tom: '', capNhat: '2026-10-03' },
      c: { ten: 'IMO 2008 – Bài 1', nguon: { ky: 'IMO', nam: 2008, so: '1' }, doKho: 3, trangThai: 'de', tom: '', capNhat: '2026-10-01' },
    },
    buoi: { x: { ten: 'B', bai: ['c'] } },
  };
  assert.deepEqual(filterIndex(index, 'feuerbach').map((r) => r[0]), ['a']);
  assert.deepEqual(filterIndex(index, 'bo de noi tiep').map((r) => r[0]), ['b']);
  assert.deepEqual(filterIndex(index, '', { ky: new Set(['Tự ra', 'IMO']) }, 'ten').map((r) => r[0]), ['b', 'c']);
  assert.deepEqual(filterIndex(index, '', { doKho: new Set([3, 4]) }, 'doKho').map((r) => r[0]), ['c', 'a']);
  assert.deepEqual(filterIndex(index, '', { daDay: true }).map((r) => r[0]), ['c']);
  assert.deepEqual(filterIndex(index, '', {}, 'moi').map((r) => r[0]), ['b', 'a', 'c']);
  assert.equal(statusOf([{ steps: [], boxes: [{ role: 'de', text: '![](img:x)' }] }]), 'de');
});
