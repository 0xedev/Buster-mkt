import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface MarketTimeProps {
  endTime: bigint;
  className?: string;
}

const calculateTimeLeft = (endTime: bigint) => {
  const difference = Number(endTime) * 1000 - Date.now();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
};

export default function MarketTime({ endTime, className }: MarketTimeProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(endTime));
  const isEnded = new Date(Number(endTime) * 1000) < new Date();

  useEffect(() => {
    if (isEnded) return;

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(endTime));
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, isEnded]);

  if (isEnded) {
    return (
      <div
        className={cn(
          "text-xs px-2 py-1 rounded-md bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300 flex items-center shadow-sm w-fit",
          className
        )}
      >
        <span className="h-1.5 w-1.5 bg-red-500 animate-pulse rounded-full mr-1.5"></span>
        <span className="font-medium">Ended</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "text-xs px-2 py-1 rounded-md bg-gradient-to-r from-green-50 to-green-100 border border-green-200 flex items-center shadow-sm w-fit",
        className
      )}
    >
      <span className="text-green-500 font-medium mr-1.5">⏱</span>
      <span className="text-green-600 font-medium mr-1.5">Ends:</span>
      {timeLeft.days > 0 && <TimeUnit value={timeLeft.days} unit="d" />}
      <TimeUnit value={timeLeft.hours} unit="h" />
      <TimeUnit value={timeLeft.minutes} unit="m" />
      <TimeUnit value={timeLeft.seconds} unit="s" isLast={true} />
    </div>
  );
}

const TimeUnit = ({
  value,
  unit,
  isLast = false,
}: {
  value: number;
  unit: string;
  isLast?: boolean;
}) => (
  <span className={cn("flex items-center", !isLast && "mr-1")}>
    <span className="font-bold text-grey-800">
      {String(value).padStart(2, "0")}
    </span>
    <span className="text-grey-500">{unit}</span>
  </span>
);
