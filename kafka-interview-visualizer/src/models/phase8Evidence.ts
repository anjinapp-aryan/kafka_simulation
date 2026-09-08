// PROVEN evidence from the actual Phase 8 lab session against the live
// broker. Static, never derived from this UI's simulation.

export const PHASE8_PROVEN: string[] = [
  'Fresh 3000-record backlog, slow consumer (max.poll.records=50, 5ms/record): lag sampled at t≈6s showed p0 LAG=592, p2 LAG=858, p1 LAG=0; fully drained to 0/0/0 by t≈14s',
  'Sustained producer (500 rec/s) against a ~100 rec/s consumer: TOTAL LAG measured 2800 -> 5183 -> 7350 while the producer ran, then fell to 4350 once the producer stopped',
  'max.poll.records=1 vs =500, identical zero-cost processing: =1 gave 5495 polls (686.9 rec/s); =500 gave 18 polls (1065.3 rec/s) — max.poll.records controls records-per-poll(), not throughput by itself',
  'max.poll.records=200, 10ms/record processing: measured gapSinceLastPoll = 2006ms, 2005ms, 2007ms — matches 200 x 10ms exactly; throughput collapsed to 77.7 rec/s',
  'Producer throughput measured via kafka-producer-perf-test.sh: 15,544 records/sec on this single-broker lab (a laptop-scale figure, not a benchmark claim)',
];

export const PHASE8_LIMITATION_NOTE =
  'These throughput/lag figures are PROVEN for this specific single-broker lab run on one machine, alongside other running containers — directionally valid for teaching the mechanics, not benchmark-grade numbers for capacity planning.';
