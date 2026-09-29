// Run after npm run build: node --test test/notification-channels.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dispatchNotificationChannels } = require('../dist/src/crm/dispatch-notification-channels');

for (const [pushEnabled, whatsappEnabled] of [[true, true], [true, false], [false, true], [false, false]]) {
  test(`checkboxes push=${pushEnabled}, whatsapp=${whatsappEnabled}`, async () => {
    const calls = [];
    const channels = {
      push: pushEnabled ? async id => calls.push(`push:${id}`) : undefined,
      whatsapp: whatsappEnabled ? async id => calls.push(`whatsapp:${id}`) : undefined,
    };
    const counts = await dispatchNotificationChannels(['a', 'b'], channels, assert.fail);
    assert.equal(counts.push, pushEnabled ? 2 : 0);
    assert.equal(counts.whatsapp, whatsappEnabled ? 2 : 0);
    assert.equal(new Set(calls).size, calls.length);
  });
}

test('WhatsApp reaches every recipient while FCM is still pending', async () => {
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const received = [];
  const work = dispatchNotificationChannels(['a', 'b'], {
    push: async () => blocked,
    whatsapp: async id => received.push(id),
  }, assert.fail);
  try {
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(received, ['a', 'b']);
  } finally {
    release();
    await work;
  }
});

test('failure in either channel does not suppress other recipients or channel', async () => {
  const failures = [];
  const counts = await dispatchNotificationChannels(['a', 'b'], {
    push: async id => { if (id === 'a') throw new Error('FCM unavailable'); },
    whatsapp: async id => { if (id === 'b') throw new Error('WhatsApp unavailable'); },
  }, (channel, id) => failures.push(`${channel}:${id}`));
  assert.deepEqual(counts, { push: 1, whatsapp: 1 });
  assert.deepEqual(failures.sort(), ['push:a', 'whatsapp:b']);
});
