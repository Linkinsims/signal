import { detectFVG } from '../src/detectors/fvg';

test('detects simple bullish FVG', () => {
  const candles = [
    { t:0,o:1.1,h:1.101,l:1.099,c:1.1005 },
    { t:1,o:1.1005,h:1.1007,l:1.0998,c:1.1 },
    { t:2,o:1.1015,h:1.102,l:1.101,c:1.1018 },
  ];
  expect(detectFVG(candles as any, '1H').length).toBeGreaterThan(0);
});

test('no false positive for noisy candles', () => {
  const candles = [
    { t:0,o:1.1,h:1.1005,l:1.0995,c:1.1002 },
    { t:1,o:1.1002,h:1.1008,l:1.1,c:1.1006 },
    { t:2,o:1.1006,h:1.101,l:1.1004,c:1.1008 },
  ];
  expect(detectFVG(candles as any, '1H')).toHaveLength(0);
});
