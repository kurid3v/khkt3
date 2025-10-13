'use client';
import React, { useState, useEffect } from 'react';

interface TimerProps {
  expiryTimestamp: number;
  onExpire: () => void;
}

const Timer: React.FC<TimerProps> = ({ expiryTimestamp, onExpire }) => {
  const calculateTimeLeft = () => {
    const difference = expiryTimestamp - Date.now();
    let timeLeft = {
      hours: 0,
      minutes: 0,
      seconds: 0,
    };

    if (difference > 0) {
      timeLeft = {
        hours: Math.floor(difference / (1000 * 60 * 60)),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const isEndingSoon = timeLeft.hours === 0 && timeLeft.minutes < 5;

  useEffect(() => {
    const timer = setTimeout(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.hours === 0 && newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        onExpire();
      }
    }, 1000);

    return () => clearTimeout(timer);
  });

  const format = (num: number) => String(num).padStart(2, '0');

  return (
    <div className={`text-2xl font-bold ${isEndingSoon ? 'text-red-500' : 'text-slate-900'}`}>
      <span>{format(timeLeft.hours)}</span>:
      <span>{format(timeLeft.minutes)}</span>:
      <span>{format(timeLeft.seconds)}</span>
    </div>
  );
};

export default Timer;
