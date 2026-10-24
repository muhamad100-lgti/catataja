import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNumberWords, parseVoiceInput } from './voiceParser';

test('parseNumberWords parses Indonesian currency expressions', () => {
  assert.equal(parseNumberWords('beli kopi 25 ribu'), 25000);
  assert.equal(parseNumberWords('gaji masuk 10 juta'), 10000000);
  assert.equal(parseNumberWords('proyek 1,5 juta'), 1500000);
  assert.equal(parseNumberWords('nasi goreng 18.000 tunai'), 18000);
  assert.equal(parseNumberWords('bensin 50k'), 50000);
});

test('parseVoiceInput identifies expense and categories accurately', () => {
  const result1 = parseVoiceInput('Beli kopi kenangan 25 ribu pakai QRIS');
  assert.equal(result1.type, 'expense');
  assert.equal(result1.amount, 25000);
  assert.equal(result1.category, 'kopi_jajan');
  assert.equal(result1.paymentMethod, 'qris');
  assert.equal(result1.classification, 'wants');

  const result2 = parseVoiceInput('Makan siang bakso 35 ribu tunai');
  assert.equal(result2.type, 'expense');
  assert.equal(result2.amount, 35000);
  assert.equal(result2.category, 'makanan');
  assert.equal(result2.paymentMethod, 'tunai');
  assert.equal(result2.classification, 'needs');
});

test('parseVoiceInput identifies income correctly', () => {
  const result = parseVoiceInput('Gaji bulanan masuk 8 juta transfer');
  assert.equal(result.type, 'income');
  assert.equal(result.amount, 8000000);
  assert.equal(result.category, 'gaji');
  assert.equal(result.paymentMethod, 'transfer');
  assert.equal(result.classification, 'savings');
});
