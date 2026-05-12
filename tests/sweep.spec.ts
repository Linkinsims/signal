import { detectSweeps } from '../src/detectors/sweep';

test('detects valid sweep', () => {
  const candles = [
    { t:0,o:1.0995,h:1.0997,l:1.0992,c:1.0996 },
    { t:1,o:1.0996,h:1.1006,l:1.0994,c:1.0998 },
    { t:2,o:1.0999,h:1.1002,l:1.0995,c:1.0997 },
  ];
  const result = detectSweeps(candles as any, [1.1], '15m');
  expect(result.length).toBeGreaterThan(0);
});
