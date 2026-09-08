import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface PartitionLagState {
  id: string;
  logEnd: number;
  committed: number;
}

function initialState(): PartitionLagState[] {
  return [
    { id: 'P0', logEnd: 0, committed: 0 },
    { id: 'P1', logEnd: 0, committed: 0 },
    { id: 'P2', logEnd: 0, committed: 0 },
  ];
}

export function LagSimulatorPanel() {
  const [producerRate, setProducerRate] = useState(15);
  const [consumerRate, setConsumerRate] = useState(9);
  const [hotPartition, setHotPartition] = useState(false);
  const [partitions, setPartitions] = useState<PartitionLagState[]>(initialState());
  const [ticks, setTicks] = useState(0);

  function tick() {
    setPartitions((prev) => {
      // Producer share: hot mode sends 3x to P0, evenly otherwise.
      const shares = hotPartition ? [0.6, 0.2, 0.2] : [1 / 3, 1 / 3, 1 / 3];
      const consumerShare = consumerRate / 3;
      return prev.map((p, i) => {
        const logEnd = p.logEnd + Math.round(producerRate * shares[i]);
        const committed = Math.min(logEnd, p.committed + Math.round(consumerShare));
        return { ...p, logEnd, committed };
      });
    });
    setTicks((t) => t + 1);
  }

  function reset() {
    setPartitions(initialState());
    setTicks(0);
  }

  const chartData = partitions.map((p) => ({ partition: p.id, lag: p.logEnd - p.committed }));
  const totalLag = chartData.reduce((sum, p) => sum + p.lag, 0);

  return (
    <div className="lag-simulator-panel">
      <span className="evidence-tag evidence-tag-simulation">
        SIMULATION — a deterministic tick-based model, not a real-time measurement
      </span>

      <div className="producer-config-grid">
        <label>
          Producer rate (rec/tick)
          <input
            type="number"
            min={0}
            value={producerRate}
            onChange={(e) => setProducerRate(Number(e.target.value))}
          />
        </label>
        <label>
          Consumer rate (rec/tick)
          <input
            type="number"
            min={0}
            value={consumerRate}
            onChange={(e) => setConsumerRate(Number(e.target.value))}
          />
        </label>
        <label>
          <input type="checkbox" checked={hotPartition} onChange={(e) => setHotPartition(e.target.checked)} />
          Hot partition (P0 gets 60% of traffic)
        </label>
      </div>

      <div className="lag-sim-controls">
        <button onClick={tick}>Tick (+1s)</button>
        <button onClick={reset}>Reset</button>
        <span className="placeholder">tick {ticks}</span>
      </div>

      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="partition" stroke="var(--text-muted)" fontSize={12} />
            <YAxis stroke="var(--text-muted)" fontSize={12} />
            <Tooltip />
            <Bar dataKey="lag" fill="var(--accent)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="assignment-list">
        {partitions.map((p) => (
          <li key={p.id}>
            {p.id}: LOG-END {p.logEnd} | COMMITTED {p.committed} | LAG {p.logEnd - p.committed}
          </li>
        ))}
      </ul>
      <p className="total-lag">TOTAL LAG = {totalLag}</p>

      <p className="placeholder">
        {producerRate > consumerRate
          ? 'Producer rate > consumer rate -> lag will keep climbing.'
          : producerRate < consumerRate
            ? 'Consumer rate > producer rate -> lag will drain toward 0.'
            : 'Rates equal -> lag holds steady.'}
      </p>
    </div>
  );
}
