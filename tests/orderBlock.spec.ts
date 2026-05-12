import { detectOrderBlocks } from '../src/detectors/orderBlock';

test('detects bullish order block', () => {
  const candles = [
    { t:0,o:1.1,h:1.1002,l:1.0998,c:1.1 },
    { t:1,o:1.1,h:1.1015,l:1.1,c:1.1015 },
    { t:2,o:1.1015,h:1.102,l:1.101,c:1.1018 },
    { t:3,o:1.1018,h:1.1025,l:1.1015,c:1.1022 },
  ];
  expect(detectOrderBlocks(candles as any, '4H').length).toBeGreaterThan(0);
});
