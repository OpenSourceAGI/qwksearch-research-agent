
import { checkSmoke } from './smoke.mjs';
import { checkOverlay } from './overlay.mjs';
import { checkOverlayAI } from './overlay-ai.mjs';
import { checkPreviews } from './previews.mjs';

async function setup(context) {
  const { pin } = await checkSmoke(context);
  await context.triggerSwitcher(pin);
  const read = code => context.app.evaluate(
    `chrome.scripting.executeScript({target:{tabId:${pin.id}},func:()=>{const root=globalThis.__neoSurface;${code}}}).then(r=>r[0].result)`,
  );
  const wait = async predicate => {
    for (let i = 0; i < 100; i++) {
      if (await predicate()) return;
      await context.delay(100);
    }
    throw Error('Overlay did not settle');
  };
  await wait(() => read('return !!root?.querySelector(".tab-more-button")'));
  const click = label => read(`root.querySelector('[aria-label=${JSON.stringify(label)}]').click()`);
  return { ...context, pin, read, wait, click };
}

export async function checkOverlayFixture(context) {
  await checkOverlay(await setup(context));
}

export async function checkOverlayAIFixture(context) {
  await checkOverlayAI(await setup(context));
}

export async function checkPreviewFixture(context) {
  const fixture = await setup(context);
  await fixture.read('globalThis.__neoCloseOverlay()');
  await fixture.delay(1200);
  await fixture.rpc('capture');
  await checkPreviews(fixture);
}
