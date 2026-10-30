export async function run({ page, ok, shot }) {
  const S = (id, type, args, params, name) => ({ id, type, args, ...(params ? { params } : {}), ...(name ? { name } : {}) });
  await page.evaluate((st) => { __app.loadDoc({ format: 'hinh-hoc-dong', version: 1, steps: st }); __app.view.setBoundingBox([-6, 6, 7, -3]); __app.setTool('move'); }, [
    S('A', 'free_point', [], { x: 0.3, y: 4 }, 'A'), S('B', 'free_point', [], { x: -3, y: 0 }, 'B'), S('C', 'free_point', [], { x: 4, y: 0 }, 'C'),
    S('ab', 'segment', ['A', 'B']), S('bc', 'segment', ['B', 'C']), S('ca', 'segment', ['C', 'A']),
    S('O', 'circumcenter', ['A', 'B', 'C'], null, 'O'), S('H', 'orthocenter', ['A', 'B', 'C'], null, 'H'), S('I', 'incenter', ['A', 'B', 'C'], null, 'I')]);
  await page.evaluate(() => { __app.selection = new Set(['O', 'I', 'H']); __app.refresh(); });
  console.log(await page.textContent('#props .check-row'));
  await page.click('#props [data-claim="0"]');
  console.log(await page.textContent('.check-win'));
  await shot('v18-check');
  await page.click('.check-win [data-sp]');
  console.log(await page.evaluate(() => JSON.stringify(__app.doc.steps[0].params)));
  await page.evaluate(() => { __app.selection = new Set(['A']); __app.refresh(); });
  console.log(await page.textContent('#props .special-row'));
  await shot('v18-special');
}
