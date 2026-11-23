import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseForHour } from '../src/scenes/time';

test('historical phases use the focused message hour rather than device time', () => {
  assert.equal(phaseForHour(5), 'morning'); assert.equal(phaseForHour(10), 'morning');
  assert.equal(phaseForHour(11), 'day'); assert.equal(phaseForHour(15), 'day');
  assert.equal(phaseForHour(16), 'sunset'); assert.equal(phaseForHour(18), 'sunset');
  assert.equal(phaseForHour(19), 'night'); assert.equal(phaseForHour(2), 'night');
});
