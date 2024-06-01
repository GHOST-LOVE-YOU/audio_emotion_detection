type LineChartProps = {
  timeStamp: number[][];
  currentTime: number;
  index: number;
};
export default function LineChart({ timeStamp, currentTime, index }: LineChartProps) {
  const getFutureEmotionData = (timeStamp: number[][], time: number, emotionIndex: number) => {
    const startIndex = Math.floor(time * 10);
    const endIndex = Math.min(startIndex + 300, timeStamp.length); // 30 seconds * 10 intervals per second
    return timeStamp.slice(startIndex, endIndex).map(row => row[emotionIndex]);
  };
  return (
    <svg className="h-8 w-full bg-slate-400" viewBox="0 0 1300 100">
                {(() => {
                  const data = getFutureEmotionData(timeStamp, currentTime, index);
                  const pathD = data.map((val, i) => `${i === 0 ? 'M' : 'L'} ${i / data.length * 1300},${100 - val * 100}`).join(' ');
                  const areaD = `${pathD} V100 H0 Z`;
                  return (
                    <>
                      <path d={areaD} fill="rgba(128, 0, 128, 0.3)" />
                      <path d={pathD} fill="none" stroke="purple" strokeWidth="2" />
                    </>
                  );
                })()}
              </svg>
  )
}
