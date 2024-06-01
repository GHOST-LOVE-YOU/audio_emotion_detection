const emotions = ['Angry', 'Disgusted', 'Fearful', 'Happy', 'Neutral', 'Sad', 'Surprised'];

type RectangleChartProps = {
    timeStamp: number[][];
    currentTime: number;
    index: number;
    };
export default function RectangleChart({ timeStamp, currentTime, index }: RectangleChartProps) {
    const getEmotionProbs = (time: number) => {
        const index = Math.floor(time * 10);
        return index < timeStamp.length ? timeStamp[index] : Array(emotions.length).fill(0);
      };
  return (
    <div className="bg-gray-200 w-36 h-8 rounded relative overflow-hidden">
                <div
                  className="bg-red-500 h-full absolute top-0 left-0"
                  style={{ width: `${getEmotionProbs(currentTime)[index] * 100}%` }}
                />
              </div>
  )
}
