import React, { useCallback } from 'react';

type TimeProps = {
  time: string | null;
};

/**
 * This method expects a timestamp of the "YYYYMMDDHHMMSS.0Z" format for e.g. "20220310151845.0Z"
 * and returns a user friendly, readable format that's also adjusted for the user device's timezone.
 */
const convertTimeToReadable = (time: string): string => {
  const year = time.substring(0, 4);
  const month = time.substring(4, 6);
  const day = time.substring(6, 8);
  const hour = time.substring(8, 10);
  const minute = time.substring(10, 12);
  const second = time.substring(12, 14);
  const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  const dateObj = new Date(dateStr);
  return dateObj.toString();
};

const Time: React.FC<TimeProps> = ({ time }): JSX.Element => {
  const convertTime = useCallback((time: string) => convertTimeToReadable(time), [time]);
  return <span>{time ? convertTime(time) : 'Never'}</span>;
};

export default Time;
